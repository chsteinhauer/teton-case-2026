import { AUDIO_JITTER_FRAMES, LinearResampler, decodeAudioFrame, int16ToFloat, seqAfter } from "@walkie/shared";
import type { AudioBuffer, AudioBufferQueueSourceNode, AudioContext } from "react-native-audio-api";

export type PlayerStats = {
  received: number;
  played: number;
  /** Times the queue ran dry mid-stream and playback had to re-buffer. */
  underruns: number;
  /** Frames dropped as malformed, duplicate or out of order. */
  dropped: number;
  /** Frames waiting to be heard (pre-buffer + queue). */
  queued: number;
};

/**
 * Plays a live stream of audio frames for one talk burst (a jitter buffer).
 *
 * - Frames are held until AUDIO_JITTER_FRAMES (~120 ms) have arrived, then
 *   handed to a queue source node in one go.
 * - One node lives for the whole burst. When its queue is empty it outputs
 *   silence and resumes as soon as buffers arrive (verified in the library's
 *   C++), so an underrun never needs a new node.
 * - On an underrun we re-buffer: hold frames until the pre-buffer is full
 *   again, then flush, so playback resumes with headroom instead of
 *   stuttering frame by frame.
 *
 * Call `end()` when the talker releases to play out what's left, or `stop()`
 * to cut it off.
 */
export class StreamPlayer {
  private node: AudioBufferQueueSourceNode | null = null;
  /** Frames held while (re-)buffering. */
  private pending: AudioBuffer[] = [];
  private buffering = true;
  /** Buffers handed to the node that haven't finished playing (JS-side count). */
  private inQueue = 0;
  private lastSeq: number | null = null;
  private resampler: LinearResampler | null = null;
  private ending = false;
  private closed = false;

  readonly stats: PlayerStats = { received: 0, played: 0, underruns: 0, dropped: 0, queued: 0 };

  constructor(
    private ctx: AudioContext,
    private prebufferFrames = AUDIO_JITTER_FRAMES,
    private onDone?: () => void,
  ) {}

  push(data: ArrayBuffer): void {
    if (this.closed) return;
    const frame = decodeAudioFrame(data);
    if (!frame || (this.lastSeq !== null && !seqAfter(frame.seq, this.lastSeq))) {
      this.stats.dropped++;
      return;
    }
    this.lastSeq = frame.seq;
    this.stats.received++;

    // The queue node plays samples 1:1 at the context rate and ignores the
    // buffer's own rate, so convert to the context rate ourselves.
    if (!this.resampler || this.resampler.fromRate !== frame.sampleRate) {
      this.resampler = new LinearResampler(frame.sampleRate, this.ctx.sampleRate);
    }
    const samples = this.resampler.process(int16ToFloat(frame.samples));
    if (samples.length === 0) return;
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.copyToChannel(samples, 0);

    if (this.buffering) {
      this.pending.push(buffer);
      if (this.pending.length >= this.prebufferFrames) this.flush();
    } else {
      this.enqueue(buffer);
    }
    this.updateQueued();
  }

  /** Talker released: play out everything buffered, then finish. */
  end(): void {
    if (this.closed) return;
    this.ending = true;
    if (this.pending.length > 0) this.flush(); // don't wait for a full pre-buffer at the end
    if (this.inQueue === 0) this.finish();
  }

  /** Stop immediately and drop anything buffered. */
  stop(): void {
    this.pending = [];
    this.finish();
  }

  /** Hand all pending frames to the node, starting it on first use. */
  private flush() {
    const isFirst = this.node === null;
    if (isFirst) this.node = this.createNode();
    for (const buffer of this.pending) this.enqueue(buffer);
    this.pending = [];
    this.buffering = false;
    if (isFirst) {
      // Explicit args: in react-native-audio-api 0.13.6 start() defaults
      // offset to -1 and then rejects its own default with a RangeError.
      this.node!.start(0, 0);
    }
  }

  private createNode(): AudioBufferQueueSourceNode {
    const node = this.ctx.createBufferQueueSource({ pitchCorrection: false });
    node.connect(this.ctx.destination);
    node.onBufferEnded = () => {
      if (this.closed) return;
      this.inQueue = Math.max(0, this.inQueue - 1);
      this.stats.played++;
      this.updateQueued();
      // Use our own count rather than isLastBufferInQueue: that flag is
      // computed on the audio thread and may predate buffers JS just added.
      if (this.inQueue > 0) return;

      if (this.ending) {
        if (this.pending.length === 0) this.finish();
      } else if (!this.buffering) {
        this.stats.underruns++;
        this.buffering = true; // collect a fresh pre-buffer; the node idles silently meanwhile
      }
    };
    return node;
  }

  /** Only called once a node exists (from flush, or after it while not buffering). */
  private enqueue(buffer: AudioBuffer) {
    this.node!.enqueueBuffer(buffer);
    this.inQueue++;
  }

  private updateQueued() {
    this.stats.queued = this.pending.length + this.inQueue;
  }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    const node = this.node;
    this.node = null;
    if (node) {
      node.onBufferEnded = null;
      try {
        node.stop();
      } catch {
        // already stopped
      }
      node.disconnect();
    }
    this.inQueue = 0;
    this.updateQueued();
    this.onDone?.();
  }
}
