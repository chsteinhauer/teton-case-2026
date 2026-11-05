import { AUDIO_FRAME_SAMPLES, AUDIO_SAMPLE_RATE, encodeAudioFrame, floatToInt16 } from "@walkie/shared";
import { AudioRecorder } from "react-native-audio-api";

export type CaptureInfo = {
  /** RMS level of the latest chunk, 0..1 — handy for a level meter. */
  level: number;
  /** Sample rate the device actually delivered. */
  sampleRate: number;
};

/**
 * Microphone → encoded audio frames (see packages/shared/src/audio.ts).
 * Each ~40 ms chunk from the recorder becomes one frame passed to `onFrame`.
 */
export class MicCapture {
  private recorder = new AudioRecorder();
  private seq = 0;

  constructor(
    private onFrame: (frame: ArrayBuffer) => void,
    private onInfo?: (info: CaptureInfo) => void,
  ) {}

  async start(): Promise<void> {
    this.seq = 0;
    const subscribed = this.recorder.onAudioReady(
      { sampleRate: AUDIO_SAMPLE_RATE, bufferLength: AUDIO_FRAME_SAMPLES, channelCount: 1 },
      ({ buffer }) => {
        const pcm = buffer.getChannelData(0);
        this.onFrame(encodeAudioFrame({ seq: this.seq++, sampleRate: buffer.sampleRate, samples: floatToInt16(pcm) }));
        if (this.onInfo) this.onInfo({ level: rms(pcm), sampleRate: buffer.sampleRate });
      },
    );
    if (subscribed.status === "error") throw new Error(subscribed.message);

    const started = await this.recorder.start();
    if (started.status === "error") {
      this.recorder.clearOnAudioReady();
      throw new Error(started.message);
    }
  }

  async stop(): Promise<void> {
    if (this.recorder.isRecording()) await this.recorder.stop();
    this.recorder.clearOnAudioReady();
  }
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}
