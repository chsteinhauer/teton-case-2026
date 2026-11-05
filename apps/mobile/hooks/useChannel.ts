import { SERVER_WS_URL } from "@/services/server";
import { decode, encode, type ClientId, type ClientMessage, type Member, type ServerMessage } from "@walkie/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "open" | "closed";

/**
 * Connects to the server, joins `channel`, and tracks members and who holds
 * the floor. Reconnects with a fixed delay when the socket drops.
 */
export function useChannel(channel: string, name: string) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [selfId, setSelfId] = useState<ClientId | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [talker, setTalker] = useState<ClientId | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(SERVER_WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        ws.send(encode({ type: "join", channel, name }));
      };
      ws.onmessage = (event) => {
        const msg = decode<ServerMessage>(String(event.data));
        if (!msg) return;
        switch (msg.type) {
          case "welcome":
            return setSelfId(msg.clientId);
          case "joined":
            return setMembers(msg.members);
          case "member-joined":
            return setMembers((m) => [...m, msg.member]);
          case "member-left":
            setTalker((t) => (t === msg.clientId ? null : t));
            return setMembers((m) => m.filter((x) => x.id !== msg.clientId));
          case "talk-started":
            return setTalker(msg.clientId);
          case "talk-ended":
            return setTalker((t) => (t === msg.clientId ? null : t));
        }
      };
      ws.onclose = () => {
        setStatus("closed");
        setMembers([]);
        setTalker(null);
        if (!disposed) retry = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
  }, [channel, name]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(encode(msg));
  }, []);

  const startTalking = useCallback(() => send({ type: "talk-start" }), [send]);
  const stopTalking = useCallback(() => send({ type: "talk-end" }), [send]);

  return { status, selfId, members, talker, startTalking, stopTalking };
}
