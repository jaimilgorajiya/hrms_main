import { Server } from 'socket.io';

let io;

export const initSocket = (server, corsOptions) => {
    io = new Server(server, {
        cors: corsOptions
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('join', (userId) => {
            if (userId) {
                const roomName = `user_${userId}`;
                socket.join(roomName);
                console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => io;