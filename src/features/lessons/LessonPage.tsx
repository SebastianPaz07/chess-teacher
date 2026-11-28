import { useSettingsStore } from '@/store/settingsStore';
import { Icon } from '@/components/ui/Icon';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, EmptyState, Hearts, Modal, ProgressBar } from '@/components/ui';
import { getLesson, getModule, modules, resourcesByTags } from '@/content/registry';
import type { Step } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { TeacherBubble, type TeacherMood } from '@/features/gamification/components/TeacherBubble';
import { teacherSays } from '@/features/gamification/teacherMessages';
import { ResourceList } from '@/features/library/components/ResourceViewer';
import { comboMultiplier } from '@/services/game/xp';
import { isLessonUnlocked, moduleCompletion } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { LessonComplete, type LessonSummary } from './components/LessonComplete';
import { LessonActionSlot } from './steps/LessonAction';
import { isGraded, stepRegistry, type StepViewProps } from './steps/stepRegistry';
import styles from './LessonPage.module.css';

/** Las lecciones largas dan más margen de error. */
const heartsFor = (graded: number) => Math.min(5, Math.max(3, Math.ceil(graded / 2) + 1));

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = getLesson(lessonId);
  const mod = lesson ? getModule(lesson.moduleId) : undefined;
  const progress = useProgressStore();
  const [attempt, setAttempt] = useState(0);

  if (!lesson || !mod) return <EmptyState icon="question" title="Lección no encontrada" action={<Button to="/mapa/capitulos">Ver las lecciones</Button>} />;
  if (!isLessonUnlocked(lesson, mod, modules, progress)) {
    return <EmptyState icon="lock" title="Lección bloqueada" description="Completa las lecciones anteriores para desbloquearla." action={<Button to="/mapa/capitulos">Ver las lecciones</Button>} />;
  }
  return <LessonRunner key={`${lesson.id}-${attempt}`} lessonId={lesson.id} onRetry={() => setAttempt((a) => a + 1)} />;
}

