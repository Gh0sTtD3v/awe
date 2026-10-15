import { Server } from "colyseus";
import { loadEnv } from "./load-env";
import { GameRoom } from "./game-room";

// Privy and holdings settings live in .env.local, which tsx doesn't load.
loadEnv();

const server = new Server();
server.define("game", GameRoom);
server.listen(2567).then(() => {
  console.log("[Server] Listening on port 2567");
});
