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
const currentUserId = document.getElementById('currentUserId');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userSearchInput = document.getElementById('userSearchInput');
const searchUserBtn = document.getElementById('searchUserBtn');
const footerUserCount = document.getElementById('footerUserCount');
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
    
    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const copyType = e.currentTarget.dataset.copy;
            let textToCopy = '';
            
            if (copyType === 'userId') {
                textToCopy = currentUser?.userId || '#000000';
            } else if (copyType === 'lyCode') {
                textToCopy = currentUser?.lyCode || 'LY000000';
            }
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Show copied feedback
                const originalText = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = '✓';
                setTimeout(() => {
                    e.currentTarget.innerHTML = originalText;
                }, 1000);
            });
        });
    });
    
    // User search
    searchUserBtn.addEventListener('click', handleUserSearch);
    userSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserSearch();
        }
    });
    
    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
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
    
    const emailOrUsername = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;
    
    if (!emailOrUsername || !password) {
        showAuthError('Email/username and password are required');
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
    socket.emit('authenticate', { emailOrUsername, password });
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
    currentUserId.textContent = userData.userId || '#000000';
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
    
    const messageData = { message };
    
    // Add reply information if replying
    if (replyToMessage) {
        messageData.replyTo = replyToMessage;
    }
    
    socket.emit('send_message', messageData);
    messageInput.value = '';
    
    // Clear reply state
    clearReply();
    
    // Stop typing indicator
    if (isTyping) {
        isTyping = false;
        socket.emit('typing', false);
        clearTimeout(typingTimeout);
    }
}

function setReplyTo(messageId, username, message) {
    replyToMessage = { id: messageId, username, message };
    showReplyIndicator(username, message);
    messageInput.focus();
}

function showReplyIndicator(username, message) {
    const inputContainer = document.querySelector('.message-input-container');
    
    // Remove existing reply indicator
    const existingReply = inputContainer.querySelector('.reply-indicator');
    if (existingReply) {
        existingReply.remove();
    }
    
    const replyIndicator = document.createElement('div');
    replyIndicator.className = 'reply-indicator';
    replyIndicator.innerHTML = `
        <div class="reply-info">
            <span class="reply-icon">↳</span>
            <span class="reply-text">Replying to <strong>${escapeHtml(username)}</strong>: ${escapeHtml(message.substring(0, 50))}${message.length > 50 ? '...' : ''}</span>
        </div>
        <button class="reply-cancel" onclick="clearReply()">×</button>
    `;
    
    inputContainer.insertBefore(replyIndicator, inputContainer.firstChild);
}

