/**
 * Trilha ambiente "espacial" gerada ao vivo com Web Audio: acordes suaves com
 * filtro que respira, baixo, arpejo e eco. Nada de arquivo de áudio, nada de
 * direitos autorais. Só toca depois de um clique (regra dos navegadores).
 */

const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/** Am9 – Fmaj7 – Cmaj7 – G6, notas em MIDI. */
const CHORDS = [
  [57, 60, 64, 67, 71],
  [53, 57, 60, 64, 69],
  [48, 55, 59, 64, 67],
  [55, 59, 62, 64, 67],
];
const ARP = [0, 2, 3, 4, 3, 2, 1, 2];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class SpaceMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private arpOut: GainNode | null = null;
  private timer: number | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private volume = 0.5;
  playing = false;

  private impulse(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  private setup() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 4.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.7;
    padFilter.connect(master);
    padFilter.connect(reverb);

    // Filtro "respirando" devagar.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    lfo.start();

    // Arpejo com eco (criado uma vez só).
    const arpOut = ctx.createGain();
    const echo = ctx.createDelay();
    echo.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    echo.connect(fb).connect(echo);
    echo.connect(reverb);
    echo.connect(master);
    arpOut.connect(master);
    arpOut.connect(echo);

    this.ctx = ctx;
    this.arpOut = arpOut;
    this.master = master;
    this.padFilter = padFilter;
    this.reverb = reverb;
  }

  private note(freq: number, start: number, dur: number, opts: { type: OscillatorType; gain: number; attack: number; release: number; to: AudioNode; detune?: number }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.value = freq;
    osc.detune.value = opts.detune ?? 0;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(opts.gain, start + opts.attack);
    g.gain.setValueAtTime(opts.gain, start + Math.max(opts.attack, dur - opts.release));
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(g).connect(opts.to);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private scheduleBar(t: number) {
    const chord = CHORDS[this.bar % CHORDS.length];
    // Pad: cada nota com duas vozes levemente desafinadas.
    for (const n of chord) {
      for (const detune of [-7, 7]) {
        this.note(midi(n), t, BAR * 1.05, { type: "sawtooth", gain: 0.022, attack: 1.2, release: 1.2, to: this.padFilter!, detune });
      }
    }
    // Baixo.
    this.note(midi(chord[0] - 12), t, BAR, { type: "sine", gain: 0.12, attack: 0.08, release: 0.6, to: this.master! });
    // Arpejo em colcheias, uma oitava acima (some nos 2 primeiros compassos de cada 8).
    const steps = this.bar % 8 < 2 ? 0 : 8;
    for (let i = 0; i < steps; i++) {
      const n = chord[ARP[i] % chord.length] + 12;
      this.note(midi(n), t + i * (BEAT / 2), BEAT * 0.45, { type: "triangle", gain: 0.035, attack: 0.01, release: 0.3, to: this.arpOut! });
    }
    this.bar += 1;
  }

  private tick = () => {
    if (!this.ctx) return;
    while (this.nextBarTime < this.ctx.currentTime + BAR) {
      this.scheduleBar(this.nextBarTime);
      this.nextBarTime += BAR;
    }
  };

  async start() {
    if (this.playing) return;
    if (!this.ctx) this.setup();
    const ctx = this.ctx!;
    await ctx.resume();
    this.nextBarTime = ctx.currentTime + 0.1;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.linearRampToValueAtTime(this.volume * 0.6, ctx.currentTime + 2.5);
    this.tick();
    this.timer = window.setInterval(this.tick, 250);
    this.playing = true;
  }

  stop() {
    if (!this.playing || !this.ctx) return;
    const ctx = this.ctx;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setValueAtTime(this.master!.gain.value, ctx.currentTime);
    this.master!.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    window.setTimeout(() => {
      if (!this.playing) void ctx.suspend();
    }, 1200);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && this.playing) this.master.gain.linearRampToValueAtTime(this.volume * 0.6, this.ctx.currentTime + 0.3);
  }
}

let instance: SpaceMusic | null = null;
export const music = () => (instance ??= new SpaceMusic());
