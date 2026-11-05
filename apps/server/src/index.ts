import { DEFAULT_SERVER_PORT, WS_PATH } from "@walkie/shared";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { ChannelHub } from "./channels";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const hub = new ChannelHub();

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...hub.stats() }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http, path: WS_PATH });
wss.on("connection", (socket) => hub.connect(socket));

// 0.0.0.0 so phones on the same Wi-Fi can reach it, not just localhost.
http.listen(port, "0.0.0.0", () => {
  console.log(`[server] http://localhost:${port}/health  ws://localhost:${port}${WS_PATH}`);
});
