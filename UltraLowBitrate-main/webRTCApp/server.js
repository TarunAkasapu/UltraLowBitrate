const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    socket.on('file-offer', data => {
        console.log('File offer received:', data);
        socket.broadcast.emit('file-offer', data);
    });

    socket.on('file-answer', data => {
        console.log('File answer received:', data);
        socket.broadcast.emit('file-answer', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
