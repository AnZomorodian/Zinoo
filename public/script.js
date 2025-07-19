// Socket.IO connection
const socket = io();

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const emailInput = document.getElementById('emailInput');
const displayNameInput = document.getElementById('displayNameInput');
const authError = document.getElementById('authError');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsForm = document.getElementById('settingsForm');
const overlay = document.getElementById('overlay');

// State
let currentUser = null;
let typingTimeout = null;
let isTyping = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkConnection();
});

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Message sending
    messageInput.addEventListener('keypress', handleMessageKeypress);
    messageInput.addEventListener('input', handleTyping);
    sendButton.addEventListener('click', sendMessage);
    
    // Settings
    settingsBtn.addEventListener('click', openSettings);
    settingsForm.addEventListener('submit', handleSettingsUpdate);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
    overlay.addEventListener('click', closeSettings);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Socket events
    setupSocketListeners();
}

function setupSocketListeners() {
    // Connection events
    socket.on('connect', () => {
        updateConnectionStatus('connected', 'Connected');
    });
    
    socket.on('disconnect', () => {
        updateConnectionStatus('disconnected', 'Disconnected');
    });
    
    socket.on('connect_error', () => {
        updateConnectionStatus('error', 'Connection Error');
    });
    
    // Chat events
    socket.on('message_history', displayMessageHistory);
    socket.on('new_message', displayMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('users_update', updateUsersList);
    socket.on('user_typing', handleUserTyping);
    socket.on('profile_updated', handleProfileUpdated);
    socket.on('error', displayError);
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const displayName = displayNameInput.value.trim();
    
    if (!username || !email) {
        showAuthError('Username and email are required');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    // Send join request
    socket.emit('join', {
        username,
        email,
        displayName: displayName || username
    });
    
    // Listen for join response
    socket.once('user_joined', () => {
        currentUser = { username, email, displayName: displayName || username };
        showChatInterface();
        hideAuthError();
    });
    
    socket.once('error', (error) => {
        showAuthError(error);
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    });
}

function handleMessageKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', true);
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        socket.emit('typing', false);
    }, 1000);
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    socket.emit('send_message', { message });
    messageInput.value = '';
    
    // Stop typing indicator
    if (isTyping) {
        isTyping = false;
        socket.emit('typing', false);
        clearTimeout(typingTimeout);
    }
}

function displayMessageHistory(messages) {
    // Clear welcome message
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        displayMessage(message, false);
    });
    
    scrollToBottom();
}

function displayMessage(message, scroll = true) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    const isOwn = currentUser && message.username === currentUser.username;
    if (isOwn) {
        messageEl.classList.add('own-message');
    }
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageEl.innerHTML = `
        <div class="message-header">
            <span class="username">${escapeHtml(message.username)}</span>
            <span class="timestamp">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    messagesContainer.appendChild(messageEl);
    
    if (scroll) {
        scrollToBottom();
    }
}

function handleUserJoined(username) {
    if (username !== currentUser?.username) {
        showSystemMessage(`${username} joined the chat`);
    }
}

function handleUserLeft(username) {
    showSystemMessage(`${username} left the chat`);
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        li.innerHTML = `
            <div class="user-avatar" style="background-color: ${user.avatarColor || '#4F46E5'}">
                ${(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.displayName || user.username)}</div>
                ${user.bio ? `<div class="user-bio">${escapeHtml(user.bio)}</div>` : ''}
            </div>
            <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
        `;
        usersList.appendChild(li);
    });
}

function handleUserTyping(data) {
    if (data.isTyping) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
}

function openSettings() {
    if (!currentUser) return;
    
    // Populate current settings
    document.getElementById('settingsDisplayName').value = currentUser.displayName || '';
    document.getElementById('settingsBio').value = currentUser.bio || '';
    document.getElementById('settingsAvatarColor').value = currentUser.avatarColor || '#4F46E5';
    
    settingsModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
    overlay.classList.add('hidden');
}

function handleSettingsUpdate(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('settingsDisplayName').value.trim();
    const bio = document.getElementById('settingsBio').value.trim();
    const avatarColor = document.getElementById('settingsAvatarColor').value;
    
    socket.emit('update_profile', {
        displayName,
        bio,
        avatarColor
    });
}

function handleProfileUpdated(updatedProfile) {
    currentUser = { ...currentUser, ...updatedProfile };
    closeSettings();
    showSystemMessage('Profile updated successfully!');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        socket.disconnect();
        currentUser = null;
        showLoginScreen();
    }
}

function showChatInterface() {
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    messageInput.focus();
}

function showLoginScreen() {
    chatContainer.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('active');
    
    // Reset form
    loginForm.reset();
    hideAuthError();
    
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
}

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function hideAuthError() {
    authError.classList.add('hidden');
}

function displayError(message) {
    showSystemMessage(`Error: ${message}`, 'error');
}

function showSystemMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `system-message ${type}`;
    messageEl.textContent = message;
    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

function updateConnectionStatus(status, text) {
    connectionStatus.className = `status-dot ${status}`;
    statusText.textContent = text;
}

function checkConnection() {
    if (socket.connected) {
        updateConnectionStatus('connected', 'Connected');
    } else {
        updateConnectionStatus('disconnected', 'Connecting...');
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus username input when page loads
window.addEventListener('load', () => {
    if (usernameInput) {
        usernameInput.focus();
    }
});