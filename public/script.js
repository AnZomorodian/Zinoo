let socket = null;
let currentUser = null;
let typingTimeout = null;

// DOM Elements
const usernameModal = document.getElementById('usernameModal');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const typingIndicator = document.getElementById('typingIndicator');

document.addEventListener('DOMContentLoaded', function() {
    // Show username modal
    usernameModal.classList.remove('hidden');
    
    // Join button handler
    joinButton.addEventListener('click', joinChat);
    
    // Enter key handlers
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') joinChat();
    });
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Typing indicator
    messageInput.addEventListener('input', function() {
        if (socket && currentUser) {
            socket.emit('typing', true);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit('typing', false);
            }, 1000);
        }
    });
    
    // Send button handler
    sendButton.addEventListener('click', sendMessage);
});

function joinChat() {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    currentUser = username;
    
    // Hide modal and show chat
    usernameModal.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    
    // Initialize socket connection
    initializeSocket();
}

function initializeSocket() {
    socket = io();
    
    updateConnectionStatus('connecting', 'Connecting...');
    
    socket.on('connect', function() {
        updateConnectionStatus('connected', 'Connected');
        socket.emit('join', currentUser);
        messageInput.focus();
    });
    
    socket.on('disconnect', function() {
        updateConnectionStatus('disconnected', 'Disconnected');
    });
    
    socket.on('connect_error', function() {
        updateConnectionStatus('disconnected', 'Connection Error');
    });
    
    socket.on('message_history', function(messages) {
        clearMessages();
        messages.forEach(message => displayMessage(message));
        scrollToBottom();
    });
    
    socket.on('new_message', function(message) {
        displayMessage(message);
        scrollToBottom();
    });
    
    socket.on('user_joined', function(username) {
        displaySystemMessage(`${username} joined the chat`);
    });
    
    socket.on('user_left', function(username) {
        displaySystemMessage(`${username} left the chat`);
    });
    
    socket.on('users_update', function(users) {
        updateUsersList(users);
    });
    
    socket.on('user_typing', function(data) {
        if (data.isTyping) {
            typingIndicator.textContent = `${data.username} is typing...`;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
}

function updateConnectionStatus(status, text) {
    connectionStatus.className = `status-dot ${status}`;
    statusText.textContent = text;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !socket || !currentUser) return;
    
    socket.emit('send_message', { message: message });
    messageInput.value = '';
    
    // Clear typing indicator
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        socket.emit('typing', false);
    }
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.username === currentUser ? 'own' : ''}`;
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="username">${escapeHtml(message.username)}</span>
            <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    messagesContainer.appendChild(messageDiv);
}

function displaySystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.className = 'user-item';
        userItem.textContent = user.username;
        usersList.appendChild(userItem);
    });
}

function clearMessages() {
    messagesContainer.innerHTML = '';
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}