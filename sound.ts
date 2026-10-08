"use client";

// Tiny Web Audio synth: a cartoon moo and a few slot-machine blips. No audio files to download.
let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = typeof window !== "undefined" && window.localStorage.getItem("cashcow:muted") === "1";
} catch {
  // storage blocked: sound stays on
}

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  try {
    window.localStorage.setItem("cashcow:muted", v ? "1" : "0");
  } catch {
    // ignore
  }
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A sawtooth through a sweeping low-pass and an "oo" formant, with a little vibrato. */
export function moo(pitch = 1) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const dur = 0.95 + Math.random() * 0.3;
  const base = 112 * pitch;

  const osc = a.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(base * 0.9, t);
  osc.frequency.linearRampToValueAtTime(base * 1.1, t + 0.22);
  osc.frequency.linearRampToValueAtTime(base * 0.82, t + dur);

  const lfo = a.createOscillator();
  lfo.frequency.value = 5.2;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 2.5 * pitch;
  lfo.connect(lfoGain).connect(osc.frequency);

  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 4;
  lp.frequency.setValueAtTime(380, t);
  lp.frequency.linearRampToValueAtTime(1300, t + 0.28);
  lp.frequency.linearRampToValueAtTime(600, t + dur);

  const formant = a.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 520;
  formant.Q.value = 3;

  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.9, t + 0.1);
  env.gain.setValueAtTime(0.9, t + dur * 0.65);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const out = a.createGain();
  out.gain.value = 0.32;
  osc.connect(lp);
  lp.connect(env);
  lp.connect(formant).connect(env);
  env.connect(out).connect(a.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

export function blip(freq = 660, dur = 0.06, type: OscillatorType = "square", gain = 0.06) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function jingle(big = false) {
  const notes = big ? [523, 659, 784, 1047, 784, 1047, 1319] : [659, 784, 1047];
  notes.forEach((f, i) => window.setTimeout(() => blip(f, 0.12, "triangle", 0.09), i * 90));
}
