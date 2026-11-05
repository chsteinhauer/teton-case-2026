# Walkie Talkie

Push-to-talk voice between phones: hold the button, talk, and everyone on the channel hears you. Only one person can talk at a time per channel, like a real walkie-talkie.

```
apps/
  mobile/      Expo (React Native) app: iOS + Android
  server/      Node + TypeScript WebSocket server
packages/
  shared/      Wire protocol (message types) used by both
```

## Quick start

```bash
npm install            # once, from the repo root (npm workspaces)

npm run server         # terminal 1: server on :3000 (auto-restarts on change)
npm run ios            # terminal 2: build + run on the iOS simulator
npm run android        # …or on a USB-connected Android phone
```

Phones must be on the same Wi-Fi as the Mac. The app finds the server automatically through the Metro host address. See [apps/mobile/README.md](apps/mobile/README.md) for device setup.

Checks: `npm run typecheck`, `npm run lint`.

## Architecture

```
 ┌──────────┐   WebSocket (JSON control msgs)   ┌──────────────┐
 │  mobile  │ ────────────────────────────────▶ │    server    │
 │ (Expo)   │ ◀──────────────────────────────── │ ChannelHub   │
 └──────────┘                                   │  channels    │
 ┌──────────┐                                   │  floor ctrl  │
 │  mobile  │ ◀───────────────────────────────▶ │              │
 └──────────┘                                   └──────────────┘
```

- **Protocol** ([packages/shared/src/protocol.ts](packages/shared/src/protocol.ts)): JSON messages with a `type` discriminator. The app and the server import the same TypeScript union types, so a protocol change fails the type check on both sides.
- **Server** ([apps/server/src/channels.ts](apps/server/src/channels.ts)): keeps channel membership in memory and runs floor control. `talk-start` is granted only when the channel is free; otherwise the server replies `talk-denied`. The floor is released on `talk-end`, on leave and on disconnect.
- **Mobile** ([apps/mobile/hooks/useChannel.ts](apps/mobile/hooks/useChannel.ts)): one WebSocket per app, automatic reconnect, and the members and current talker exposed as React state. The push-to-talk button is on the Home screen.

### Status

| Piece | State |
|-------|-------|
| Channels, presence, floor control | Done |
| Audio capture / playback | Not started |
| Audio transport | Not started (see below) |

## Decisions

- **Monorepo with npm workspaces.** One install, one PR for protocol changes, shared types without publishing a package. Expo SDK 58 detects workspaces automatically, so Metro needs no custom config.
- **WebSockets for signalling.** Plain WebSockets cover everything up to audio: they're bidirectional, low latency and supported natively in React Native and Node.
- **Server-side floor control.** The server is the single source of truth for who is talking, which avoids two people grabbing the floor at once.
- **Shared package consumed as TypeScript source.** It has no build step: Metro and `tsx` both compile it directly.
- **Expo development build, not Expo Go.** Audio will need native modules.

_Open question: audio transport. One option is binary WebSocket frames relayed by the server, which is simple and works through NAT. The other is WebRTC, which has lower latency and is peer-to-peer but needs TURN/SFU infrastructure._

## Scaling concept

The current server is a single process with in-memory state. That's enough for a demo. To scale it:

1. **Horizontal WebSocket nodes behind a load balancer.** Connections are long-lived, so the load balancer needs WebSocket support. Sticky sessions aren't required once state moves out of the process.
2. **Shared state in Redis.** Channel membership, and the floor lock as `SET channel:talker <id> NX PX <ttl>`, so only one talker wins across all nodes.
3. **Fan-out with Redis pub/sub (or NATS)** per channel. Each node relays to its own local sockets.
4. **Audio** moves to a media tier (an SFU) as volume grows, so the signalling nodes stay lightweight.
5. **Floor lock with a TTL and heartbeat**, so a crashed client can't hold the channel forever.
