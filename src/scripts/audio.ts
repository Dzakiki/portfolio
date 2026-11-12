export interface AudioKit {
  on(): boolean;
  /** Flip sound on or off; returns the new state. Must be called from a user gesture. */
  toggle(): boolean;
  bell(): void;
  door(): void;
  chime(): void;
}

export const labelFor = (on: boolean): string => `SOUND: ${on ? 'ON' : 'OFF'}`;

const MASTER = 0.18;

/** All sound is synthesised; nothing is downloaded. Silent until toggled on. */
export function createAudio(): AudioKit {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = false;

  function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function ensure(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // wind: looped noise through a band-pass, slowly swelling
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 2);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 420;
    band.Q.value = 0.7;
    const wind = ctx.createGain();
    wind.gain.value = 0.32;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = 0.16;
    lfo.connect(depth).connect(wind.gain);
    src.connect(band).connect(wind).connect(master);
    src.start();
    lfo.start();
    return ctx;
  }

  /** A sine partial with a soft attack and exponential decay. */
  function partial(freq: number, amp: number, dur: number, attack = 0.03, endFreq?: number): void {
    if (!enabled || !ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    on: () => enabled,
    toggle() {
      enabled = !enabled;
      const c = ensure();
      void c.resume();
      master!.gain.cancelScheduledValues(c.currentTime);
      master!.gain.linearRampToValueAtTime(enabled ? MASTER : 0, c.currentTime + 1.2);
      return enabled;
    },
    bell() {
      const base = 98;
      for (const [ratio, amp, dur] of [[0.5, 1, 6], [1, 0.8, 5], [1.19, 0.5, 4], [1.5, 0.35, 3.2], [2, 0.3, 2.6], [2.51, 0.18, 2], [3.01, 0.1, 1.5]] as const) {
        partial(base * ratio, amp * 0.25, dur, 0.04);
      }
    },
    door() {
      partial(60, 0.5, 0.7, 0.03, 32);
      if (!enabled || !ctx || !master) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 0.5);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 180;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(low).connect(g).connect(master);
      src.start(t);
    },
    chime() {
      partial(784, 0.06, 0.9, 0.02);
      partial(1175, 0.04, 0.7, 0.02);
    },
  };
}
