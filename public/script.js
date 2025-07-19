// Socket.IO connection
const socket = io();

// DOM elements
const authScreen = document.getElementById('authScreen');
const chatContainer = document.getElementById('chatContainer');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');
const showSignUp = document.getElementById('showSignUp');
const showSignIn = document.getElementById('showSignIn');

// Chat elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const currentUserName = document.getElementById('currentUserName');
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
    // Auth form switching
    showSignUp.addEventListener('click', switchToSignUp);
    showSignIn.addEventListener('click', switchToSignIn);
    
    // Auth forms
    loginForm.addEventListener('submit', handleSignIn);
    registerForm.addEventListener('submit', handleSignUp);
    
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
    
    // Auth events
    socket.on('auth_success', handleAuthSuccess);
    socket.on('auth_error', handleAuthError);
    
    // Chat events
    socket.on('message_history', displayMessageHistory);
    socket.on('new_message', displayMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('users_update', updateUsersList);
    socket.on('user_typing', handleUserTyping);
    socket.on('profile_updated', handleProfileUpdated);
}

function switchToSignUp() {
    signInForm.classList.remove('active');
    signUpForm.classList.add('active');
    hideAuthError();
}

function switchToSignIn() {
    signUpForm.classList.remove('active');
    signInForm.classList.add('active');
    hideAuthError();
}

function handleSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;
    
    if (!email || !password) {
        showAuthError('Email and password are required');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    // Show loading state
    const btnText = loginForm.querySelector('.btn-text');
    const btnLoading = loginForm.querySelector('.btn-loading');
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    // Send authentication request
    socket.emit('authenticate', { email, password });
}

function handleSignUp(e) {
    e.preventDefault();
    
    const username = document.getElementById('signUpUsername').value.trim();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value;
    const displayName = document.getElementById('signUpDisplayName').value.trim();
    
    if (!username || !email || !password) {
        showAuthError('Username, email, and password are required');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const btnText = registerForm.querySelector('.btn-text');
    const btnLoading = registerForm.querySelector('.btn-loading');
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    // Send registration request
    socket.emit('register', {
        username,
        email,
        password,
        displayName: displayName || username
    });
}

function handleAuthSuccess(userData) {
    currentUser = userData;
    currentUserName.textContent = userData.displayName || userData.username;
    showChatInterface();
    hideAuthError();
    resetAuthForms();
}

function handleAuthError(error) {
    showAuthError(error);
    resetAuthForms();
}

function resetAuthForms() {
    // Reset loading states
    document.querySelectorAll('.btn-text').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.btn-loading').forEach(el => el.classList.add('hidden'));
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
    
    if (messages.length === 0) {
        showWelcomeMessage();
    } else {
        messages.forEach(message => {
            displayMessage(message, false);
        });
    }
    
    scrollToBottom();
}

function showWelcomeMessage() {
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-content">
                <span class="welcome-icon">💬</span>
                <h3>Welcome to Linkly!</h3>
                <p>Start a conversation and connect with your team</p>
            </div>
        </div>
    `;
}

function displayMessage(message, scroll = true) {
    // Remove welcome message if it exists
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    const isOwn = currentUser && message.username === (currentUser.displayName || currentUser.username);
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
    if (username !== (currentUser?.displayName || currentUser?.username)) {
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
            <div class="user-avatar" style="background-color: ${user.avatarColor || '#667eea'}">
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
    document.getElementById('settingsAvatarColor').value = currentUser.avatarColor || '#667eea';
    
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
    currentUserName.textContent = currentUser.displayName || currentUser.username;
    closeSettings();
    showSystemMessage('Profile updated successfully!');
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        socket.disconnect();
        currentUser = null;
        showAuthScreen();
    }
}

function showChatInterface() {
    authScreen.classList.remove('active');
    authScreen.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    messageInput.focus();
}

function showAuthScreen() {
    chatContainer.classList.add('hidden');
    authScreen.classList.remove('hidden');
    authScreen.classList.add('active');
    
    // Reset forms
    loginForm.reset();
    registerForm.reset();
    hideAuthError();
    resetAuthForms();
    
    // Show sign in form by default
    signUpForm.classList.remove('active');
    signInForm.classList.add('active');
}

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function hideAuthError() {
    authError.classList.add('hidden');
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

// Auto-focus first input when page loads
window.addEventListener('load', () => {
    const firstInput = document.querySelector('#signInForm input');
    if (firstInput) {
        firstInput.focus();
    }
});