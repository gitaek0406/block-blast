/**
 * Block Blast Sound FX Engine using Web Audio API
 * Generates dynamic, synthesizer-based audio effects without external dependencies.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('block_blast_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('block_blast_muted', this.isMuted);
    return this.isMuted;
  }

  // Soft block pickup blip
  playPickup() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Wooden pop / placement thud
  playPlace() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Line Clear Blast & Multi-Combo Chime
  playClear(lines = 1, combo = 1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
      const pitchOffset = Math.min(combo * 1.5, 8);
      const notesToPlay = Math.min(2 + lines, 6);

      for (let i = 0; i < notesToPlay; i++) {
        const t = this.ctx.currentTime + (i * 0.06);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseIndex = (i + Math.min(combo - 1, 3)) % baseFreqs.length;
        const freq = baseFreqs[baseIndex] * (1 + pitchOffset * 0.03);

        osc.type = combo > 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.18);

        const volume = Math.min(0.18 + lines * 0.04, 0.35);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.25);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Game over sound
  playGameOver() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + (idx * 0.14);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.25);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // General click sound
  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

// Global Sound Instance
window.soundEngine = new SoundEngine();
