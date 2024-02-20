import express from "express";
import bodyParser from "body-parser";
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Object to store rooms and users waiting in each room
const rooms = new Map();

app.use(bodyParser.json({ limit: "30mb", extended: true }));

// to check if backend is not crashed
app.get("/", (req, res) => {
    res.send(`Server launched perfectly on ${req.protocol}://${req.get('host')}${req.originalUrl}`);
});

/* ----------------------------------- */

io.on('connection', (socket) => {

    const findOrCreateRoom = () => {
        for (const [room, users] of rooms.entries()) {
            if (users.size < 2) {
                console.log("Found pending room!")
                return room;
            }
        }
        const newRoom = `room-${rooms.size + 1}`;
        rooms.set(newRoom, new Set());
        console.log("Created new room!")
        return newRoom;
    };

    socket.on('waiting', () => {
        const room = findOrCreateRoom();
        socket.join(room);
        rooms.get(room).add(socket);
        console.log(`User joined the ${room}`);
        
        const usersInRoom = rooms.get(room).size;
        if (usersInRoom === 1) {
            io.to(room).emit('wait', `Waiting for a stranger to join ${room}`);
        } else {
            io.to(room).emit('start', `You can start chatting in ${room}`);
        }
    });

    socket.on('message', (message) => {
        const room = Array.from(socket.rooms)[1];
        console.log(`Message received in room ${room}:`, message);
        
        const receivedMessage = { text: message, sent: false };
        socket.to(room).emit('message', receivedMessage);
        
        const processedMessage = { text: message, sent: true };
        socket.emit('message', processedMessage);
    });
  

    socket.on('disconnect', () => {
        for (const [room, users] of rooms.entries()) {
            if (users.has(socket)) {
                users.delete(socket);
                console.log(`User left the ${room}`);
                if (users.size === 1) {
                    let found = false;
                    for (const [otherRoom, otherUsers] of rooms.entries()) {
                        if (otherRoom !== room && otherUsers.size === 1) {
                            const newUser = otherUsers.values().next().value;
                            newUser.leave(otherRoom);
                            otherUsers.delete(newUser);
                            newUser.join(room);
                            users.add(newUser);
                            io.to(room).emit('start', `You can start chatting in ${room}`);
                            console.log(`User from ${otherRoom} joined to ${room}`);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const remainingSocket = Array.from(users)[0];
                        remainingSocket.emit('wait', `Stranger left the chat, waiting for another user to join ${room}`);
                        console.log(`Waiting after partner left the ${room}`);
                    }
                }
                break;
            }
        }
    });
    
    socket.on("connection_error", (err) => {
        console.log(err.req);      // the request object
        console.log(err.code);     // the error code, for example 1
        console.log(err.message);  // the error message, for example "Session ID unknown"
        console.log(err.context);  // some additional error context
    });

});

/* ----------------------------------- */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
