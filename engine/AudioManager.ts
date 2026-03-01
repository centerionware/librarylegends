
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private lastPlayTimes: Map<string, number> = new Map();
  private enabled: boolean = false;
  
  // Sequencer state
  private currentBpm: number = 128;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // seconds
  private timerId: number | null = null;

  // Scales & Patterns (8-bit C minor / Pentatonic vibes)
  private bassScale = [65.41, 77.78, 98.00, 116.54]; // C2, Eb2, G2, Bb2
  private leadScale = [261.63, 311.13, 392.00, 466.16, 523.25]; // C4, Eb4, G4, Bb4, C5
  
  private bassPattern = [0, 0, 2, 2, 3, 3, 1, 1];
  private leadPattern = [0, -1, 1, -1, 2, 4, 3, -1, 0, 2, 1, -1, 3, -1, 2, -1];

  private COOLDOWNS = {
    fire_basic: 80,
    fire_rapid: 40,
    fire_sniper: 150,
    fire_aoe: 200,
    death: 30,
    click: 50,
    shard: 100,
    level_up: 60, // Added cooldown for level_up to handle rapid spending
  };

  constructor() {}

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
    
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.08;
    this.bgmGain.connect(this.masterGain);
    
    this.enabled = true;
    this.scheduler();
  }

  public enable() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stop() {
    this.enabled = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  public updateBPM(level: number) {
    this.currentBpm = Math.min(220, 128 + (level * 1.5));
  }

  private scheduler = () => {
    if (!this.ctx || !this.enabled) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
    this.timerId = window.setTimeout(this.scheduler, this.lookahead);
  }

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.currentBpm;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    if (step % 2 === 0) {
      const bassIndex = this.bassPattern[(step / 2) % 8];
      if (bassIndex !== -1) {
        this.playPluck(this.bassScale[bassIndex], time, 0.15, 'triangle', 0.4);
      }
    }

    const leadIndex = this.leadPattern[step % 16];
    if (leadIndex !== -1) {
      this.playPluck(this.leadScale[leadIndex], time, 0.1, 'square', 0.2);
    }
  }

  private playPluck(freq: number, time: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(volume, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.connect(g);
    g.connect(this.bgmGain);
    
    osc.start(time);
    osc.stop(time + duration);
  }

  private canPlay(key: string): boolean {
    if (!this.enabled) return false;
    const now = Date.now();
    const last = this.lastPlayTimes.get(key) || 0;
    const cooldown = (this.COOLDOWNS as any)[key] || 0;
    if (now - last > cooldown) {
      this.lastPlayTimes.set(key, now);
      return true;
    }
    return false;
  }

  public playFire(type: string) {
    if (!this.ctx || !this.masterGain) return;
    const key = `fire_${type.toLowerCase()}`;
    if (!this.canPlay(key)) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.masterGain);

    const now = this.ctx.currentTime;
    
    if (type === 'SNIPER') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      g.gain.setValueAtTime(0.3, now);
      g.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'RAPID') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.05);
      g.gain.setValueAtTime(0.1, now);
      g.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'AOE') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      g.gain.setValueAtTime(0.4, now);
      g.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      g.gain.setValueAtTime(0.2, now);
      g.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  public playDeath() {
    if (!this.ctx || !this.masterGain || !this.canPlay('death')) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 0.15);
    
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playClick() {
    if (!this.ctx || !this.masterGain || !this.canPlay('click')) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.02);
    g.gain.setValueAtTime(0.1, now);
    g.gain.linearRampToValueAtTime(0, now + 0.02);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  public playLevelUp() {
    if (!this.ctx || !this.masterGain || !this.canPlay('level_up')) return;
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      g.gain.setValueAtTime(0.1, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  public playGameOver() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(55, now + 1.5);
    g.gain.setValueAtTime(0.3, now);
    g.gain.linearRampToValueAtTime(0, now + 1.5);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  public playShard() {
    if (!this.ctx || !this.masterGain || !this.canPlay('shard')) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
    g.gain.setValueAtTime(0.15, now);
    g.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const audio = new AudioManager();
