/**
 * Audio wire format: one binary WebSocket frame per captured chunk.
 *
 *   offset  size  field
 *   0       1     version (AUDIO_FRAME_VERSION)
 *   1       1     reserved (0)
 *   2       2     sequence number, uint16 LE, wraps at 65536
 *   4       2     sample rate in Hz, uint16 LE (up to 48000 fits)
 *   6       2·n   PCM samples, int16 LE, mono
 *
 * int16 at 16 kHz mono = 32 KB/s per talker — half the size of float32 and
 * plenty for speech. The server never decodes frames; it only relays them.
 */

export const AUDIO_FRAME_VERSION = 1;
export const AUDIO_HEADER_BYTES = 6;

/** Requested capture rate. The device may deliver another rate; frames carry the actual one. */
export const AUDIO_SAMPLE_RATE = 16000;
/** 40 ms per frame at 16 kHz. */
export const AUDIO_FRAME_SAMPLES = 640;
/** Frames buffered before playback starts (~120 ms) to absorb network jitter. */
export const AUDIO_JITTER_FRAMES = 3;

export type AudioFrame = {
  seq: number;
  sampleRate: number;
  samples: Int16Array;
};

export function encodeAudioFrame({ seq, sampleRate, samples }: AudioFrame): ArrayBuffer {
  const buffer = new ArrayBuffer(AUDIO_HEADER_BYTES + samples.byteLength);
  const view = new DataView(buffer);
  view.setUint8(0, AUDIO_FRAME_VERSION);
  view.setUint8(1, 0);
  view.setUint16(2, seq & 0xffff, true);
  view.setUint16(4, sampleRate, true);
  new Int16Array(buffer, AUDIO_HEADER_BYTES).set(samples);
  return buffer;
}

/** Returns null for anything that isn't a well-formed frame of a known version. */
export function decodeAudioFrame(buffer: ArrayBuffer): AudioFrame | null {
  if (buffer.byteLength < AUDIO_HEADER_BYTES || (buffer.byteLength - AUDIO_HEADER_BYTES) % 2 !== 0) return null;
  const view = new DataView(buffer);
  if (view.getUint8(0) !== AUDIO_FRAME_VERSION) return null;
  const sampleRate = view.getUint16(4, true);
  if (sampleRate === 0) return null;
  return {
    seq: view.getUint16(2, true),
    sampleRate,
    // Header is 6 bytes, so the sample view is 2-byte aligned as Int16Array requires.
    samples: new Int16Array(buffer, AUDIO_HEADER_BYTES),
  };
}

/** Float samples in [-1, 1] (what the recorder delivers) → int16. */
export function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** int16 → float samples in [-1, 1] (what an AudioBuffer holds). */
export function int16ToFloat(input: Int16Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] / (input[i] < 0 ? 0x8000 : 0x7fff);
  return out;
}

/** True if sequence number `a` comes after `b`, allowing for uint16 wraparound. */
export function seqAfter(a: number, b: number): boolean {
  return ((a - b) & 0xffff) !== 0 && ((a - b) & 0xffff) < 0x8000;
}

/**
 * Streaming linear-interpolation resampler for mono float audio.
 *
 * Needed because react-native-audio-api's queue source node plays buffer
 * samples 1:1 at the context's rate (it ignores AudioBuffer.sampleRate), so
 * 16 kHz frames on a 48 kHz context would play 3× too fast. State carries
 * across calls, so chunk boundaries are seamless. Linear interpolation is
 * plenty for speech.
 */
export class LinearResampler {
  private readonly step: number;
  /** Next output position, in input samples, relative to the next chunk (−1 = previous chunk's last sample). */
  private pos = 0;
  private last = 0;

  constructor(
    readonly fromRate: number,
    readonly toRate: number,
  ) {
    this.step = fromRate / toRate;
  }

  process(input: Float32Array): Float32Array<ArrayBuffer> {
    const n = input.length;
    if (n === 0) return new Float32Array(0);
    if (this.fromRate === this.toRate) return Float32Array.from(input);

    let p = this.pos;
    const count = p > n - 1 ? 0 : Math.floor((n - 1 - p) / this.step) + 1;
    const out = new Float32Array(count);
    for (let k = 0; k < count; k++, p += this.step) {
      const i = Math.floor(p);
      const frac = p - i;
      const a = i < 0 ? this.last : input[i];
      const b = i + 1 < n ? input[i + 1] : a;
      out[k] = a + (b - a) * frac;
    }
    this.pos = p - n;
    this.last = input[n - 1];
    return out;
  }
}
