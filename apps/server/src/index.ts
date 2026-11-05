import { DEFAULT_SERVER_PORT, WS_PATH, type ChannelsResponse } from "@walkie/shared";
import { createServer, type ServerResponse } from "node:http";
import { WebSocketServer } from "ws";
import { loadChannelDefs } from "./channel-defs";
import { ChannelHub } from "./channels";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const hub = new ChannelHub(loadChannelDefs());

function json(res: ServerResponse, body: unknown) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const http = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") return json(res, { ok: true, ...hub.stats() });
  if (req.method === "GET" && req.url === "/channels") {
    return json(res, { channels: hub.list() } satisfies ChannelsResponse);
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http, path: WS_PATH });
wss.on("connection", (socket) => hub.connect(socket));

// 0.0.0.0 so phones on the same Wi-Fi can reach it, not just localhost.
http.listen(port, "0.0.0.0", () => {
  console.log(`[server] http://localhost:${port}/channels  ws://localhost:${port}${WS_PATH}`);
});
