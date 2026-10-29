import { Server } from "colyseus";
import { loadEnv } from "./load-env";
import { GameRoom } from "./game-room";

// Privy and holdings settings live in .env.local, which tsx doesn't load.
loadEnv();

const port = Number(process.env.GAME_SERVER_PORT) || 2567;

const server = new Server();
server.define("game", GameRoom);
server.listen(port).then(() => {
  console.log(`[Server] Listening on port ${port}`);
});
