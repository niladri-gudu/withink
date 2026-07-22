// Web Audio API organic synthesizer for Zen mode ambient loops and mechanical key clicks
// 0 bytes of audio files to download. 100% synthesized client-side.

let clickCtx: AudioContext | null = null;
let ambientCtx: AudioContext | null = null;
let ambientSource: AudioBufferSourceNode | null = null;
let ambientGainNode: GainNode | null = null;
let ambientFilterNode: BiquadFilterNode | null = null;

function getClickCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!clickCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      clickCtx = new AudioContextClass();
    }
  }
  if (clickCtx && clickCtx.state === "suspended") {
    clickCtx.resume();
  }
  return clickCtx;
}

function getAmbientCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ambientCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      ambientCtx = new AudioContextClass();
    }
  }
  if (ambientCtx && ambientCtx.state === "suspended") {
    ambientCtx.resume();
  }
  return ambientCtx;
}

export const zenAudioService = {
  /**
   * Play a simulated mechanical typewriter key click
   */
  playTypewriterClick(): void {
    try {
      const ctx = getClickCtx();
      if (!ctx) return;

      // Typewriter key click consists of a fast woody "clack" and a tiny metallic "tink"
      const now = ctx.currentTime;

      // 1. Woody/metallic clack (sine wave rapid decay)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      
      // Randomize pitch slightly per click so it sounds natural and not repetitive
      const baseFreq = 500 + Math.random() * 250;
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(150, now + 0.035);

      gain1.gain.setValueAtTime(0.015, now); // very subtle, non-intrusive
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // 2. High-frequency metallic tick (triangle wave very rapid decay)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(2000 + Math.random() * 800, now);

      gain2.gain.setValueAtTime(0.006, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.02);
    } catch (e) {
      console.warn("Could not play synthesized key click:", e);
    }
  },

  /**
   * Start generating ambient sound loops
   */
  startAmbientLandscape(type: "rain" | "library" | "forest"): void {
    try {
      this.stopAmbientLandscape();
      
      const ctx = getAmbientCtx();
      if (!ctx) return;

      const sampleRate = ctx.sampleRate;
      const bufferSize = 2 * sampleRate; // 2 seconds of unique noise
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate brownian/pink noise filters dynamically
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        let val = 0;
        if (type === "rain") {
          // Brown noise: heavy low frequencies resembling falling rain / water drops
          val = (lastOut + (0.02 * white)) / 1.02;
          lastOut = val;
          output[i] = val * 3.5; 
        } else if (type === "library") {
          // Pink noise: balanced mid-lows simulating soft library white noise or a distant hum
          val = (lastOut + (0.12 * white)) / 1.12;
          lastOut = val;
          output[i] = val * 2.2;
        } else {
          // Forest wind: low rumbling brown noise modulated for swishing leaves
          val = (lastOut + (0.012 * white)) / 1.012;
          lastOut = val;
          output[i] = val * 4.0;
        }
      }

      ambientSource = ctx.createBufferSource();
      ambientSource.buffer = noiseBuffer;
      ambientSource.loop = true;

      // Filter Node to carve out harsh high-frequency hissing
      ambientFilterNode = ctx.createBiquadFilter();
      ambientFilterNode.type = "lowpass";
      
      // Rain has higher filter cut-off, forest has deep low cut-off for rumble
      const initialFreq = type === "rain" ? 500 : type === "library" ? 950 : 380;
      ambientFilterNode.frequency.setValueAtTime(initialFreq, ctx.currentTime);

      // Gain Node to set absolute volume and enable modulation
      ambientGainNode = ctx.createGain();
      
      // Lower volume ranges so it remains a background ambiance
      const initialVolume = type === "forest" ? 0.012 : type === "rain" ? 0.018 : 0.025;
      ambientGainNode.gain.setValueAtTime(initialVolume, ctx.currentTime);

      ambientSource.connect(ambientFilterNode);
      ambientFilterNode.connect(ambientGainNode);
      ambientGainNode.connect(ctx.destination);

      ambientSource.start(0);

      // Apply low-frequency modulation for "forest" to simulate organic wind swishing
      if (type === "forest" && ambientGainNode && ambientFilterNode) {
        const modulationLFO = () => {
          if (!ambientGainNode || !ambientFilterNode || !ctx) return;
          const time = ctx.currentTime;
          
          // Generate a series of slow wave modulations for the next 10 minutes
          for (let offset = 0; offset < 600; offset += 6) {
            const windStrength = 0.005 + Math.random() * 0.018;
            const filterCutoff = 220 + Math.random() * 300;
            
            ambientGainNode.gain.linearRampToValueAtTime(windStrength, time + offset + 3);
            ambientFilterNode.frequency.linearRampToValueAtTime(filterCutoff, time + offset + 3);
          }
        };
        modulationLFO();
      }
    } catch (err) {
      console.error("Failed to start ambient audio landscape:", err);
    }
  },

  /**
   * Stop ambient sound loop and close AudioContext to free hardware resources
   */
  stopAmbientLandscape(): void {
    try {
      if (ambientSource) {
        ambientSource.stop();
        ambientSource.disconnect();
        ambientSource = null;
      }
      if (ambientFilterNode) {
        ambientFilterNode.disconnect();
        ambientFilterNode = null;
      }
      if (ambientGainNode) {
        ambientGainNode.disconnect();
        ambientGainNode = null;
      }
      if (ambientCtx) {
        ambientCtx.close();
        ambientCtx = null;
      }
    } catch (e) {
      // already stopped/closed
    }
  }
};
