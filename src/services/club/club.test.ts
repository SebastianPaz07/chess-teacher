import { describe, expect, it } from 'vitest';
import { weekStart } from '@/lib/date';
import { applyEvent, initialGameState } from '@/services/game/engine';
import { compareResults, pickChallengePuzzles, pickWeeklyPuzzles, scoreChallenge, simulateRun } from './challenges';
import { computeLeaderboard, visibleStreak, weeklyGoal } from './logic';
import { toDailyActivity, toMemberStats } from './mapping';
import { createMockRepository, type PoolPuzzle } from './mockRepository';
import type { Member, MemberStats } from './types';

const pool: PoolPuzzle[] = Array.from({ length: 400 }, (_, i) => ({ id: `p${i}`, rating: 600 + (i % 100) * 20, solution: ['a', 'b', 'c'].slice(0, 1 + (i % 3)) }));

describe('weekStart', () => {
  it('devuelve el lunes de la semana', () => {
    expect(weekStart('2026-11-23')).toBe('2026-11-23'); // lunes
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // domingo
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
  });
});

describe('retos', () => {
  it('elige el mismo set con la misma semilla, cerca del rating medio', () => {
    const a = pickChallengePuzzles(pool, 'puzzles', 1000, 1200, 'seed-1');
    const b = pickChallengePuzzles(pool, 'puzzles', 1000, 1200, 'seed-1');
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    const ratings = a.map((id) => pool.find((p) => p.id === id)!.rating);
    for (const r of ratings) expect(Math.abs(r - 1100)).toBeLessThanOrEqual(300);
  });

  it('rush: lista larga sin repetidos', () => {
    const ids = pickChallengePuzzles(pool, 'rush', 900, 900, 'x');
    expect(ids.length).toBeGreaterThan(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el desafío semanal es igual para todo el club esa semana', () => {
    expect(pickWeeklyPuzzles(pool, 'club-1', '2026-11-23', 1000)).toEqual(pickWeeklyPuzzles(pool, 'club-1', '2026-11-23', 1000));
    expect(pickWeeklyPuzzles(pool, 'club-1', '2026-11-23', 1000)).not.toEqual(pickWeeklyPuzzles(pool, 'club-1', '2026-11-30', 1000));
  });

  it('gana quien resuelve más, luego menos fallos, luego menos tiempo', () => {
    const r = (memberId: string, solved: number, mistakes: number, timeMs: number) => ({ memberId, solved, mistakes, timeMs, finishedAt: '' });
    expect(scoreChallenge([r('a', 4, 1, 90_000), r('b', 3, 0, 30_000)])).toBe('a');
    expect(scoreChallenge([r('a', 4, 2, 50_000), r('b', 4, 1, 90_000)])).toBe('b');
    expect(scoreChallenge([r('a', 4, 1, 50_000), r('b', 4, 1, 90_000)])).toBe('a');
    expect(scoreChallenge([r('a', 4, 1, 50_000), r('b', 4, 1, 50_000)])).toBeNull();
    expect(compareResults({ solved: 1, mistakes: 0, timeMs: 0 }, { solved: 1, mistakes: 0, timeMs: 0 })).toBe(0);
  });

  it('la simulación es determinista y respeta las vidas del rush', () => {
    const ratings = Array.from({ length: 40 }, () => 1800);
    const a = simulateRun(800, ratings, 'rush', 's');
    expect(simulateRun(800, ratings, 'rush', 's')).toEqual(a);
    expect(a.mistakes).toBeLessThanOrEqual(3);
    expect(a.timeMs).toBeLessThanOrEqual(180_000);
  });
});

describe('ranking y rachas', () => {
  const m = (id: string): Member => ({ id, name: id, avatar: 'piece-pawn', role: 'member', joinedAt: '' });
  const st = (p: Partial<MemberStats>): MemberStats => ({ xp: 0, level: 1, rating: 800, streak: 0, bestStreak: 0, lastActive: null, lessonsCompleted: 0, puzzlesSolved: 0, achievements: 0, modules: {}, updatedAt: '', ...p });

  it('la racha se ve hasta el día siguiente y luego cae a 0', () => {
    expect(visibleStreak({ streak: 5, lastActive: '2026-11-23' }, '2026-11-24')).toBe(5);
    expect(visibleStreak({ streak: 5, lastActive: '2026-11-22' }, '2026-11-24')).toBe(0);
  });

  it('XP de la semana y flecha respecto a ayer', () => {
    const today = '2026-11-25'; // miércoles
    const rows = computeLeaderboard(
      [
        { member: m('ana'), stats: st({}), activity: [{ day: '2026-11-24', xp: 100, puzzles: 0, lessons: 0, reviews: 0, minutes: 0 }] },
        { member: m('beto'), stats: st({}), activity: [{ day: '2026-11-24', xp: 50, puzzles: 0, lessons: 0, reviews: 0, minutes: 0 }, { day: today, xp: 80, puzzles: 0, lessons: 0, reviews: 0, minutes: 0 }] },
        // fuera de la semana: no cuenta
        { member: m('caro'), stats: st({}), activity: [{ day: '2026-11-20', xp: 999, puzzles: 0, lessons: 0, reviews: 0, minutes: 0 }] },
      ],
      'week',
      'xp',
      today,
    );
    expect(rows.map((r) => [r.member.id, r.value, r.rank, r.prevRank])).toEqual([
      ['beto', 130, 1, 2],
      ['ana', 100, 2, 1],
      ['caro', 0, 3, 3],
    ]);
  });

  it('la meta semanal escala con los miembros', () => {
    const small = weeklyGoal('c', '2026-11-23', 2, null);
    const big = weeklyGoal('c', '2026-11-23', 10, null);
    expect(big.metric).toBe(small.metric);
    expect(big.target).toBeGreaterThan(small.target);
  });
});

describe('motor de juego: eventos del club', () => {
  it('CHALLENGE_FINISHED da XP extra al ganar y cuenta la revancha', () => {
    const s0 = initialGameState('2026-11-23');
    const lost = applyEvent(s0, { type: 'CHALLENGE_FINISHED', challengeId: 'c1', won: false, solved: 2, revenge: false }, '2026-11-23');
    const won = applyEvent(lost.state, { type: 'CHALLENGE_FINISHED', challengeId: 'c2', won: true, solved: 4, revenge: true }, '2026-11-23');
    expect(lost.state.xp).toBe(30);
    expect(won.state.xp - lost.state.xp).toBeGreaterThanOrEqual(80);
    expect(won.state.stats.challengesWon).toBe(1);
    expect(won.rewards.some((r) => r.kind === 'achievement' && r.id === 'revenge')).toBe(true);
  });

  it('cuenta ejercicios y lecciones por día', () => {
    const s0 = initialGameState('2026-11-23');
    const a = applyEvent(s0, { type: 'PUZZLE_SOLVED', exerciseId: 'x', themes: [], success: true, mistakes: 0, puzzleRating: 900, context: 'practice' }, '2026-11-23');
    expect(a.state.activityLog['2026-11-23']).toEqual({ puzzles: 1, lessons: 0, reviews: 0 });
    const act = toDailyActivity(a.state, '2026-11-23');
    expect(act[0]).toMatchObject({ day: '2026-11-23', puzzles: 1 });
    expect(act[0].xp).toBeGreaterThan(0);
    const stats = toMemberStats(a.state, { lessons: {}, mastery: {}, placementLevel: null }, [], 'now');
    expect(stats.puzzlesSolved).toBe(1);
  });
});

describe('repositorio demo', () => {
  function make(day = new Date(2026, 10, 25, 21, 0), admin = true) {
    let saved: string | null = null;
    let realNow = 0;
    const repo = createMockRepository({ load: () => saved, save: (j) => (saved = j), now: () => day, realNow: () => realNow, pool: async () => pool, botReplySeconds: [10, 10], isPlatformAdmin: () => admin });
    return { repo, tick: (ms: number) => (realNow += ms) };
  }

  it('crea un club con compañeros que tienen historial', async () => {
    const { repo } = make();
    await repo.confirmMagicLink('yo@test.com');
    await repo.saveMyProfile({ name: 'Yo', avatar: 'piece-knight' });
    const club = await repo.createClub('Club de prueba');
    expect(club.inviteCode).toHaveLength(6);
    const members = await repo.getMembers();
    expect(members.length).toBe(7);
    expect(members.filter((m) => m.member.isBot).some((m) => m.stats.xp > 0)).toBe(true);
    expect((await repo.getFeed()).length).toBeGreaterThan(0);
    const week = await repo.getClubWeek();
    expect(week.puzzleIds.length).toBeGreaterThan(0);
  });

  it('un bot responde a tu reto y se decide el ganador', async () => {
    const { repo, tick } = make();
    await repo.confirmMagicLink('yo@test.com');
    await repo.saveMyProfile({ name: 'Yo', avatar: 'piece-knight' });
    await repo.createClub('Club');
    const c = await repo.createChallenge('bot-mateo', 'puzzles');
    await repo.submitChallengeResult(c.id, { solved: 5, mistakes: 0, timeMs: 1000 });
    tick(11_000);
    const after = await repo.getChallenge(c.id);
    expect(after?.status).toBe('done');
    expect(after?.winnerId).not.toBeUndefined();
  });

  it('no deja animar dos veces el mismo día', async () => {
    const { repo } = make();
    await repo.confirmMagicLink('yo@test.com');
    await repo.saveMyProfile({ name: 'Yo', avatar: 'piece-knight' });
    await repo.createClub('Club');
    await repo.sendNudge('bot-andres');
    await expect(repo.sendNudge('bot-andres')).rejects.toThrow(/Ya animaste/);
  });

  it('solo el admin o quien llega por un link puede crear clubes', async () => {
    const { repo } = make(undefined, false);
    await repo.confirmMagicLink('amigo@test.com');
    await repo.saveMyProfile({ name: 'Amigo', avatar: 'piece-pawn' });
    expect(await repo.canCreateClub()).toBe(false);
    await expect(repo.createClub('Club de prueba')).rejects.toThrow(/link de invitación/);
    expect(await repo.redeemCreatorToken('corto')).toBe(false);
    expect(await repo.redeemCreatorToken('CRABCD2345')).toBe(true);
    expect(await repo.canCreateClub()).toBe(true);
    await repo.createClub('Club de prueba');
    expect(await repo.canCreateClub()).toBe(false);
  });

  it('quien crea el club es organizador y puede nombrar colaboradores', async () => {
    const { repo } = make();
    await repo.confirmMagicLink('yo@test.com');
    await repo.saveMyProfile({ name: 'Yo', avatar: 'piece-knight' });
    await repo.createClub('Club');
    let members = await repo.getMembers();
    expect(members.find((m) => !m.member.isBot)?.member.role).toBe('owner');
    await repo.setMemberRole('bot-mateo', 'manager');
    members = await repo.getMembers();
    expect(members.find((m) => m.member.id === 'bot-mateo')?.member.role).toBe('manager');
    await repo.removeMember('bot-andres');
    expect((await repo.getMembers()).some((m) => m.member.id === 'bot-andres')).toBe(false);
  });

  it('un club al que te invitan no se llama como su código', async () => {
    const { repo } = make();
    await repo.confirmMagicLink('yo@test.com');
    await repo.saveMyProfile({ name: 'Yo', avatar: 'piece-knight' });
    const club = await repo.joinClub('K7PQ2M');
    expect(club.name).not.toContain(club.inviteCode);
    expect((await repo.getMembers()).find((m) => !m.member.isBot)?.member.role).toBe('member');
    await expect(repo.setMemberRole('bot-mateo', 'manager')).rejects.toThrow(/organizador/);
  });
});
