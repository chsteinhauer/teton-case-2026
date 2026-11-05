import {
  decode,
  encode,
  type ChannelDef,
  type ChannelId,
  type ChannelInfo,
  type ClientId,
  type ClientMessage,
  type Member,
  type ServerMessage,
} from "@walkie/shared";
import { randomUUID } from "node:crypto";
import type { RawData, WebSocket } from "ws";

/** Largest audio frame we relay: header + 100 ms at 48 kHz int16 is ~9.6 KB. */
const MAX_AUDIO_FRAME_BYTES = 16 * 1024;
/**
 * Skip a listener whose socket already has this much unsent data queued
 * (~250 ms of 16 kHz audio). For live voice a short dropout beats a delay
 * that keeps growing.
 */
const MAX_LISTENER_BACKLOG_BYTES = 8 * 1024;

type Client = {
  id: ClientId;
  name: string;
  socket: WebSocket;
  channel: ChannelId | null;
};

type Channel = {
  def: ChannelDef;
  members: Set<Client>;
  /** Half-duplex: at most one talker per channel. */
  talker: ClientId | null;
};

/**
 * In-memory channel membership and floor control. Single process only.
 * The set of channels is fixed at startup (see channel-defs.ts); joining an
 * unknown channel is an error.
 */
export class ChannelHub {
  private channels = new Map<ChannelId, Channel>();
  /** Clients watching the overview: they get a snapshot on every presence change. */
  private watchers = new Set<Client>();
  private audio = { relayed: 0, droppedNotTalker: 0, droppedBacklog: 0 };

  constructor(defs: ChannelDef[]) {
    for (const def of defs) this.channels.set(def.id, { def, members: new Set(), talker: null });
  }

  connect(socket: WebSocket) {
    const client: Client = { id: randomUUID(), name: "anonymous", socket, channel: null };
    this.send(client, { type: "welcome", clientId: client.id });

    socket.on("message", (data, isBinary) => {
      if (isBinary) return this.relayAudio(client, data);
      const msg = decode<ClientMessage>(data.toString());
      if (!msg) return this.send(client, { type: "error", message: "malformed message" });
      this.handle(client, msg);
    });
    socket.on("close", () => {
      this.watchers.delete(client);
      this.leave(client);
    });
  }

  list(): ChannelInfo[] {
    return [...this.channels.values()].map(({ def, members, talker }) => ({
      ...def,
      members: [...members].map(toMember),
      talker,
    }));
  }

  stats() {
    let clients = 0;
    for (const ch of this.channels.values()) clients += ch.members.size;
    return { channels: this.channels.size, clients, audio: this.audio };
  }

  private handle(client: Client, msg: ClientMessage) {
    switch (msg.type) {
      case "join":
        return this.join(client, msg.channel, msg.name);
      case "leave":
        return this.leave(client);
      case "watch-channels":
        this.watchers.add(client);
        return this.send(client, { type: "channels", channels: this.list() });
      case "unwatch-channels":
        this.watchers.delete(client);
        return;
      case "talk-start":
        return this.talkStart(client);
      case "talk-end":
        return this.talkEnd(client);
      case "ping":
        return this.send(client, { type: "pong", t: msg.t });
    }
  }

  private join(client: Client, channelId: ChannelId, name: string) {
    const channel = this.channels.get(channelId);
    if (!channel) return this.send(client, { type: "error", message: `unknown channel: ${channelId}` });

    this.leave(client);
    client.name = name;
    client.channel = channelId;
    channel.members.add(client);

    this.send(client, {
      type: "joined",
      channel: channelId,
      members: [...channel.members].map(toMember),
      talker: channel.talker,
    });
    this.broadcast(channel, { type: "member-joined", member: toMember(client) }, client);
    this.notifyWatchers();
  }

  private leave(client: Client) {
    const channel = client.channel ? this.channels.get(client.channel) : undefined;
    if (!channel) return;

    this.talkEnd(client);
    channel.members.delete(client);
    this.broadcast(channel, { type: "member-left", clientId: client.id });
    client.channel = null;
    this.notifyWatchers();
  }

  private talkStart(client: Client) {
    const channel = client.channel ? this.channels.get(client.channel) : undefined;
    if (!channel) return this.send(client, { type: "error", message: "join a channel first" });

    if (channel.talker && channel.talker !== client.id) {
      return this.send(client, { type: "talk-denied", heldBy: channel.talker });
    }
    if (channel.talker === client.id) return; // already holds the floor
    channel.talker = client.id;
    this.broadcast(channel, { type: "talk-started", clientId: client.id });
    this.notifyWatchers();
  }

  private talkEnd(client: Client) {
    const channel = client.channel ? this.channels.get(client.channel) : undefined;
    if (!channel || channel.talker !== client.id) return;
    channel.talker = null;
    this.broadcast(channel, { type: "talk-ended", clientId: client.id });
    this.notifyWatchers();
  }

  /**
   * Push a full snapshot to overview watchers. Snapshots (not deltas) keep the
   * client trivially correct; at a handful of channels the payload is tiny.
   */
  private notifyWatchers() {
    if (this.watchers.size === 0) return;
    const msg: ServerMessage = { type: "channels", channels: this.list() };
    for (const watcher of this.watchers) this.send(watcher, msg);
  }

  /**
   * Forward an audio frame from the floor holder to the rest of its channel.
   * Frames from anyone else are dropped, which makes optimistic sending safe:
   * a client may stream right after `talk-start`, and the server (processing
   * that socket's messages in order) has already granted or denied it.
   * The server never decodes audio; overview watchers never receive it.
   */
  private relayAudio(client: Client, data: RawData) {
    const channel = client.channel ? this.channels.get(client.channel) : undefined;
    if (!channel || channel.talker !== client.id) {
      this.audio.droppedNotTalker++;
      return;
    }
    const frame = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
    if (frame.byteLength > MAX_AUDIO_FRAME_BYTES) return;

    for (const member of channel.members) {
      if (member === client || member.socket.readyState !== member.socket.OPEN) continue;
      if (member.socket.bufferedAmount > MAX_LISTENER_BACKLOG_BYTES) {
        this.audio.droppedBacklog++;
        continue;
      }
      member.socket.send(frame, { binary: true });
      this.audio.relayed++;
    }
  }

  private send(client: Client, msg: ServerMessage) {
    if (client.socket.readyState === client.socket.OPEN) client.socket.send(encode(msg));
  }

  private broadcast(channel: Channel, msg: ServerMessage, except?: Client) {
    for (const member of channel.members) if (member !== except) this.send(member, msg);
  }
}

function toMember(c: Client): Member {
  return { id: c.id, name: c.name };
}
