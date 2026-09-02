/**
 * AudioEngine (M5 — Doc 10 §5): adapter IAudio berbasis Web Audio API.
 * - Musik ambient 4 musim + varian malam: koto/shamisen sintetis (pluck pentatonik,
 *   loop mulus via lookahead scheduler).
 * - Ambience per musim: burung (spring), jangkrik (summer), hujan (autumn), angin (winter).
 * - SFX aksi: cap hanko, lonceng kuil, siraman onsen, gigitan, koin, menetas, tidur, bersin.
 * - Musik −12 dB di bawah SFX (Doc 10 §5); voice limit SFX (Doc 10 §6).
 * - Audio hanya mulai setelah interaksi pertama (kebijakan autoplay — Doc 10 §5).
 */
import type { IAudio } from "@hagumi/core";

type Season = "spring" | "summer" | "autumn" | "winter";

/** Skala pentatonik per musim (Hz — koto). */
const SCALE: Record<Season, number[]> = {
  spring: [293.66, 329.63, 392.0, 440.0, 523.25], // D E G A C — cerah
  summer: [329.63, 392.0, 440.0, 523.25, 587.33], // E G A C D — riang
  autumn: [220.0, 261.63, 293.66, 329.63, 392.0], // A C D E G — sendu
  winter: [146.83, 174.61, 220.0, 233.08, 293.66], // D F A Bb D — renggang
};

const BASE_TEMPO: Record<Season, number> = { spring: 1.1, summer: 0.9, autumn: 1.4, winter: 1.8 };

export type SfxId =
  | "stamp"
  | "bell"
  | "splash"
  | "bite"
  | "coin"
  | "hatch"
  | "breath"
  | "sneeze"
  | "click"
  | "heart"
  | "pop"
  | "fail"
  | "koi";

function isSeason(v: string): v is Season {
  return v === "spring" || v === "summer" || v === "autumn" || v === "winter";
}

