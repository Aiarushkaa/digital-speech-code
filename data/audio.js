
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;

    this.started = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.voiceEnabled = true;
    this.volume = 0.7;

    this.worldIndex = 0;
    this.musicTimer = null;
    this.musicStep = 0;
    this.speech = null;

    this.tracks = [
      [261.63, 329.63, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23],
      [293.66, 369.99, 440.00, 369.99, 329.63, 392.00, 493.88, 392.00],
      [220.00, 261.63, 329.63, 392.00, 261.63, 329.63, 392.00, 440.00],
      [329.63, 392.00, 493.88, 587.33, 392.00, 493.88, 587.33, 659.25],
      [196.00, 246.94, 293.66, 369.99, 246.94, 293.66, 369.99, 440.00]
    ];
  }

  async start() {
    if (this.started) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error('AudioContext қолжетімсіз');
    }

    this.ctx = new AudioContextClass();

    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();

    this.master.gain.value = this.volume;
    this.musicBus.gain.value = 0.35;
    this.sfxBus.gain.value = 1;

    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);

    await this.ctx.resume();

    this.started = true;

    this.launchEffect();
    this.startMusic();
  }

  setWorld(index) {
    this.worldIndex = Math.max(0, Number(index) || 0);
    this.musicStep = 0;

    if (this.started && this.musicEnabled) {
      this.startMusic();
    }
  }

  setVolume(value) {
    this.volume = Math.max(
      0,
      Math.min(1, value > 1 ? value / 100 : value)
    );

    if (this.master) {
      this.master.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);

    if (!this.started) return;

    this.musicBus.gain.setTargetAtTime(
      this.musicEnabled ? 0.35 : 0,
      this.ctx.currentTime,
      0.1
    );

    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = Boolean(enabled);

    if (!this.voiceEnabled) {
      this.stopSpeech();
    }
  }

  tone(
    frequency,
    duration = 0.2,
    type = 'sine',
    volume = 0.12,
    bus = this.sfxBus
  ) {
    if (!this.started || !this.sfxEnabled) return;

    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, volume),
      now + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(bus);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  noise(duration = 0.15, volume = 0.1) {
    if (!this.started || !this.sfxEnabled) return;

    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(
      1,
      length,
      this.ctx.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + duration
    );

    source.connect(gain);
    gain.connect(this.sfxBus);
    source.start();
  }

  launchEffect() {
    if (!this.started || !this.sfxEnabled) return;

    this.tone(220, 0.5, 'sawtooth', 0.08);
    setTimeout(() => this.tone(330, 0.5, 'sine', 0.1), 150);
    setTimeout(() => this.tone(440, 0.7, 'sine', 0.12), 300);
  }

  step() {
    this.noise(0.07, 0.07);
    this.tone(85, 0.08, 'triangle', 0.05);
  }

  correct() {
    this.tone(523.25, 0.18, 'sine', 0.14);
    setTimeout(() => this.tone(659.25, 0.2, 'sine', 0.14), 100);
    setTimeout(() => this.tone(783.99, 0.3, 'sine', 0.16), 200);
  }

  wrong() {
    this.tone(220, 0.25, 'sawtooth', 0.12);
    setTimeout(() => this.tone(164.81, 0.35, 'sawtooth', 0.1), 150);
  }

  coin() {
    this.tone(880, 0.12, 'sine', 0.12);
    setTimeout(() => this.tone(1174.66, 0.2, 'sine', 0.12), 90);
  }

  achievement() {
    [392, 493.88, 587.33, 783.99].forEach((note, i) => {
      setTimeout(() => this.tone(note, 0.35, 'sine', 0.14), i * 130);
    });
  }

  portal() {
    [220, 330, 440, 660].forEach((note, i) => {
      setTimeout(() => this.tone(note, 0.45, 'sine', 0.12), i * 100);
    });
  }

  startMusic() {
    if (!this.started || !this.musicEnabled) return;

    this.stopMusic();

    const track =
      this.tracks[this.worldIndex % this.tracks.length];

    this.musicStep = 0;

    const playBeat = () => {
      if (!this.started || !this.musicEnabled) return;

      const index = this.musicStep % track.length;
      const note = track[index];

      this.playMusicTone(note, 0.32, 0.045);
      this.playMusicTone(note / 2, 0.42, 0.035);

      if (index % 2 === 0) {
        this.playMusicTone(note * 2, 0.16, 0.018);
      }

      this.musicStep++;
    };

    playBeat();
    this.musicTimer = setInterval(playBeat, 420);
  }

  playMusicTone(frequency, duration, volume) {
    if (!this.started || !this.musicEnabled) return;

    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(this.musicBus);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  speak(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) {
      return;
    }

    this.stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    this.speech = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  destroy() {
    this.stopMusic();
    this.stopSpeech();

    if (this.ctx) {
      this.ctx.close();
    }

    this.started = false;
    this.ctx = null;
  }
}
