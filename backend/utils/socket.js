import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust as per your security needs
            methods: ["GET", "POST"]
        }
    });

    console.log('🔌 Socket.io: System Initialized');

    io.on('connection', (socket) => {
        console.log(`📡 Socket: New connection: ${socket.id}`);

        // Handle joining user-specific rooms for direct notifications
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`🏠 Socket: User ${userId} joined room ${userId}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket: Disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io NOT INITIALIZED');
    }
    return io;
};

export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId.toString()).emit(event, data);
        console.log(`📤 Socket: Sent [${event}] to user ${userId}`);
    }
};