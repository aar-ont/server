const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initialize player with full tracking states
    players[socket.id] = { x: 0, y: 2.5, z: 30, yaw: 0 };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    // Stream movement and jump physics
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].yaw = movementData.yaw;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    // Listen for shots and broadcast the bullet data to everyone else
    socket.on('shootBullet', (bulletData) => {
        socket.broadcast.emit('remoteBulletFired', {
            playerId: socket.id,
            origin: bulletData.origin,
            direction: bulletData.direction,
            velocity: bulletData.velocity
        });
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`FPS Multiplayer Brain running on port ${PORT}`);
});