function clearReply() {
    replyToMessage = null;
    const replyIndicator = document.querySelector('.reply-indicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

function clearReply() {
    replyToMessage = null;
    const replyIndicator = document.querySelector('.reply-indicator');
    if (replyIndicator) {
        replyIndicator.remove();
    }
}

// Make functions globally accessible
window.setReplyTo = setReplyTo;
window.clearReply = clearReply;

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

let replyToMessage = null;

function displayMessage(message, scroll = true) {
    // Remove welcome message if it exists
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.dataset.messageId = message.id;
    
    const isOwn = currentUser && message.username === (currentUser.displayName || currentUser.username);
    if (isOwn) {
        messageEl.classList.add('own-message');
    }
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Check if this is a reply
    let replyHtml = '';
    if (message.replyTo) {
        replyHtml = `
            <div class="reply-to">
                <span class="reply-icon">↳</span>
                <span class="reply-username">${escapeHtml(message.replyTo.username)}</span>
                <span class="reply-content">${escapeHtml(message.replyTo.message.substring(0, 50))}${message.replyTo.message.length > 50 ? '...' : ''}</span>
            </div>
        `;
    }
    
    messageEl.innerHTML = `
        <div class="message-header">
            <span class="username">${escapeHtml(message.username)}</span>
            <span class="timestamp">${time}</span>
            <div class="message-actions">
                <button class="reply-btn" data-message-id="${message.id}" data-username="${escapeHtml(message.username)}" data-message="${escapeHtml(message.message)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 17l-5-5 5-5"></path>
                        <path d="M20 18v-2a4 4 0 00-4-4H4"></path>
                    </svg>
                </button>
            </div>
        </div>
        ${replyHtml}
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    // Add click event listener for reply button
    const replyBtn = messageEl.querySelector('.reply-btn');
    if (replyBtn) {
        replyBtn.addEventListener('click', function() {
            const messageId = this.dataset.messageId;
            const username = this.dataset.username;
            const messageText = this.dataset.message;
            setReplyTo(messageId, username, messageText);
        });
    }
    
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
    document.getElementById('settingsStatus').value = currentUser.status || 'online';
    document.getElementById('settingsAvatarColor').value = currentUser.avatarColor || '#667eea';
    document.getElementById('userIdDisplay').value = currentUser.userId || '#000000';
    document.getElementById('lyCodeDisplay').value = currentUser.lyCode || 'LY000000';
    
    // Switch to profile tab by default
    switchTab('profile');
    
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
    const status = document.getElementById('settingsStatus').value;
    const avatarColor = document.getElementById('settingsAvatarColor').value;
    
    socket.emit('update_profile', {
        displayName,
        bio,
        status,
        avatarColor
    });
}

function handleProfileUpdated(updatedProfile) {
    currentUser = { ...currentUser, ...updatedProfile };
    currentUserName.textContent = currentUser.displayName || currentUser.username;
    
    // Add to history if provided
    if (updatedProfile.historyItem) {
        addToProfileHistory(updatedProfile.historyItem);
    }
    
    closeSettings();
    // Don't show system message - history shows it instead
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

function switchTab(tabName) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab and pane
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function addToProfileHistory(historyItem) {
    const historyList = document.getElementById('profileHistory');
    const historyItemEl = document.createElement('div');
    historyItemEl.className = 'history-item';
    
    const time = new Date(historyItem.timestamp).toLocaleString();
    
    historyItemEl.innerHTML = `
        <span class="history-icon">✏️</span>
        <div class="history-content">
            <div class="history-text">${escapeHtml(historyItem.details || historyItem.action)}</div>
            <div class="history-time">${time}</div>
        </div>
    `;
    
    // Add to beginning of list
    historyList.insertBefore(historyItemEl, historyList.firstChild);
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    footerUserCount.textContent = users.length;
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        
        // Get status emoji and color
        const statusEmoji = getStatusEmoji(user.status);
        const statusColor = getStatusColor(user.status);
        
        li.innerHTML = `
            <div class="user-avatar" style="background-color: ${user.avatarColor || '#667eea'}">
                ${(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.displayName || user.username)} <span style="color: ${statusColor}">${statusEmoji}</span></div>
                ${user.bio ? `<div class="user-bio">${escapeHtml(user.bio)}</div>` : ''}
                ${user.userId ? `<div class="user-id">${escapeHtml(user.userId)}</div>` : ''}
            </div>
            <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
        `;
        usersList.appendChild(li);
    });
}

function getStatusEmoji(status) {
    switch(status) {
        case 'away': return '◐';
        case 'busy': return '●';
        case 'invisible': return '○';
        default: return '●';
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'online': return '#10b981';
        case 'away': return '#f59e0b';
        case 'busy': return '#ef4444';
        case 'invisible': return '#6b7280';
        default: return '#10b981';
    }
}

function handleUserSearch() {
    const searchTerm = userSearchInput.value.trim();
    if (!searchTerm) return;
    
    // Ensure it starts with # and is 7 characters
    const formattedId = searchTerm.startsWith('#') ? searchTerm : '#' + searchTerm;
    
    if (formattedId.length !== 7 || !/^#\d{6}$/.test(formattedId)) {
        showSystemMessage('Please enter a valid User ID format (#123456)', 'error');
        return;
    }
    
    socket.emit('search_user', { userId: formattedId });
    userSearchInput.value = '';
}

// Socket event for search results
socket.on('user_search_result', (result) => {
    if (result.found) {
        showSystemMessage(`Found user: ${result.user.displayName || result.user.username} (${result.user.userId})`, 'success');
        // Could implement private chat here
    } else {
        showSystemMessage('User not found or is invisible', 'error');
    }
});

function showSystemMessage(message, type = 'info') {
    const systemMessage = document.createElement('div');
    systemMessage.className = `system-message ${type}`;
    systemMessage.textContent = message;
    
    messagesContainer.appendChild(systemMessage);
    scrollToBottom();
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (systemMessage.parentNode) {
            systemMessage.remove();
        }
    }, 5000);
}

// Add system message styles
const systemStyles = document.createElement('style');
systemStyles.textContent = `
    .system-message {
        padding: 0.75rem 1rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        text-align: center;
        animation: messageSlideIn 0.3s ease-out;
    }
    
    .system-message.info {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #7dd3fc;
    }
    
    .system-message.success {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #86efac;
    }
    
    .system-message.error {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fca5a5;
    }
`;
document.head.appendChild(systemStyles);

// Auto-focus first input when page loads
window.addEventListener('load', () => {
    const firstInput = document.querySelector('#signInForm input');
    if (firstInput) {
        firstInput.focus();
    }
});