const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let players = {};

io.on('connection', (socket) => {
    console.log(`Combatant dropped in: ${socket.id}`);

    // Initialize player with 100 Health
    players[socket.id] = { x: 0, y: 2.5, z: 30, yaw: 0, pitch: 0, currentWeapon: 1, health: 100 };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    socket.on('playerMovement', (mov) => {
        if (players[socket.id]) {
            players[socket.id].x = mov.x;
            players[socket.id].y = mov.y;
            players[socket.id].z = mov.z;
            players[socket.id].yaw = mov.yaw;
            players[socket.id].pitch = mov.pitch;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    socket.on('weaponChange', (data) => {
        if (players[socket.id]) {
            players[socket.id].currentWeapon = data.currentWeapon;
            socket.broadcast.emit('remoteWeaponChanged', { id: socket.id, currentWeapon: data.currentWeapon });
        }
    });

    socket.on('shootBullet', (bulletData) => {
        socket.broadcast.emit('remoteBulletFired', {
            playerId: socket.id,
            origin: bulletData.origin,
            direction: bulletData.direction,
            velocity: bulletData.velocity,
            color: bulletData.color,
            bSize: bulletData.bSize
        });
    });

    // Listen for a successful bullet hit registered by a client
    socket.on('playerHit', (data) => {
        const targetId = data.targetId;
        const damage = data.damage;

        if (players[targetId]) {
            players[targetId].health -= damage;
            
            if (players[targetId].health <= 0) {
                players[targetId].health = 100; // Reset health for respawn
                io.emit('playerKilled', { targetId: targetId, shooterId: socket.id });
            } else {
                io.emit('healthUpdated', { id: targetId, health: players[targetId].health });
            }
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FPS Multiplayer Engine online on port ${PORT}`));
