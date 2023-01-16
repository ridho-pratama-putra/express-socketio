require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io');
const { writeFileSync } = require('fs');

app.use(cors()); // Add cors middleware
const CHAT_BOT = 'ChatBot';
const RECEIVE_MESSAGE_EVENT = 'receive_message';
const LEAVE_ROOM_EVENT = 'leave_room';
const SEND_MESSAGE_EVENT = 'send_message';
const SEND_IMAGES_EVENT = 'send_image';
const JOIN_ROOM_EVENT = 'join_room';
const CHAT_ROOM_USERS_EVENT = 'chatroom_users';
const DISCONNECT_EVENT = 'disconnect';
const LAST_100_MESSAGES_EVENT = 'last_100_messages';
let chatRoom = ''; // E.g. javascript, node,...
let allUsers = []; // All users in current chat room

const server = http.createServer(app);
// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100 MB
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});
const harperSaveMessage = require('./services/harper-save-message');
const harperGetMessages = require('./services/harper-get-messages');
const leaveRoom = require("./utils/leave-room");

// Listen for when the client connects via socket.io-client
io.on('connection', (socket) => {

    // Add a user to a room
    socket.on(JOIN_ROOM_EVENT, (data) => {
        const {username, room} = data; // Data sent from client when join_room event emitted
        console.log('JOIN_ROOM_EVENT')
        socket.join(room)

        let __createdtime__ = Date.now(); // Current timestamp

        // Send message to all users currently in the room, apart from the user that just joined
        socket.to(room).emit(RECEIVE_MESSAGE_EVENT, {
            message: `${username} has joined the chat room`,
            username: CHAT_BOT,
            type: 'text',
            __createdtime__,
        });

        // Send welcome msg only to user that just joined chat
        socket.emit(RECEIVE_MESSAGE_EVENT, {
            message: `Welcome ${username}`,
            username: CHAT_BOT,
            __createdtime__,
            type: 'text',
        });

        // Save the new user to the room
        chatRoom = room;
        allUsers.push({id: socket.id, username, room});
        const chatRoomUsers = allUsers.filter((user) => user.room === room);

        // tell all joined frontend (include newly joined) to update their chatroom user list
        io.in(room).emit(CHAT_ROOM_USERS_EVENT, chatRoomUsers);

        // Get last 100 messages sent in the chat room
        harperGetMessages(room)
            .then((last100Messages) => {
                // console.log('latest messages', last100Messages);
                socket.emit(LAST_100_MESSAGES_EVENT, last100Messages);
            })
            .catch((err) => console.log(err));
    });

    // Allow Users to Send images file to Each Other with Socket.io
    socket.on(SEND_IMAGES_EVENT, (data) => {
        const {fileImage, username, room, __createdtime__} = data;
        const replyMessage = {
            username,
            room,
            type: 'media'
        }

        try {
            const timeStamp = new Date().toISOString();
            writeFileSync(process.cwd() + "/tmp/upload/" + username + "_"+ timeStamp + ".jpg", fileImage, (err) => {
                if (err) {
                    io.in(room).emit(RECEIVE_MESSAGE_EVENT, {...replyMessage, message: 'failed to upload ya'});
                }
            });
            io.in(room).emit(RECEIVE_MESSAGE_EVENT, {...replyMessage, message: 'success to upload ya'});
        } catch (e) {
            console.log(e)
        }
        // Send to all users in room, including sender

        // harperSaveMessage("fileImage", username, room, __createdtime__) // Save message in db
        //     .then((response) => console.log(response))
        //     .catch((err) => console.log(err));
    });

    // Allow Users to Send Messages to Each Other with Socket.io
    socket.on(SEND_MESSAGE_EVENT, (data) => {
        console.log(`on ${SEND_MESSAGE_EVENT}`)
        const {message, username, room, __createdtime__} = data;
        const receiveMessageEvent = {...data, type: 'text',}
        io.in(room).emit(RECEIVE_MESSAGE_EVENT, receiveMessageEvent); // Send to all users in room, including sender
        harperSaveMessage(message, username, room, __createdtime__) // Save message in db
            .then((response) => console.log(response))
            .catch((err) => console.log(err));
    });

    socket.on(LEAVE_ROOM_EVENT, (data) => {
        const {username, room} = data;
        socket.leave(room);
        const __createdtime__ = Date.now();
        // Remove user from memory
        allUsers = leaveRoom(socket.id, allUsers);
        socket.to(room).emit(CHAT_ROOM_USERS_EVENT, allUsers);
        socket.to(room).emit(RECEIVE_MESSAGE_EVENT, {
            username: CHAT_BOT,
            message: `${username} has left the chat`,
            __createdtime__,
            type: 'text',
        });
    });

    socket.on(DISCONNECT_EVENT, () => {
        const user = allUsers.find((user) => user.id == socket.id);
        if (user?.username) {
            allUsers = leaveRoom(socket.id, allUsers);
            socket.to(chatRoom).emit(CHAT_ROOM_USERS_EVENT, allUsers);
            socket.to(chatRoom).emit(RECEIVE_MESSAGE_EVENT, {
                message: `${user.username} has disconnected from the chat.`,
            });
        }
    });
});

app.use("/", (req, res) => {
   res.send("hello")
});

server.listen(4000, () => 'Server is running on port 4000');