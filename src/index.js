const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');

app.use(cors()); // Add cors middleware

const server = http.createServer(app);

// Add this
// Create an io server and allow for CORS from http://localhost:3000 with GET and POST methods
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Add this
app.get('/', (req, res) => {
    res.send('Hello world');
});

server.listen(4000, () => 'Server is running on port 4000');