export class AudioEngine implements IAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambGain: GainNode | null = null;
  private ambStop: Array<() => void> = [];
  private musicEnabled = true;
  private sfxEnabled = true;
  private currentTrack: string | null = null;
  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private activeSfx = 0;
  private unlocked = false;

  constructor() {
    if (typeof window !== "undefined") {
      const unlock = (): void => this.unlock();
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    }
  }

  /** Buat/resume AudioContext — dipanggil dari interaksi pertama pengguna. */
  unlock(): void {
    if (this.unlocked && this.ctx?.state === "running") return;
    if (!this.ctx) {
      type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      // Musik −12 dB relatif SFX (Doc 10 §5): 0.125 ≈ 0.5 × −12 dB
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.125 : 0;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.5 : 0;
      this.sfxGain.connect(this.master);
      this.ambGain = this.ctx.createGain();
      this.ambGain.gain.value = this.musicEnabled ? 0.06 : 0;
      this.ambGain.connect(this.master);
    }
    void this.ctx.resume();
    this.unlocked = true;
    // Lanjutkan musik/ambience yang diminta sebelum unlock
    if (this.currentTrack) this.startSequencer(this.currentTrack);
  }

  // ===== Musik (IAudio) =====

  playMusic(trackId: string): void {
    if (this.currentTrack === trackId) return;
    this.currentTrack = trackId;
    if (!this.unlocked) return; // akan dimainkan saat unlock
    this.startSequencer(trackId);
  }

  stopMusic(): void {
    this.currentTrack = null;
    this.stopSequencer();
    this.stopAmbience();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ambGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.125 : 0, this.ctx.currentTime, 0.05);
      this.ambGain.gain.setTargetAtTime(enabled ? 0.06 : 0, this.ctx.currentTime, 0.05);
    }
    if (!enabled) this.stopSequencer();
    else if (this.currentTrack && this.unlocked) this.startSequencer(this.currentTrack);
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(enabled ? 0.5 : 0, this.ctx.currentTime, 0.05);
    }
  }

  // ===== Sequencer musik (koto pluck + lookahead) =====

  private startSequencer(trackId: string): void {
    this.stopSequencer();
    this.stopAmbience();
    if (!this.ctx) return;
    const clean = trackId.replace("music_", "").replace("_night", "");
    const season: Season = isSeason(clean) ? clean : "spring";
    const night = trackId.endsWith("_night");
    const scale = SCALE[season];
    const beat = BASE_TEMPO[season] * (night ? 1.6 : 1);
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    // Ambience layer otomatis mengikuti musik (Doc 10 §5)
    this.startAmbience(season, night);
    this.schedulerTimer = window.setInterval(() => {
      if (!this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.6) {
        this.scheduleStep(season, scale, night, beat);
      }
    }, 200);
  }

  private stopSequencer(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /** Satu langkah melodi — arpeggio pentatonik deterministik; malam lebih rendah & jarang. */
  private scheduleStep(season: Season, scale: number[], night: boolean, beat: number): void {
    const s = this.step++;
    if (s % 2 === 0 || (s * 7 + 3) % 5 === 0) {
      const idx = (s * 5 + (season === "winter" ? 1 : 0)) % scale.length;
      let freq = scale[idx]!;
      if (night && s % 4 !== 0) freq /= 2;
      const gainScale = night ? 0.5 : 1;
      this.pluck(freq, this.nextNoteTime, gainScale);
      if (s % 8 === 0) this.pluck(freq / 2, this.nextNoteTime, gainScale * 0.7); // dron bas
    }
    this.nextNoteTime += beat / 2;
  }

  /** Pluck koto: triangle + lowpass + decay eksponensial. */
  private pluck(freq: number, t: number, gainScale = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * gainScale, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  // ===== Ambience per musim =====

  private startAmbience(season: Season, night: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambGain) return;
    if (season === "spring" && !night) this.loopChirps(2.2, 3.8, 2400, 3400, 0.25); // burung siang
    else if (season === "summer") this.loopChirps(0.4, 0.9, 4200, 5200, 0.18); // jangkrik
    else if (season === "autumn") this.loopNoise("bandpass", 900, 0.035); // hujan rintik
    else if (season === "winter") this.loopNoise("lowpass", 400, 0.05); // angin
    if (night) this.loopChirps(3.5, 7, 3600, 4400, 0.1); // suara malam halus
  }

  private stopAmbience(): void {
    for (const stop of this.ambStop) stop();
    this.ambStop = [];
  }

  /** Burung/jangkrik: chirp pendek acak dalam jendela waktu — pakai timer JS ringan. */
  private loopChirps(minGap: number, maxGap: number, fMin: number, fMax: number, vol: number): void {
    const tick = (): void => {
      if (!this.ctx || !this.ambGain || !this.musicEnabled) return;
      const t = this.ctx.currentTime;
      const freq = fMin + Math.random() * (fMax - fMin);
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.09);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(this.ambGain);
      osc.start(t);
      osc.stop(t + 0.14);
      const id = window.setTimeout(tick, (minGap + Math.random() * (maxGap - minGap)) * 1000);
      this.ambStop.push(() => window.clearTimeout(id));
    };
    const id = window.setTimeout(tick, minGap * 500);
    this.ambStop.push(() => window.clearTimeout(id));
  }

  /** Tekstur noise loop (hujan/angin) via buffer acak + filter. */
  private loopNoise(filterType: BiquadFilterType, freq: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambGain) return;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.98 * last + 0.02 * white; // brown-ish noise
      data[i] = last * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt);
    filt.connect(g);
    g.connect(this.ambGain);
    src.start();
    this.ambStop.push(() => {
      try {
        src.stop();
      } catch {
        /* sudah berhenti */
      }
    });
  }

  // ===== SFX (IAudio) =====

  playSfx(id: string): void {
    if (!this.sfxEnabled || !this.unlocked || !this.ctx || !this.sfxGain) return;
    // Voice limit (Doc 10 §6): jangan menumpuk >6 SFX simultan
    if (this.activeSfx >= 6) return;
    this.activeSfx++;
    const t = this.ctx.currentTime;
    try {
      switch (id) {
        case "stamp":
          this.tone(t, 180, 0.06, "square", 0.4, 0.09);
          this.noiseBurst(t, 0.05, 1200, 0.3);
          break;
        case "bell":
          this.tone(t, 880, 0.9, "sine", 0.35, 0.01);
          this.tone(t, 1320, 0.7, "sine", 0.15, 0.01);
          break;
        case "splash":
          this.noiseBurst(t, 0.3, 2400, 0.35);
          this.tone(t, 300, 0.25, "sine", 0.2, 0.12, 90);
          break;
        case "bite":
          this.tone(t, 220, 0.06, "square", 0.3, 0.005);
          this.tone(t + 0.09, 180, 0.06, "square", 0.25, 0.005);
          break;
        case "coin":
          this.tone(t, 988, 0.08, "square", 0.25, 0.004);
          this.tone(t + 0.07, 1319, 0.18, "square", 0.25, 0.004);
          break;
        case "hatch":
          for (let i = 0; i < 4; i++) this.tone(t + i * 0.08, 600 + i * 180, 0.07, "triangle", 0.3, 0.005);
          this.tone(t + 0.35, 1047, 0.5, "triangle", 0.35, 0.02);
          break;
        case "breath":
          this.noiseBurst(t, 0.5, 500, 0.2);
          break;
        case "sneeze":
          this.tone(t, 700, 0.05, "sawtooth", 0.3, 0.004, 250);
          this.noiseBurst(t + 0.05, 0.12, 1800, 0.3);
          break;
        case "click":
          this.tone(t, 660, 0.04, "square", 0.15, 0.003);
          break;
        case "heart":
          this.tone(t, 523, 0.1, "sine", 0.25, 0.006);
          this.tone(t + 0.1, 659, 0.14, "sine", 0.25, 0.006);
          break;
        case "pop":
          this.tone(t, 400, 0.05, "sine", 0.3, 0.003, 800);
          break;
        case "fail":
          this.tone(t, 330, 0.12, "sawtooth", 0.2, 0.006);
          this.tone(t + 0.13, 220, 0.2, "sawtooth", 0.2, 0.006);
          break;
        case "koi":
          this.tone(t, 440, 0.08, "triangle", 0.25, 0.005);
          this.tone(t + 0.09, 554, 0.1, "triangle", 0.25, 0.005);
          this.tone(t + 0.2, 659, 0.16, "triangle", 0.3, 0.006);
          break;
      }
    } finally {
      const dur = 0.6;
      window.setTimeout(() => {
        this.activeSfx = Math.max(0, this.activeSfx - 1);
      }, dur * 1000);
    }
  }

  /** Nada sederhana dengan envelope. */
  private tone(
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    attack: number,
    glideTo?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Burst noise terfilter (erangan/siraman). */
  private noiseBurst(t: number, dur: number, cutoff: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

/** Instance tunggal — dipakai gameSystem & SettingsSheet. */
export const audioEngine = new AudioEngine();



