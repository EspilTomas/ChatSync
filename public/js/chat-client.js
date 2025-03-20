// DOM Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const statusElement = document.getElementById('status');
const usernameInput = document.getElementById('username-input');
const changeUsernameBtn = document.getElementById('change-username-btn');
const roomsList = document.getElementById('rooms-list');
const usersList = document.getElementById('users-list');
const currentRoomElement = document.getElementById('current-room');
const usersCountElement = document.getElementById('users-count');
const newRoomInput = document.getElementById('new-room-input');
const createRoomBtn = document.getElementById('create-room-btn');
const typingIndicator = document.getElementById('typing-indicator');

// WebSocket and user data
let socket;
let userData = {
    id: null,
    username: null,
    room: 'general'
};

// Bot configuration
const botConfig = {
    id: 'gpt-bot-id'
};

// Typing timer
let typingTimer;
let isTyping = false;

// Function to connect to WebSocket server
function connectWebSocket() {
    // Get the host and port from the current URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    // Create WebSocket connection
    socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', (event) => {
        statusElement.textContent = 'Conectado';
        statusElement.className = 'status connected';
        enableUI(true);
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
            case 'welcome':
                handleWelcomeMessage(message);
                break;
                
            case 'message':
                addChatMessage(message);
                break;
                
            case 'notification':
                addNotification(message.message);
                break;
                
            case 'usersList':
                updateUsersList(message.users);
                updateUsersCount(message.users.length);
                break;
                
            case 'roomCreated':
                addRoom(message.room);
                break;
                
            case 'roomChanged':
                handleRoomChange(message);
                break;
                
            case 'usernameChanged':
                userData.username = message.username;
                updateUI();
                break;
                
            case 'typing':
                showTypingIndicator(message);
                break;
                
            case 'error':
                showError(message.message);
                break;
        }
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
        statusElement.textContent = 'Desconectado. Intentando reconectar...';
        statusElement.className = 'status disconnected';
        enableUI(false);
        
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 3000);
    });
    
    // Connection error
    socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        statusElement.textContent = 'Error de conexión';
        statusElement.className = 'status error';
    });
}

// Handle welcome message when connecting
function handleWelcomeMessage(message) {
    userData.id = message.userId;
    userData.username = message.username;
    userData.room = message.room;
    
    usernameInput.value = userData.username;
    currentRoomElement.textContent = message.roomId === 'general' ? 'General' : message.roomId;
    
    addNotification(message.message);
    
    // Populate rooms list
    if (message.rooms && message.rooms.length > 0) {
        message.rooms.forEach(room => {
            addRoom(room);
        });
    }
}

// Handle room change response
function handleRoomChange(message) {
    userData.room = message.roomId;
    currentRoomElement.textContent = message.roomName;
    messagesContainer.innerHTML = ''; // Clear messages from previous room
    addNotification(`Te has unido a la sala: ${message.roomName}`);
    
    // Update active room in UI
    updateActiveRoom();
}

// Add chat message to the UI
function addChatMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // Check if this is a bot message
    const isBot = message.userId === botConfig.id;
    
    if (message.userId === userData.id) {
        messageElement.classList.add('user-message');
    } else if (isBot) {
        messageElement.classList.add('bot-message');
    }
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = message.username || message.userId;
    usernameSpan.style.color = message.color;
    
    if (isBot) {
        // Add a bot icon/badge
        const botBadge = document.createElement('span');
        botBadge.className = 'bot-badge';
        botBadge.textContent = '🤖';
        botBadge.title = 'AI Assistant';
        usernameSpan.prepend(botBadge);
    }
    
    const timestampSpan = document.createElement('span');
    const date = new Date(message.timestamp);
    timestampSpan.textContent = date.toLocaleTimeString();
    
    header.appendChild(usernameSpan);
    header.appendChild(timestampSpan);
    
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    
    // Format AI responses with proper line breaks
    if (isBot) {
        // Split by line breaks and create paragraph for each one
        const paragraphs = message.text.split('\n');
        paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
                const p = document.createElement('p');
                p.textContent = paragraph;
                textElement.appendChild(p);
            }
        });
    } else {
        textElement.textContent = message.text;
    }
    
    messageElement.appendChild(header);
    messageElement.appendChild(textElement);
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

// Add notification message to the UI
function addNotification(text) {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification';
    notificationElement.textContent = text;
    messagesContainer.appendChild(notificationElement);
    scrollToBottom();
}

// Show error message
function showError(text) {
    const errorElement = document.createElement('div');
    errorElement.className = 'notification error';
    errorElement.textContent = `Error: ${text}`;
    messagesContainer.appendChild(errorElement);
    scrollToBottom();
}

