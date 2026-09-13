(function () {
  const socket = io();

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const presenceEl = document.getElementById("presence");
  const restartBtn = document.getElementById("restartBtn");

  const MARGIN = 30;
  let boardSize = GameRules.BOARD_SIZE;
  let cellSize = (canvas.width - MARGIN * 2) / (boardSize - 1);

  let board = GameRules.createEmptyBoard();
  let myColor = null; // "black" | "white" | null (spectator)
  let currentTurn = "black";
  let gameOver = false;
  let winner = null;
  let playerCount = 0;
  let lastMove = null;

  function pixelForCell(i) {
    return MARGIN + i * cellSize;
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#3a2a12";
    ctx.lineWidth = 1;
    for (let i = 0; i < boardSize; i++) {
      const p = pixelForCell(i);

      ctx.beginPath();
      ctx.moveTo(MARGIN, p);
      ctx.lineTo(canvas.width - MARGIN, p);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p, MARGIN);
      ctx.lineTo(p, canvas.height - MARGIN);
      ctx.stroke();
    }

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const stone = board[row][col];
        if (stone) drawStone(row, col, stone);
      }
    }

    if (lastMove) {
      const { row, col } = lastMove;
      ctx.beginPath();
      ctx.arc(pixelForCell(col), pixelForCell(row), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#e63946";
      ctx.fill();
    }
  }

  function drawStone(row, col, color) {
    const x = pixelForCell(col);
    const y = pixelForCell(row);
    const radius = cellSize * 0.42;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color === "black" ? "#111" : "#f5f5f5";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  }

  function cellFromEvent(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (evt.clientX - rect.left) * scaleX;
    const y = (evt.clientY - rect.top) * scaleY;

    const col = Math.round((x - MARGIN) / cellSize);
    const row = Math.round((y - MARGIN) / cellSize);
    return { row, col };
  }

  function updateStatus() {
    if (myColor === null) {
      statusEl.textContent = "You are spectating this game.";
    } else if (gameOver) {
      statusEl.textContent =
        winner === myColor ? "You win!" : `${capitalize(winner)} wins.`;
    } else if (playerCount < 2) {
      statusEl.textContent = `You are ${myColor}. Waiting for an opponent to join...`;
    } else if (currentTurn === myColor) {
      statusEl.textContent = `Your turn (${myColor}).`;
    } else {
      statusEl.textContent = `Waiting for ${currentTurn} to move...`;
    }

    presenceEl.textContent =
      playerCount < 2 ? `${playerCount}/2 players connected` : "";

    restartBtn.disabled = !(gameOver && myColor !== null);
  }

  function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
  }

  canvas.addEventListener("click", (evt) => {
    if (myColor === null || gameOver || currentTurn !== myColor) return;

    const { row, col } = cellFromEvent(evt);
    if (!GameRules.isValidMove(board, row, col)) return;

    // Client-side check above is only for responsiveness; the server
    // re-validates every move independently before it counts.
    socket.emit("placeStone", { row, col });
  });

  restartBtn.addEventListener("click", () => {
    socket.emit("restartGame");
  });

  socket.on("init", (state) => {
    myColor = state.color;
    board = state.board;
    currentTurn = state.currentTurn;
    gameOver = state.gameOver;
    winner = state.winner;
    boardSize = state.boardSize;
    playerCount = state.playerCount;
    cellSize = (canvas.width - MARGIN * 2) / (boardSize - 1);
    lastMove = null;
    drawBoard();
    updateStatus();
  });

  socket.on("presence", (data) => {
    playerCount = data.connected;
    updateStatus();
  });

  socket.on("stonePlaced", (data) => {
    board[data.row][data.col] = data.color;
    currentTurn = data.currentTurn;
    gameOver = data.gameOver;
    winner = data.winner;
    lastMove = { row: data.row, col: data.col };
    drawBoard();
    updateStatus();
  });

  socket.on("moveRejected", (data) => {
    presenceEl.textContent = data.reason;
  });

  socket.on("opponentLeft", (data) => {
    presenceEl.textContent = data.message;
  });

  socket.on("gameReset", (state) => {
    board = state.board;
    currentTurn = state.currentTurn;
    gameOver = state.gameOver;
    winner = state.winner;
    playerCount = state.playerCount;
    lastMove = null;
    drawBoard();
    updateStatus();
  });

  drawBoard();
})();
