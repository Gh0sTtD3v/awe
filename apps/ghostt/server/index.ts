import { Server, WebSocketTransport } from "colyseus";
import { loadEnv } from "./load-env";
import { GameRoom } from "./game-room";
import { DEBUG_FRAME_MAX_BYTES } from "../shared/messages";

// Privy and holdings settings live in .env.local, which tsx doesn't load.
loadEnv();

const port = Number(process.env.GAME_SERVER_PORT) || 2567;

// Colyseus caps a websocket message at 4 KB by default; debug-recording
// webcam frames (JPEG, sent as binary) are larger. Leave headroom for framing.
const server = new Server({
  transport: new WebSocketTransport({ maxPayload: DEBUG_FRAME_MAX_BYTES + 16 * 1024 }),
});
server.define("game", GameRoom);
server.listen(port).then(() => {
  console.log(`[Server] Listening on port ${port}`);
});
