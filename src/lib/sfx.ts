/**
 * Sons de interface — sutis, curtos, estilo Apple.
 * Gerados via WebAudio (sem assets), respeitam a preferência do usuário.
 */
type SfxName = "tap" | "open" | "save" | "success" | "notify" | "ai" | "celebrate";

const KEY = "riku_sfx_enabled";
let ctx: AudioContext | null = null;

export function sfxEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}
export function setSfxEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* noop */ }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

function blip(freq: number, dur: number, gain: number, delay = 0, type: OscillatorType = "sine") {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const RECIPES: Record<SfxName, () => void> = {
  tap:       () => blip(660, 0.06, 0.035, 0, "triangle"),
  open:      () => { blip(520, 0.10, 0.030); blip(780, 0.10, 0.022, 0.05); },
  save:      () => { blip(720, 0.09, 0.032); blip(960, 0.12, 0.026, 0.06); },
  success:   () => { blip(660, 0.10, 0.032); blip(880, 0.10, 0.030, 0.07); blip(1180, 0.16, 0.024, 0.14); },
  notify:    () => { blip(880, 0.08, 0.030); blip(1320, 0.12, 0.020, 0.07); },
  ai:        () => { blip(420, 0.14, 0.026, 0, "sine"); blip(840, 0.18, 0.020, 0.06); },
  celebrate: () => { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.16, 0.028, i * 0.07)); },
};

export function sfx(name: SfxName) {
  if (!sfxEnabled()) return;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    RECIPES[name]();
  } catch { /* silêncio é ok */ }
}
