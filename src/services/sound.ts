import { useSettingsStore } from '@/store/settingsStore';

/** Sonidos sintetizados con WebAudio (sin archivos de audio). */
let ctx: AudioContext | null = null;

function tone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gain = 0.08) {
  if (!useSettingsStore.getState().sound) return;
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    /* audio no disponible */
  }
}

export const sound = {
  move: () => tone(220, 0.08, 'triangle', 0, 0.12),
  capture: () => {
    tone(180, 0.06, 'square', 0, 0.06);
    tone(140, 0.08, 'triangle', 0.04, 0.1);
  },
  correct: () => {
    tone(660, 0.12, 'sine');
    tone(880, 0.18, 'sine', 0.1);
  },
  wrong: () => {
    tone(200, 0.15, 'sawtooth', 0, 0.05);
    tone(150, 0.2, 'sawtooth', 0.12, 0.05);
  },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.12, 0.1)),
  achievement: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.15, 'sine', i * 0.09, 0.08)),
};
