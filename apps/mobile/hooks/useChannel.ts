import { MicCapture } from "@/services/audio/capture";
import { getAudioContext } from "@/services/audio/context";
import { StreamPlayer } from "@/services/audio/player";
import { activateVoiceSession, ensureMicPermission } from "@/services/audio/session";
import { useConnection } from "@/services/connection";
import type { ClientId, Member } from "@walkie/shared";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Joins `channel` on the shared connection while mounted and leaves on
 * unmount. Tracks members and who holds the floor, and carries the audio:
 *
 * Talking (this phone): on press we send `talk-start` and start the mic
 * straight away, streaming each 40 ms frame as a binary message without
 * waiting for the grant. The server handles this socket's messages in order,
 * so it has already granted or denied the floor when the first frame
 * arrives, and drops frames from anyone who isn't the talker. No first
 * syllable lost to a round trip, no client-side buffering.
 *
 * Listening: frames from the current talker go into a StreamPlayer (jitter
 * buffer). `talk-ended` lets it play out what's buffered. Only members of
 * the channel receive audio — the overview never does.
 */
export function useChannel(channel: string, name: string) {
  const { status, selfId, addListener, addBinaryListener, joinChannel, leaveChannel, send, sendBinary } =
    useConnection();
  const [members, setMembers] = useState<Member[]>([]);
  const [talker, setTalker] = useState<ClientId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Refs: read from message handlers, which must not re-subscribe on every render.
  const selfIdRef = useRef(selfId);
  useEffect(() => {
    selfIdRef.current = selfId;
  }, [selfId]);

  const playerRef = useRef<StreamPlayer | null>(null);
  const captureRef = useRef<MicCapture | null>(null);
  const startingRef = useRef<Promise<void> | null>(null);
  /** True while the user is holding the talk button. */
  const holdingRef = useRef(false);

  // ---- Listening ----

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      const player: StreamPlayer = new StreamPlayer(getAudioContext(), undefined, () => {
        if (playerRef.current === player) playerRef.current = null;
      });
      playerRef.current = player;
    }
    return playerRef.current;
  }, []);

  /** "end" plays out what's buffered; "stop" cuts it off. */
  const releasePlayer = useCallback((how: "end" | "stop") => {
    const player = playerRef.current;
    playerRef.current = null;
    if (how === "end") player?.end();
    else player?.stop();
  }, []);

  // ---- Talking ----

  const stopCapture = useCallback(async () => {
    try {
      await startingRef.current;
    } catch {
      // start failed; already reported
    }
    const capture = captureRef.current;
    captureRef.current = null;
    await capture?.stop(); // may emit a last frame, which goes out before talk-end
  }, []);

  const startTalking = useCallback(() => {
    if (holdingRef.current) return;
    holdingRef.current = true;
    setMicError(null);
    send({ type: "talk-start" });

    const start = (async () => {
      if (!(await ensureMicPermission())) {
        throw new Error("Microphone access is off. Enable it in Settings to talk.");
      }
      await activateVoiceSession();
      // Released while we waited (e.g. the first-time permission prompt).
      if (!holdingRef.current) return;
      const capture = new MicCapture(sendBinary);
      captureRef.current = capture;
      await capture.start();
    })();
    startingRef.current = start;
    start.catch((e) => {
      setMicError(e instanceof Error ? e.message : String(e));
      captureRef.current = null;
      if (holdingRef.current) {
        holdingRef.current = false;
        send({ type: "talk-end" });
      }
    });
  }, [send, sendBinary]);

  const stopTalking = useCallback(async () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    await stopCapture();
    send({ type: "talk-end" });
  }, [send, stopCapture]);

  // ---- Channel membership and messages ----

  useEffect(() => {
    activateVoiceSession().catch(() => {}); // so incoming audio plays; no mic permission needed

    const removeListener = addListener((msg) => {
      switch (msg.type) {
        case "joined":
          if (msg.channel !== channel) return;
          setError(null);
          setTalker(msg.talker);
          return setMembers(msg.members);
        case "member-joined":
          return setMembers((m) => [...m.filter((x) => x.id !== msg.member.id), msg.member]);
        case "member-left":
          setTalker((t) => (t === msg.clientId ? null : t));
          return setMembers((m) => m.filter((x) => x.id !== msg.clientId));
        case "talk-started":
          setTalker(msg.clientId);
          if (msg.clientId !== selfIdRef.current) {
            releasePlayer("end"); // let any previous burst finish on its own
            getPlayer();
          }
          return;
        case "talk-ended":
          setTalker((t) => (t === msg.clientId ? null : t));
          if (msg.clientId !== selfIdRef.current) releasePlayer("end");
          return;
        case "talk-denied":
          // Someone else got the floor first; the server dropped our frames.
          holdingRef.current = false;
          stopCapture();
          return;
        case "error":
          return setError(msg.message);
      }
    });
    // A frame can arrive without a preceding talk-started if we joined
    // mid-transmission, so create the player on demand.
    const removeBinaryListener = addBinaryListener((data) => getPlayer().push(data));

    joinChannel(channel, name);
    return () => {
      holdingRef.current = false;
      stopCapture();
      releasePlayer("stop");
      leaveChannel(); // the server also releases our floor on leave
      removeBinaryListener();
      removeListener();
    };
  }, [channel, name, addListener, addBinaryListener, joinChannel, leaveChannel, getPlayer, releasePlayer, stopCapture]);

  // A dropped connection loses membership and the floor; the provider re-joins
  // on reconnect and the fresh `joined` message repopulates this.
  useEffect(() => {
    if (status !== "open") {
      setMembers([]);
      setTalker(null);
      holdingRef.current = false;
      stopCapture();
      releasePlayer("stop");
    }
  }, [status, stopCapture, releasePlayer]);

  return { status, error, micError, selfId, members, talker, startTalking, stopTalking };
}
