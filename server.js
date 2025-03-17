// Server-side code (Node.js)
// Save as server.js

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();
let userCounter = 0;

// WebSocket connection handler
wss.on('connection', (ws) => {
    const userId = `user_${++userCounter}`;
    const userColor = getRandomColor();
    const userData = { id: userId, color: userColor };
    
    // Store client connection
    clients.set(ws, userData);
    
    // Send welcome message to the new client
    ws.send(JSON.stringify({
        type: 'welcome',
        userId: userId,
        message: `Welcome to the chat! You are ${userId}`
    }));
    
    // Broadcast user joined message
    broadcastMessage({
        type: 'notification',
        message: `${userId} has joined the chat`
    });
    
    // Message handler
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            
            // Broadcast the message to all clients
            broadcastMessage({
                type: 'message',
                userId: userId,
                color: userColor,
                text: parsedMessage.text,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        broadcastMessage({
            type: 'notification',
            message: `${userId} has left the chat`
        });
        
        // Remove client from map
        clients.delete(ws);
    });
});

// Function to broadcast messages to all connected clients
function broadcastMessage(message) {
    const messageString = JSON.stringify(message);
    
    clients.forEach((userData, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Generate random color for user
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});