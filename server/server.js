const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle room joining
    socket.on('joinRoom', (packet) => {
        const { roomName, username } = packet;
        socket.join(roomName);
        console.log(`User ${username} (${socket.id}) joined room: ${roomName}`);

        // Add the user to the room participants list
        if (!rooms[roomName]) rooms[roomName] = [];
        rooms[roomName].push({ userId: socket.id, name: username });
        
        // Notify the room of the new participant
        socket.to(roomName).emit('userConnected', { userId: socket.id, name: username });
        
        // Send the updated participants list to everyone in the room
        io.to(roomName).emit('updateParticipants', rooms[roomName]);
    });

    // Handle new messages
    socket.on('newMessage', (message) => {
        const roomName = message.roomName; // You may need to include roomName in the message
        socket.to(roomName).emit('newMessage', message); // Send message to the room
    });

    // Handle room leaving
    socket.on('leaveRoom', (packet) => {
        console.log(`User ${socket.id} left room: ${packet.roomName}`);
        if (rooms[packet.roomName]) {
            const isHost = rooms[packet.roomName][0]?.userId === socket.id; // Check if the user is the host
            console.log(rooms[packet.roomName]);
            rooms[packet.roomName] = rooms[packet.roomName].filter((user) => user.userId != socket.id);
            console.log(rooms[packet.roomName]);
            io.to(packet.roomName).emit('updateParticipants', rooms[packet.roomName]);
            socket.to(packet.roomName).emit('userDisconnected', { userId: socket.id, name: packet.username });

            if (isHost) {
                console.log(`Host ${socket.id} has left. Terminating room: ${packet.roomName}`);
                // Notify all participants to leave
                io.to(packet.roomName).emit('endnow');
                socket.emit('hostLeaving', packet.roomName);
                // Clear the room's participant list
                delete rooms[packet.roomName];
            }
        }
        socket.leave(packet.roomName);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
