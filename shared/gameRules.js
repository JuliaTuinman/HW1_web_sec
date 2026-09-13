// Shared rules module: loaded as a <script> in the browser AND required() on
// the server, so there is exactly one implementation of move legality and
// win detection. The server's copy is the one that is actually trusted.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GameRules = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const BOARD_SIZE = 15;
  const DIRECTIONS = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  function createEmptyBoard() {
    const board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      board.push(new Array(BOARD_SIZE).fill(null));
    }
    return board;
  }

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function isValidMove(board, row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
    if (!inBounds(row, col)) return false;
    return board[row][col] === null;
  }

  function checkWin(board, row, col, color) {
    for (const [dr, dc] of DIRECTIONS) {
      let count = 1;

      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c) && board[r][c] === color) {
        count++;
        r += dr;
        c += dc;
      }

      r = row - dr;
      c = col - dc;
      while (inBounds(r, c) && board[r][c] === color) {
        count++;
        r -= dr;
        c -= dc;
      }

      if (count >= 5) return true;
    }
    return false;
  }

  return { BOARD_SIZE, createEmptyBoard, inBounds, isValidMove, checkWin };
});