// Update the list of online users
function updateUsersList(users) {
    usersList.innerHTML = '';
    
    // Check if bot exists in the users list
    let botExists = false;
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        if (user.id === userData.id) {
            userElement.classList.add('current-user');
        } else if (user.id === botConfig.id) {
            userElement.classList.add('bot-user');
            botExists = true;
        }
        
        const userCircle = document.createElement('span');
        userCircle.className = 'user-status-circle';
        
        const userName = document.createElement('span');
        userName.textContent = user.username;
        userName.style.color = user.color;
        
        userElement.appendChild(userCircle);
        userElement.appendChild(userName);
        usersList.appendChild(userElement);
    });
    
    // Add bot to users list if not already present
    if (!botExists) {
        const botElement = document.createElement('div');
        botElement.className = 'user-item bot-user';
        
        const botCircle = document.createElement('span');
        botCircle.className = 'user-status-circle';
        
        const botName = document.createElement('span');
        botName.textContent = 'GPT Assistant 🤖';
        botName.style.color = '#10a37f'; // Color verde de OpenAI
        
        botElement.appendChild(botCircle);
        botElement.appendChild(botName);
        usersList.appendChild(botElement);
    }
}

// Update users count in the room header
function updateUsersCount(count) {
    // Add +1 for the bot that's always available
    const totalCount = count + 1;
    usersCountElement.textContent = `${totalCount} usuario${totalCount !== 1 ? 's' : ''}`;
}

// Add a room to the rooms list
function addRoom(room) {
    // Check if the room already exists in the list
    const existingRoom = document.getElementById(`room-${room.id}`);
    if (existingRoom) {
        // Update the room data
        const countElement = existingRoom.querySelector('.room-count');
        if (countElement) {
            countElement.textContent = `(${room.clientCount})`;
        }
        return;
    }
    
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    roomElement.id = `room-${room.id}`;
    
    if (room.id === userData.room) {
        roomElement.classList.add('active-room');
    }
    
    const roomName = document.createElement('span');
    roomName.className = 'room-name';
    roomName.textContent = room.name;
    
    const roomCount = document.createElement('span');
    roomCount.className = 'room-count';
    roomCount.textContent = `(${room.clientCount})`;
    
    roomElement.appendChild(roomName);
    roomElement.appendChild(roomCount);
    
    // Add click event to join the room
    roomElement.addEventListener('click', () => {
        joinRoom(room.id);
    });
    
    roomsList.appendChild(roomElement);
}

// Update the active room in the UI
function updateActiveRoom() {
    // Remove active class from all rooms
    const roomItems = document.querySelectorAll('.room-item');
    roomItems.forEach(item => {
        item.classList.remove('active-room');
    });
    
    // Add active class to current room
    const currentRoomItem = document.getElementById(`room-${userData.room}`);
    if (currentRoomItem) {
        currentRoomItem.classList.add('active-room');
    }
}

// Join a chat room
function joinRoom(roomId) {
    if (userData.room === roomId) return;
    
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'joinRoom',
            roomId: roomId
        }));
    }
}

// Create a new chat room
function createRoom() {
    const roomName = newRoomInput.value.trim();
    
    if (!roomName) {
        showError('Por favor ingresa un nombre para la sala');
        return;
    }
    
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'createRoom',
            roomName: roomName
        }));
        
        newRoomInput.value = '';
    }
}

// Change username
function changeUsername() {
    const newUsername = usernameInput.value.trim();
    
    if (!newUsername) {
        showError('Por favor ingresa un nombre de usuario');
        return;
    }
    
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'setUsername',
            username: newUsername
        }));
    }
}

// Show typing indicator
function showTypingIndicator(message) {
    if (message.userId === userData.id) return;
    
    if (message.isTyping) {
        if (message.userId === botConfig.id) {
            typingIndicator.textContent = `${message.username} está pensando...`;
        } else {
            typingIndicator.textContent = `${message.username} está escribiendo...`;
        }
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// Send typing status
function sendTypingStatus(isTyping) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'typing',
            isTyping: isTyping
        }));
    }
}

// Function to enable/disable UI elements
function enableUI(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    usernameInput.disabled = !enabled;
    changeUsernameBtn.disabled = !enabled;
    newRoomInput.disabled = !enabled;
    createRoomBtn.disabled = !enabled;
    
    if (enabled) {
        messageInput.focus();
    }
}

// Update UI with current user data
function updateUI() {
    usernameInput.value = userData.username;
    updateActiveRoom();
}

// Function to scroll chat to bottom
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to send message
function sendMessage() {
    const text = messageInput.value.trim();
    
    if (text && socket.readyState === WebSocket.OPEN) {
        // Send message to server
        socket.send(JSON.stringify({
            type: 'chat',
            text: text
        }));
        
        // Clear input field
        messageInput.value = '';
        messageInput.focus();
        
        // Clear typing status
        isTyping = false;
        sendTypingStatus(false);
        clearTimeout(typingTimer);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Send message when button is clicked
    sendButton.addEventListener('click', sendMessage);
    
    // Send message when Enter key is pressed
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // Handle typing events
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            sendTypingStatus(true);
        }
        
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            sendTypingStatus(false);
        }, 2000);
    });
    
    // Change username event
    changeUsernameBtn.addEventListener('click', changeUsername);
    
    // Create room event
    createRoomBtn.addEventListener('click', createRoom);
    
    // Connect to WebSocket server
    connectWebSocket();
});