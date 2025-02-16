const express = require("express");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

let games = {}; // Store game hashes and moves

function generateHash(board) {
    return crypto.createHash("sha256").update(board.join("")).digest("hex");
}

wss.on("connection", (ws) => {
    let gameId = null;

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "FIND_MATCH") {
            // Find or create a game
            gameId = Object.keys(games).find((id) => games[id].players.length === 1);
            if (!gameId) {
                gameId = Math.random().toString(36).substr(2, 5);
                games[gameId] = { players: [], moves: [] };
            }
            games[gameId].players.push(ws);
            ws.send(JSON.stringify({ type: "MATCH_FOUND", gameId }));
        }

        if (data.type === "MOVE") {
            let move = { index: data.index, player: data.player };
            games[data.gameId].moves.push(move);
            let hash = generateHash(games[data.gameId].moves.map(m => `${m.index}${m.player}`));

            // Send only move and hash
            games[data.gameId].players.forEach((playerWs) => {
                playerWs.send(JSON.stringify({ type: "UPDATE", move, hash }));
            });
        }
    });

    ws.on("close", () => {
        if (gameId && games[gameId]) {
            games[gameId].players = games[gameId].players.filter(p => p !== ws);
            if (games[gameId].players.length === 0) delete games[gameId];
        }
    });
});

server.listen(3000, () => console.log("Server running on port 3000"));
