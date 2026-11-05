import { SERVER_WS_URL } from "@/services/server";
import {
  decode,
  encode,
  type ChannelId,
  type ClientId,
  type ClientMessage,
  type ServerMessage,
} from "@walkie/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "open" | "closed";

type Listener = (msg: ServerMessage) => void;
type BinaryListener = (data: ArrayBuffer) => void;

type ConnectionApi = {
  status: ConnectionStatus;
  /** Server-assigned id for this connection; changes after a reconnect. */
  selfId: ClientId | null;
  /** Receive every server message. Returns an unsubscribe function. */
  addListener: (listener: Listener) => () => void;
  /** Receive binary frames (audio). Returns an unsubscribe function. */
  addBinaryListener: (listener: BinaryListener) => () => void;
  /** Send a binary frame (audio). Dropped silently if the socket isn't open. */
  sendBinary: (data: ArrayBuffer) => void;
  /** Subscribe to channel overview snapshots. Returns an unsubscribe function. */
  watchChannels: () => () => void;
  joinChannel: (channel: ChannelId, name: string) => void;
  leaveChannel: () => void;
  send: (msg: ClientMessage) => void;
};

const ConnectionContext = createContext<ConnectionApi | null>(null);

const RECONNECT_DELAY_MS = 2000;

/**
 * One WebSocket for the whole app.
 *
 * Screens declare what they want (watch the overview, be in a channel) and
 * the provider remembers it, so after a reconnect it re-sends `watch-channels`
 * and re-joins the channel without the screens doing anything.
 */
export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [selfId, setSelfId] = useState<ClientId | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<Listener>());
  const binaryListenersRef = useRef(new Set<BinaryListener>());
  // Desired state, replayed on every (re)connect.
  const watchCountRef = useRef(0);
  const joinedRef = useRef<{ channel: ChannelId; name: string } | null>(null);

  const send = useCallback((msg: ClientMessage) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(encode(msg));
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(data);
  }, []);

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(SERVER_WS_URL);
      ws.binaryType = "arraybuffer";
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        if (watchCountRef.current > 0) ws.send(encode({ type: "watch-channels" }));
        const joined = joinedRef.current;
        if (joined) ws.send(encode({ type: "join", channel: joined.channel, name: joined.name }));
      };
      ws.onmessage = (event) => {
        if (typeof event.data !== "string") {
          for (const listener of binaryListenersRef.current) listener(event.data as ArrayBuffer);
          return;
        }
        const msg = decode<ServerMessage>(String(event.data));
        if (!msg) return;
        if (msg.type === "welcome") setSelfId(msg.clientId);
        for (const listener of listenersRef.current) listener(msg);
      };
      ws.onclose = () => {
        setStatus("closed");
        setSelfId(null);
        if (!disposed) retry = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
  }, []);

  const addListener = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const addBinaryListener = useCallback((listener: BinaryListener) => {
    binaryListenersRef.current.add(listener);
    return () => {
      binaryListenersRef.current.delete(listener);
    };
  }, []);

  const watchChannels = useCallback(() => {
    watchCountRef.current += 1;
    if (watchCountRef.current === 1) send({ type: "watch-channels" });
    return () => {
      watchCountRef.current -= 1;
      if (watchCountRef.current === 0) send({ type: "unwatch-channels" });
    };
  }, [send]);

  const joinChannel = useCallback(
    (channel: ChannelId, name: string) => {
      joinedRef.current = { channel, name };
      send({ type: "join", channel, name });
    },
    [send],
  );

  const leaveChannel = useCallback(() => {
    joinedRef.current = null;
    send({ type: "leave" });
  }, [send]);

  const api = useMemo(
    () => ({
      status,
      selfId,
      addListener,
      addBinaryListener,
      watchChannels,
      joinChannel,
      leaveChannel,
      send,
      sendBinary,
    }),
    [status, selfId, addListener, addBinaryListener, watchChannels, joinChannel, leaveChannel, send, sendBinary],
  );

  return <ConnectionContext.Provider value={api}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionApi {
  const api = useContext(ConnectionContext);
  if (!api) throw new Error("useConnection must be used inside <ConnectionProvider>");
  return api;
}
