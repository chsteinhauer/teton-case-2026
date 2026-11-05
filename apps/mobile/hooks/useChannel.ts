import { useConnection } from "@/services/connection";
import type { ClientId, Member } from "@walkie/shared";
import { useCallback, useEffect, useState } from "react";

/**
 * Joins `channel` on the shared connection while mounted and leaves on
 * unmount. Tracks members and who holds the floor. (Audio will flow only to
 * joined members — the overview never receives it.)
 */
export function useChannel(channel: string, name: string) {
  const { status, selfId, addListener, joinChannel, leaveChannel, send } = useConnection();
  const [members, setMembers] = useState<Member[]>([]);
  const [talker, setTalker] = useState<ClientId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const removeListener = addListener((msg) => {
      switch (msg.type) {
        case "joined":
          if (msg.channel !== channel) return;
          setError(null);
          return setMembers(msg.members);
        case "member-joined":
          return setMembers((m) => [...m.filter((x) => x.id !== msg.member.id), msg.member]);
        case "member-left":
          setTalker((t) => (t === msg.clientId ? null : t));
          return setMembers((m) => m.filter((x) => x.id !== msg.clientId));
        case "talk-started":
          return setTalker(msg.clientId);
        case "talk-ended":
          return setTalker((t) => (t === msg.clientId ? null : t));
        case "error":
          return setError(msg.message);
      }
    });
    joinChannel(channel, name);
    return () => {
      leaveChannel();
      removeListener();
    };
  }, [channel, name, addListener, joinChannel, leaveChannel]);

  // A dropped connection loses membership; the provider re-joins on reconnect
  // and the fresh `joined` message repopulates this.
  useEffect(() => {
    if (status !== "open") {
      setMembers([]);
      setTalker(null);
    }
  }, [status]);

  const startTalking = useCallback(() => send({ type: "talk-start" }), [send]);
  const stopTalking = useCallback(() => send({ type: "talk-end" }), [send]);

  return { status, error, selfId, members, talker, startTalking, stopTalking };
}
