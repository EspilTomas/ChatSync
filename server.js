// Server-side code (Node.js)
// Save as server.js

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos
const fetch = require('node-fetch'); // Para hacer solicitudes HTTP
require('dotenv').config(); // Para cargar variables de entorno desde .env

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

// Bot configuration
const botConfig = {
  name: 'GPT Assistant',
  id: 'gpt-bot-id',
  color: '#10a37f' // Color verde de OpenAI
};

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
    message: `Bienvenido al chat! Estás conectado como: ${userData.username}\nPuedes usar !gpt seguido de tu pregunta para interactuar con la IA.`,
    rooms: Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      clientCount: room.clients.size
    }))
  }));
  
  // Broadcast user joined message to the room
  broadcastToRoom(userData.room, {
    type: 'notification',
    message: `${userData.username} ha entrado al chat`,
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
          // Check if message is directed to the AI assistant
          if (parsedMessage.text.trim().startsWith('!gpt')) {
            handleOpenAIRequest(parsedMessage.text, userData, ws);
          } else {
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
          }
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
              message: `${userData.username} salió de la sala`,
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
          
          // Notify room about new user
          broadcastToRoom(newRoom, {
            type: 'notification',
            message: `${userData.username} entró a la sala`,
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
        message: `${userData.username} salió del chat`,
        roomId: roomId
      });
      
      // Update online users list
      sendRoomUsersList(roomId);
    }
    
    // Remove client from map
    clients.delete(ws);
  });
});

// Handle OpenAI assistant requests
async function handleOpenAIRequest(message, userData, ws) {
  // Extract the query (remove the !gpt prefix)
  const query = message.trim().substring(4).trim();
  
  if (!query) {
    ws.send(JSON.stringify({
      type: 'message',
      userId: botConfig.id,
      username: botConfig.name,
      color: botConfig.color,
      text: "¡Hola! Para hacer una consulta, escribe !gpt seguido de tu pregunta.",
      timestamp: new Date().toISOString(),
      roomId: userData.room
    }));
    return;
  }
  
  // Let the user know the bot is "thinking"
  broadcastToRoom(userData.room, {
    type: 'typing',
    userId: botConfig.id,
    username: botConfig.name,
    isTyping: true,
    roomId: userData.room
  });
  
  try {
    // Get response from OpenAI
    const aiResponse = await getOpenAIResponse(query);
    
    // Send AI response to the room
    broadcastToRoom(userData.room, {
      type: 'message',
      userId: botConfig.id,
      username: botConfig.name,
      color: botConfig.color,
      text: aiResponse,
      timestamp: new Date().toISOString(),
      roomId: userData.room
    });
    
    // Stop the typing indicator
    broadcastToRoom(userData.room, {
      type: 'typing',
      userId: botConfig.id,
      username: botConfig.name,
      isTyping: false,
      roomId: userData.room
    });
  } catch (error) {
    console.error('Error getting AI response:', error);
    ws.send(JSON.stringify({
      type: 'message',
      userId: botConfig.id,
      username: botConfig.name,
      color: botConfig.color,
      text: "Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo más tarde.",
      timestamp: new Date().toISOString(),
      roomId: userData.room
    }));
  }
}

// Get response from OpenAI API
async function getOpenAIResponse(query) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return await simulateAIResponse(query);
    }
    
    console.log("Using OpenAI API for query:", query);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asistente amigable llamado GPT Assistant. Responde de manera concisa, útil e informativa. Limita tus respuestas a 150 palabras." },
          { role: "user", content: query }
        ],
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI response:", error);
    
    // Fallback to simulated response
    return await simulateAIResponse(query);
  }
}

// Simulate AI response as fallback
async function simulateAIResponse(query) {
  // Add a small delay to simulate "thinking"
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Sample responses based on query content
  if (query.toLowerCase().includes('hola') || query.toLowerCase().includes('saludar')) {
    return `¡Hola! Soy GPT Assistant, un asistente AI. ¿En qué puedo ayudarte hoy?`;
  }
  else if (query.toLowerCase().includes('tiempo') || query.toLowerCase().includes('clima')) {
    return `No tengo acceso a datos de clima en tiempo real, pero puedo recomendarte consultar un servicio meteorológico para obtener la información más actualizada.`;
  }
  else if (query.toLowerCase().includes('chiste')) {
    const jokes = [
      "¿Por qué los programadores prefieren el frío? Porque tienen problemas con el calor... calentamiento global de la CPU.",
      "Un byte le pregunta a otro byte: ¿Te sientes mal? Es que te veo un poco apagado.",
      "No confíes en los átomos, hacen up todo.",
      "¿Qué le dice un bit al otro? Nos vemos en el bus."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  else if (query.toLowerCase().includes('ayuda')) {
    return `Puedo ayudarte con información general, resolver preguntas sencillas, contar chistes, o conversar sobre diversos temas. Solo escribe !gpt seguido de tu pregunta.`;
  }
  else {
    return `Gracias por tu pregunta sobre "${query}". Estoy funcionando en modo de simulación porque no hay clave API configurada. Añade una clave API de OpenAI en el archivo .env para obtener respuestas reales.`;
  }
}

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