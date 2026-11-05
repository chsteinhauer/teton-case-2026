/**
 * WebSocket protocol between the mobile app and the server.
 *
 * Every message is JSON with a `type` discriminator, so both sides can
 * `switch (msg.type)` and get full type narrowing. Audio is not defined yet —
 * it will most likely travel as binary frames alongside these control
 * messages rather than as base64 inside JSON.
 */

export const DEFAULT_SERVER_PORT = 3000;
export const WS_PATH = "/ws";

export type ChannelId = string;
export type ClientId = string;

// ---- Channels (static definitions + live info over HTTP) ----

/** A channel as defined in the server's channel list. */
export type ChannelDef = {
  id: ChannelId;
  name: string;
  description?: string;
};

/** A channel's definition plus its live state. */
export type ChannelInfo = ChannelDef & {
  members: Member[];
  /** Who currently holds the floor, if anyone. */
  talker: ClientId | null;
};

export type ChannelsResponse = { channels: ChannelInfo[] };

// ---- Client → server ----

export type ClientMessage =
  | { type: "join"; channel: ChannelId; name: string }
  | { type: "leave" }
  /**
   * Receive a `channels` snapshot now and after every presence change in any
   * channel. Used by the channel overview; carries no audio.
   */
  | { type: "watch-channels" }
  | { type: "unwatch-channels" }
  /** Ask for the floor (push-to-talk pressed). */
  | { type: "talk-start" }
  /** Release the floor (push-to-talk released). */
  | { type: "talk-end" }
  | { type: "ping"; t: number };

// ---- Server → client ----

export type Member = { id: ClientId; name: string };

export type ServerMessage =
  | { type: "welcome"; clientId: ClientId }
  /** Snapshot of all channels, sent to clients that sent `watch-channels`. */
  | { type: "channels"; channels: ChannelInfo[] }
  | { type: "joined"; channel: ChannelId; members: Member[] }
  | { type: "member-joined"; member: Member }
  | { type: "member-left"; clientId: ClientId }
  /** Someone holds the floor. `clientId` may be yourself (grant). */
  | { type: "talk-started"; clientId: ClientId }
  | { type: "talk-ended"; clientId: ClientId }
  /** Floor request refused because someone else is talking. */
  | { type: "talk-denied"; heldBy: ClientId }
  | { type: "pong"; t: number }
  | { type: "error"; message: string };

// ---- Helpers ----

export function encode(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

/** Parse untrusted input. Returns null for anything that isn't a typed message. */
export function decode<T extends ClientMessage | ServerMessage>(raw: string): T | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string") {
      return value as T;
    }
  } catch {
    // fall through
  }
  return null;
}