function LessonRunner({ lessonId, onRetry }: { lessonId: string; onRetry: () => void }) {
  const lesson = getLesson(lessonId)!;
  const mod = getModule(lesson.moduleId)!;
  const navigate = useNavigate();
  const dispatch = useGameStore((s) => s.dispatch);
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const addCard = useReviewStore((s) => s.addCard);
  const daily = useCompleteDailyTask();

  const saveDraft = useProgressStore((s) => s.saveLessonDraft);
  const [draft] = useState(() => useProgressStore.getState().lessonDrafts[lessonId]);
  const startAt = draft && draft.index < lesson.steps.length ? draft.index : 0;
  const plan = useGameStore((s) => s.plan);

  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(startAt);
  const maxHearts = heartsFor(lesson.steps.filter(isGraded).length);
  const [hearts, setHearts] = useState(maxHearts);
  const [mistakes, setMistakes] = useState(startAt ? (draft?.mistakes ?? 0) : 0);
  const [combo, setCombo] = useState(0);
  const [bonusXp, setBonusXp] = useState(0);
  const [teacher, setTeacher] = useState<{ msg: string; mood: TeacherMood }>({ msg: teacherSays('lessonStart'), mood: 'neutral' });
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const finished = useRef(false);

  const graded = useMemo(() => lesson.steps.filter(isGraded).length, [lesson]);
  const step = lesson.steps[index];
  // Desde el plan del día, una lección larga se puede dejar al cumplir los minutos de hoy
  const block = daily.fromDaily ? plan?.tasks.find((t) => t.kind === 'lesson' && t.lessonId === lessonId) : undefined;
  const blockSteps = block?.kind === 'lesson' && block.minutes < block.totalMinutes ? Math.max(1, Math.ceil((lesson.steps.length * block.minutes) / block.totalMinutes)) : null;
  const blockDone = blockSteps !== null && index - startAt >= blockSteps;
  const related = useMemo(() => resourcesByTags([...lesson.tags, ...lesson.sources.flatMap((s) => s.resourceTags)], 5), [lesson]);

  const onMistake = () => {
    setMistakes((m) => m + 1);
    setHearts((h) => Math.max(0, h - 1));
    // Sin vidas no queda punto de retorno: la próxima vez se empieza de nuevo
    if (hearts <= 1) saveDraft(lesson.id, null);
    setCombo(0);
    setTeacher({ msg: teacherSays('wrong'), mood: 'oops' });
  };

  const onCorrect = () => {
    const next = combo + 1;
    setCombo(next);
    const mult = comboMultiplier(next);
    if (mult > 1) setBonusXp((b) => b + 5 * mult);
    setTeacher({ msg: teacherSays(mult > 1 ? 'combo' : 'correct'), mood: mult > 1 ? 'proud' : 'happy' });
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    saveDraft(lesson.id, null);
    const record = completeLesson(lesson.id, mistakes);
    lesson.practice.forEach((id) => addCard('exercise', id));
    const xp = lesson.xp + bonusXp;
    dispatch({ type: 'LESSON_COMPLETED', lessonId: lesson.id, moduleId: mod.id, mistakes, graded, xp, tags: lesson.tags });
    const snapshot = useProgressStore.getState();
    if (moduleCompletion(mod, snapshot) >= 1) dispatch({ type: 'MODULE_COMPLETED', moduleId: mod.id });
    if (lesson.id === 'fund-01-tablero') useSettingsStore.getState().update({ learnedBasics: true });
    daily.complete();
    setSummary({ stars: record.stars, mistakes, xp: xp + (mistakes === 0 ? 25 : 0), graded, combo });
  };

  const next = () => {
    if (index + 1 >= lesson.steps.length) finish();
    else {
      setIndex(index + 1);
      saveDraft(lesson.id, { index: index + 1, mistakes });
      if (!isGraded(lesson.steps[index + 1])) setTeacher((t) => ({ ...t, mood: 'neutral' }));
    }
  };

  if (summary) {
    const nextLesson = mod.lessons[mod.lessons.findIndex((l) => l.id === lesson.id) + 1];
    return (
      <LessonComplete
        lesson={lesson}
        summary={summary}
        onContinue={() => navigate(daily.fromDaily ? daily.continueTo : nextLesson ? `/leccion/${nextLesson.id}` : '/mapa/capitulos')}
        continueLabel={daily.fromDaily ? daily.continueLabel : nextLesson ? `Siguiente: ${nextLesson.title}` : 'Volver al mapa'}
        onRetry={onRetry}
      />
    );
  }

  const View = stepRegistry[step.type] as ComponentType<StepViewProps<Step>>;
  const mult = comboMultiplier(combo);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progress}>
          <ProgressBar value={index / lesson.steps.length} height={8} />
        </div>
        <AnimatePresence>
          {mult > 1 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Badge tone="accent" icon="fire">x{mult}</Badge>
            </motion.div>
          )}
        </AnimatePresence>
        <Hearts total={maxHearts} left={hearts} />
      </div>

      <div className={styles.meta}>
        <Badge tone="primary">
          <Icon name={mod.icon} /> {mod.title}
        </Badge>
        <h1 className={styles.title}>
          <Icon name={lesson.icon} /> {lesson.title}
        </h1>
      </div>

      {blockDone && (
        <div className={styles.block} role="status">
          <span>
            <strong>Bloque de hoy cumplido.</strong> Puedes seguir, o dejarlo aquí y retomar donde quedaste.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              daily.complete();
              navigate(daily.continueTo);
            }}
          >
            Dejarlo por hoy
          </Button>
        </div>
      )}

      {startAt > 0 && index === startAt && (
        <div className={styles.resume}>
          <span>Retomas donde quedaste (paso {startAt + 1} de {lesson.steps.length}).</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              saveDraft(lesson.id, null);
              onRetry();
            }}
          >
            Empezar de nuevo
          </Button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          <LessonActionSlot.Provider value={slot}>
            <View step={step} onDone={next} onMistake={onMistake} onCorrect={onCorrect} />
          </LessonActionSlot.Provider>
        </motion.div>
      </AnimatePresence>
      <div className={styles.teacher}>
        <TeacherBubble message={teacher.msg} mood={teacher.mood} />
      </div>
      <div ref={setSlot} className={styles.actions} />

      {lesson.sources.length > 0 && (
        <p className={styles.sources}>
          Basado en: {lesson.sources.map((s) => s.title).join(' · ')}
        </p>
      )}
      {index === lesson.steps.length - 1 && <ResourceList items={related} title="Para profundizar" />}

      <Modal
        open={hearts === 0}
        size="sm"
        title="¡Sin vidas!"
        footer={
          <>
            <Button variant="secondary" to="/mapa/capitulos">
              Salir
            </Button>
            <Button
              onClick={() => {
                saveDraft(lesson.id, null);
                onRetry();
              }}
            >
              Reintentar
            </Button>
          </>
        }
      >
        <div style={{ fontSize: '4rem', display: 'flex', justifyContent: 'center' }}><Icon name="heart-break" weight="light" /></div>
        <p>{teacherSays('failed')}</p>
      </Modal>
    </div>
  );
}
