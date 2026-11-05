import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { MicCapture, type CaptureInfo } from "@/services/audio/capture";
import { getAudioContext } from "@/services/audio/context";
import { StreamPlayer, type PlayerStats } from "@/services/audio/player";
import { activateVoiceSession, ensureMicPermission } from "@/services/audio/session";
import { AUDIO_FRAME_SAMPLES, AUDIO_SAMPLE_RATE } from "@walkie/shared";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Dev-only audio loopback: mic → int16 frames → decode → StreamPlayer →
 * speaker, i.e. the full streaming path minus the network.
 *
 *   Replay: record while held, then stream the frames back at real-time
 *           pace (one per 40 ms) on release. No feedback, works anywhere.
 *   Live:   hear yourself while holding. Use headphones.
 */
type Mode = "replay" | "live";
type Phase = "idle" | "recording" | "playing";

const FRAME_MS = (AUDIO_FRAME_SAMPLES / AUDIO_SAMPLE_RATE) * 1000;

export default function Loopback() {
  const [mode, setMode] = useState<Mode>("replay");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<CaptureInfo | null>(null);
  const [framesCaptured, setFramesCaptured] = useState(0);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [contextRate, setContextRate] = useState<number | null>(null);

  const captureRef = useRef<MicCapture | null>(null);
  const startingRef = useRef<Promise<void> | null>(null);
  const playerRef = useRef<StreamPlayer | null>(null);
  const recordedRef = useRef<ArrayBuffer[]>([]);
  // Counted in a ref and shown by the poller: a state update per frame
  // re-renders 25×/s and competes with audio work on the JS thread.
  const framesCapturedRef = useRef(0);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll player stats while something is happening.
  useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => {
      setFramesCaptured(framesCapturedRef.current);
      if (playerRef.current) setStats({ ...playerRef.current.stats });
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => stopEverything(), []);

  function stopEverything() {
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    replayTimerRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
  }

  function newPlayer() {
    const ctx = getAudioContext();
    setContextRate(ctx.sampleRate);
    const player = new StreamPlayer(ctx, undefined, () => {
      setStats({ ...player.stats });
      setPhase("idle");
    });
    playerRef.current = player;
    return player;
  }

  async function onPressIn() {
    setError(null);
    stopEverything();
    recordedRef.current = [];
    framesCapturedRef.current = 0;
    setFramesCaptured(0);
    setStats(null);

    const start = (async () => {
      if (!(await ensureMicPermission())) throw new Error("Microphone permission denied");
      await activateVoiceSession();

      const player = mode === "live" ? newPlayer() : null;
      const capture = new MicCapture(
        (frame) => {
          framesCapturedRef.current++;
          if (player) player.push(frame);
          else recordedRef.current.push(frame);
        },
        setInfo,
      );
      captureRef.current = capture;
      await capture.start();
      setPhase("recording");
    })();
    startingRef.current = start;
    start.catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
      stopEverything();
      setPhase("idle");
    });
  }

  async function onPressOut() {
    try {
      await startingRef.current; // release can arrive before start() resolved
    } catch {
      return; // already reported
    }
    await captureRef.current?.stop();
    captureRef.current = null;
    setInfo((i) => (i ? { ...i, level: 0 } : i));

    if (mode === "live") {
      playerRef.current?.end();
      setPhase(playerRef.current ? "playing" : "idle");
      return;
    }

    // Replay: feed the recording back at real-time pace, like a network would.
    // Clock-based catch-up rather than one frame per tick: JS timers fire
    // late, and one-per-tick would feed slower than real time and drain the
    // jitter buffer.
    const frames = recordedRef.current;
    setFramesCaptured(framesCapturedRef.current);
    if (frames.length === 0) return setPhase("idle");
    const player = newPlayer();
    setPhase("playing");
    let i = 0;
    const t0 = Date.now();
    replayTimerRef.current = setInterval(() => {
      const due = Math.min(frames.length, Math.floor((Date.now() - t0) / FRAME_MS) + 1);
      while (i < due) player.push(frames[i++]);
      if (i < frames.length) return;
      clearInterval(replayTimerRef.current!);
      replayTimerRef.current = null;
      player.end();
    }, FRAME_MS / 4);
  }

  const recording = phase === "recording";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Mic → int16 frames → decode → queue → speaker. The full streaming path without the network.
      </Text>

      <View style={styles.segment}>
        {(["replay", "live"] as const).map((m) => (
          <Pressable
            key={m}
            disabled={phase !== "idle"}
            onPress={() => setMode(m)}
            style={[styles.segmentItem, mode === m && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
              {m === "replay" ? "Replay on release" : "Live (headphones!)"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.min(100, (info?.level ?? 0) * 400)}%` }]} />
      </View>

      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={phase === "playing"}
        style={[styles.button, recording && styles.buttonActive, phase === "playing" && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {recording ? "Recording…" : phase === "playing" ? "Playing…" : "Hold to record"}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.stats}>
        <Stat label="Frames captured" value={framesCaptured} />
        <Stat label="Mic sample rate" value={info ? `${info.sampleRate} Hz` : "–"} />
        <Stat label="Playback context rate" value={contextRate ? `${contextRate} Hz` : "–"} />
        <Stat label="Frames received / played" value={stats ? `${stats.received} / ${stats.played}` : "–"} />
        <Stat label="Queued now" value={stats ? `${stats.queued} (${Math.round(stats.queued * FRAME_MS)} ms)` : "–"} />
        <Stat label="Underruns" value={stats?.underruns ?? "–"} />
        <Stat label="Dropped" value={stats?.dropped ?? "–"} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },
  intro: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  segment: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 8, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  meter: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: "hidden" },
  meterFill: { height: "100%", backgroundColor: colors.success },
  button: {
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: { backgroundColor: colors.danger },
  buttonDisabled: { backgroundColor: colors.surfaceRaised },
  buttonText: { fontFamily: fonts.medium, fontSize: 17, color: colors.textOnAccent },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger, textAlign: "center" },
  stats: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  statValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
