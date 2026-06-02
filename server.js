const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Allow connections from your GitHub Pages site
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create a new entry for this player
    players[socket.id] = { x: 0, y: 2.5, z: 35, yaw: 0 };

    // Tell the new player about everyone else, and tell everyone else about them
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, x: 0, y: 2.5, z: 35 });

    // When a player moves, update their coordinates and broadcast to everyone else
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].yaw = movementData.yaw;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    // Clean up when someone leaves
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Multiplayer server running on port ${PORT}`);
});
