const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const GameRules = require("../shared/gameRules.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../public")));
app.use("/shared", express.static(path.join(__dirname, "../shared")));

// Single in-memory match. players maps socket.id -> "black" | "white",
// which is the server's own record of who is who -- the client never gets
// to declare its color, so a modified client-side script cannot claim to
// be the other player.
function freshGame() {
  return {
    board: GameRules.createEmptyBoard(),
    currentTurn: "black",
    gameOver: false,
    winner: null,
    players: {}, // socket.id -> "black" | "white"
  };
}

let game = freshGame();

function colorOf(socketId) {
  return game.players[socketId] || null;
}

function assignColor(socketId) {
  const taken = new Set(Object.values(game.players));
  if (!taken.has("black")) return "black";
  if (!taken.has("white")) return "white";
  return null; // both slots full -> spectator
}

function publicState() {
  return {
    board: game.board,
    currentTurn: game.currentTurn,
    gameOver: game.gameOver,
    winner: game.winner,
    boardSize: GameRules.BOARD_SIZE,
    playerCount: Object.keys(game.players).length,
  };
}

io.on("connection", (socket) => {
  const color = assignColor(socket.id);
  if (color) {
    game.players[socket.id] = color;
  }
  socket.emit("init", {
    color, // null means spectator (room already has two players)
    ...publicState(),
  });

  socket.broadcast.emit("presence", {
    message: color ? `${color} player joined.` : "A spectator joined.",
    connected: Object.keys(game.players).length,
  });

  socket.on("placeStone", ({ row, col } = {}) => {
    const myColor = colorOf(socket.id);

    if (!myColor) {
      socket.emit("moveRejected", { reason: "You are spectating this game." });
      return;
    }
    if (game.gameOver) {
      socket.emit("moveRejected", { reason: "The game is already over." });
      return;
    }
    if (myColor !== game.currentTurn) {
      socket.emit("moveRejected", { reason: "It is not your turn." });
      return;
    }
    if (!GameRules.isValidMove(game.board, row, col)) {
      socket.emit("moveRejected", { reason: "That intersection is not a legal move." });
      return;
    }

    game.board[row][col] = myColor;
    const won = GameRules.checkWin(game.board, row, col, myColor);

    if (won) {
      game.gameOver = true;
      game.winner = myColor;
    } else {
      game.currentTurn = myColor === "black" ? "white" : "black";
    }

    io.emit("stonePlaced", {
      row,
      col,
      color: myColor,
      currentTurn: game.currentTurn,
      gameOver: game.gameOver,
      winner: game.winner,
    });
  });

  socket.on("restartGame", () => {
    const myColor = colorOf(socket.id);
    if (!myColor) return; // spectators cannot restart
    if (!game.gameOver) return;

    const players = game.players;
    game = freshGame();
    game.players = players;

    io.emit("gameReset", publicState());
  });

  socket.on("disconnect", () => {
    const wasPlayer = Boolean(colorOf(socket.id));
    delete game.players[socket.id];

    if (wasPlayer) {
      // A player leaving mid-match makes the board meaningless; reset it
      // so the next person to connect gets a clean game.
      game = freshGame();
      io.emit("opponentLeft", { message: "A player disconnected. The game has been reset." });
      io.emit("gameReset", publicState());
    }
  });
});

server.listen(PORT, () => {
  console.log(`Five-in-a-Row server listening on http://localhost:${PORT}`);
});