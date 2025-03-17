// Server-side code (Node.js)
// Save as server.js

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients, rooms and user data
const clients = new Map();
const rooms = new Map();

// Create default room
const defaultRoom = {
  id: 'general',
  name: 'General',
  clients: new Set()
};
rooms.set('general', defaultRoom);

// WebSocket connection handler
wss.on('connection', (ws) => {
  // Generate a unique client ID
  const clientId = uuidv4();
  let userData = { 
    id: clientId,
    username: `guest_${clientId.substring(0, 5)}`,
    color: getRandomColor(),
    room: 'general' // Default room
  };
  
  // Store client connection
  clients.set(ws, userData);
  
  // Add client to default room
  defaultRoom.clients.add(ws);
  
  // Send initial data to the new client
  ws.send(JSON.stringify({
    type: 'welcome',
    userId: userData.id,
    username: userData.username,
    color: userData.color,
    room: userData.room,
    message: `Bienvenido al chat! estas conectado como: ${userData.username}`,
    rooms: Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      clientCount: room.clients.size
    }))
  }));
  
  // Broadcast user joined message to the room
  broadcastToRoom(userData.room, {
    type: 'notification',
    message: `${userData.username} a entrado al chat`,
    roomId: userData.room
  }, ws); // Exclude the current client from this notification
  
  // Update online users in the room
  sendRoomUsersList(userData.room);
  
  // Message handler
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      
      switch (parsedMessage.type) {
        case 'chat':
          // Regular chat message
          broadcastToRoom(userData.room, {
            type: 'message',
            userId: userData.id,
            username: userData.username,
            color: userData.color,
            text: parsedMessage.text,
            timestamp: new Date().toISOString(),
            roomId: userData.room
          });
          break;
          
        case 'setUsername':
          // Update username
          const oldUsername = userData.username;
          userData.username = parsedMessage.username;
          clients.set(ws, userData);
          
          // Confirm username change to the client
          ws.send(JSON.stringify({
            type: 'usernameChanged',
            username: userData.username
          }));
          
          // Notify room about the name change
          broadcastToRoom(userData.room, {
            type: 'notification',
            message: `${oldUsername} ahora se conoce como ${userData.username}`,
            roomId: userData.room
          });
          
          // Update online users list
          sendRoomUsersList(userData.room);
          break;
          
        case 'joinRoom':
          // Handle room change
          const oldRoom = userData.room;
          const newRoom = parsedMessage.roomId;
          
          // Check if room exists
          if (!rooms.has(newRoom)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Sala '${newRoom}' no existe`
            }));
            return;
          }
          
          // Remove from old room
          if (rooms.has(oldRoom)) {
            rooms.get(oldRoom).clients.delete(ws);
            broadcastToRoom(oldRoom, {
              type: 'notification',
              message: `${userData.username} salio de la sala`,
              roomId: oldRoom
            });
            sendRoomUsersList(oldRoom);
          }
          
          // Add to new room
          userData.room = newRoom;
          clients.set(ws, userData);
          rooms.get(newRoom).clients.add(ws);
          
          // Notify client about successful room change
          ws.send(JSON.stringify({
            type: 'roomChanged',
            roomId: newRoom,
            roomName: rooms.get(newRoom).name
          }));
          
          // Send chat history for the new room (if implemented)
          // sendRoomHistory(ws, newRoom);
          
          // Notify room about new user
          broadcastToRoom(newRoom, {
            type: 'notification',
            message: `${userData.username} entro a la sala`,
            roomId: newRoom
          }, ws);
          
          // Update online users list
          sendRoomUsersList(newRoom);
          break;
          
        case 'createRoom':
          // Create a new chat room
          const roomId = parsedMessage.roomId || uuidv4();
          
          if (rooms.has(roomId)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Sala con ID '${roomId}' ya existe`
            }));
            return;
          }
          
          const newRoomData = {
            id: roomId,
            name: parsedMessage.roomName,
            clients: new Set()
          };
          
          rooms.set(roomId, newRoomData);
          
          // Notify all clients about the new room
          broadcastToAll({
            type: 'roomCreated',
            room: {
              id: roomId,
              name: parsedMessage.roomName,
              clientCount: 0
            }
          });
          break;
          
        case 'typing':
          // User is typing
          broadcastToRoom(userData.room, {
            type: 'typing',
            userId: userData.id,
            username: userData.username,
            isTyping: parsedMessage.isTyping,
            roomId: userData.room
          }, ws);
          break;
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    // Get user data and room
    const userData = clients.get(ws);
    if (!userData) return;
    
    const roomId = userData.room;
    
    // Remove from room
    if (rooms.has(roomId)) {
      rooms.get(roomId).clients.delete(ws);
      
      // Notify room about user leaving
      broadcastToRoom(roomId, {
        type: 'notification',
        message: `${userData.username} salio del chat`,
        roomId: roomId
      });
      
      // Update online users list
      sendRoomUsersList(roomId);
    }
    
    // Remove client from map
    clients.delete(ws);
  });
});

// Function to broadcast messages to all clients in a room
function broadcastToRoom(roomId, message, excludeClient = null) {
  if (!rooms.has(roomId)) return;
  
  const messageString = JSON.stringify(message);
  const room = rooms.get(roomId);
  
  room.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Broadcast to all connected clients
function broadcastToAll(message) {
  const messageString = JSON.stringify(message);
  
  clients.forEach((userData, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Send the list of online users in a room
function sendRoomUsersList(roomId) {
  if (!rooms.has(roomId)) return;
  
  const room = rooms.get(roomId);
  const onlineUsers = [];
  
  room.clients.forEach(client => {
    const userData = clients.get(client);
    if (userData) {
      onlineUsers.push({
        id: userData.id,
        username: userData.username,
        color: userData.color
      });
    }
  });
  
  broadcastToRoom(roomId, {
    type: 'usersList',
    users: onlineUsers,
    roomId: roomId
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