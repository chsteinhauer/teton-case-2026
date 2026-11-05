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

// ---- Client → server ----

export type ClientMessage =
  | { type: "join"; channel: ChannelId; name: string }
  | { type: "leave" }
  /** Ask for the floor (push-to-talk pressed). */
  | { type: "talk-start" }
  /** Release the floor (push-to-talk released). */
  | { type: "talk-end" }
  | { type: "ping"; t: number };

// ---- Server → client ----

export type Member = { id: ClientId; name: string };

export type ServerMessage =
  | { type: "welcome"; clientId: ClientId }
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
