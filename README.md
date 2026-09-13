# Five-in-a-Row

## Run

```
npm install
npm start
```

Open `localhost:3000` in two separate browser tabs to play as Black and
White. Any additional tab connects as a spectator.

Run these commands from the project root (where `package.json` is) 

## Structure

```
HW1_web_sec/
├── package.json          dependencies + npm start script
├── shared/
│   └── gameRules.js       board size, move legality, win detection
├── server/
│   └── server.js          Express + Socket.IO server
└── public/                served statically by Express
    ├── index.html
    ├── style.css
    └── client.js           canvas rendering + Socket.IO client
```

- **shared/gameRules.js**: 
  - loaded both as a `<script>` in the browser and via `require()` on the server, so there's one implementation of the rules instead of two that could drift apart
  - The server's copy is the
  one that's actually enforced.
- **server/server.js**: 
  - Express serves the static client files
  - Socket.IO
  handles real-time moves
  - Tracks the authoritative board, assigns colors
  by socket connection (a client can't claim to be the other player), and
  independently re-validates every move (right turn, empty cell, in
  bounds) regardless of what the client already checked.
- **public/**: 
  - the HTML5 client: 
    - a `<canvas>` board
    - styling
    - `client.js` (click handling, rendering, and the Socket.IO listener that applies updates pushed from the server)
