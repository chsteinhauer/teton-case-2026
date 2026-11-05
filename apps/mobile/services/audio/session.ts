import { AudioManager } from "react-native-audio-api";

let configured = false;

/**
 * Configure the OS audio session for push-to-talk. Idempotent.
 *
 * iOS: playAndRecord so we can capture and play in one session; voiceChat
 * mode enables Apple's voice processing (echo cancellation, AGC);
 * defaultToSpeaker because playAndRecord otherwise routes to the quiet
 * earpiece; allowBluetoothHFP so headsets work as mic + speaker.
 */
export async function activateVoiceSession(): Promise<void> {
  if (!configured) {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });
    configured = true;
  }
  await AudioManager.setAudioSessionActivity(true);
}

/** Ask for microphone access if needed. Resolves true when granted. */
export async function ensureMicPermission(): Promise<boolean> {
  let status = await AudioManager.checkRecordingPermissions();
  if (status !== "Granted") status = await AudioManager.requestRecordingPermissions();
  return status === "Granted";
}
