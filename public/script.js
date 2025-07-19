// Socket.IO connection
const socket = io();

// DOM elements - safely get them
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
const footerMessageCount = document.getElementById('footerMessageCount');
const settingsModal = document.getElementById('settingsModal');
const overlay = document.getElementById('overlay');

// State
let currentUser = null;
let typingTimeout = null;
let isTyping = false;
let replyToMessage = null;
let messageCount = 0;
let selectedStatus = 'online';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    setupEventListeners();
    setupSocketListeners();
    checkConnection();
    
    // Check for existing session first
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            showChat();
            // Validate session with server
            socket.emit('validate_token', token);
        } catch (error) {
            console.error('Session restore failed:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        }
    }
});

function setupEventListeners() {
    // Auth form switching - check if elements exist
    if (showSignUp) showSignUp.addEventListener('click', switchToSignUp);
    if (showSignIn) showSignIn.addEventListener('click', switchToSignIn);
    
    // Auth forms
    if (loginForm) loginForm.addEventListener('submit', handleSignIn);
    if (registerForm) registerForm.addEventListener('submit', handleSignUp);
    
    // Message sending - check if elements exist
    if (messageInput) {
        messageInput.addEventListener('keypress', handleMessageKeypress);
        messageInput.addEventListener('input', handleTyping);
    }
    if (sendButton) sendButton.addEventListener('click', sendMessage);
    
    // Settings - check if elements exist
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (overlay) overlay.addEventListener('click', closeSettings);
    
    // User search
    if (searchUserBtn) searchUserBtn.addEventListener('click', handleUserSearch);
    if (userSearchInput) {
        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUserSearch();
            }
        });
    }
    
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', switchTab);
    });
    
    // New DM button
    const newDmBtn = document.getElementById('newDmBtn');
    if (newDmBtn) {
        newDmBtn.addEventListener('click', () => {
            // Switch to search in header
            if (userSearchInput) userSearchInput.focus();
        });
    }
    
    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const inputId = this.dataset.input;
            const input = document.getElementById(inputId);
            const eyeIcon = this.querySelector('.eye-icon');
            const eyeOffIcon = this.querySelector('.eye-off-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeIcon.classList.add('hidden');
                eyeOffIcon.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeIcon.classList.remove('hidden');
                eyeOffIcon.classList.add('hidden');
            }
        });
    });
}

function setupSocketListeners() {
    // Connection events
    socket.on('connect', () => {
        console.log('Socket connected');
        updateConnectionStatus('connected', 'Connected');
    });
    
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        updateConnectionStatus('disconnected', 'Disconnected');
    });
    
    socket.on('connect_error', () => {
        console.log('Socket connection error');
        updateConnectionStatus('error', 'Connection Error');
    });
    
    // Auth events
    socket.on('auth_success', (userData) => {
        console.log('Auth success:', userData);
        currentUser = userData;
        // Save session data for persistence
        localStorage.setItem('authToken', userData.token || Date.now().toString());
        localStorage.setItem('userData', JSON.stringify(userData));
        hideAuthError();
        showChat();
        
        // Request updated user list
        setTimeout(() => {
            socket.emit('get_users');
        }, 500);
    });
    
    socket.on('auth_error', handleAuthError);
    
    // Chat events
    socket.on('message_history', displayMessageHistory);
    socket.on('new_message', displayMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('users_update', (users) => {
        console.log('Received users update:', users);
        updateUsersList(users);
    });
    socket.on('user_typing', handleUserTyping);
    socket.on('profile_updated', handleProfileUpdated);
    
    // User search results
    socket.on('user_search_result', (result) => {
        if (result.found) {
            showSystemMessage(`Found user: ${result.user.displayName || result.user.username} (${result.user.userId})`, 'success');
            // Switch to DM tab and start conversation
            switchToDMTab();
            startDirectMessage(result.user);
        } else {
            showSystemMessage('User not found or is invisible', 'error');
        }
    });
    
    // Add missing socket events
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showSystemMessage('Connection error: ' + error, 'error');
    });
}

// Auth functions
function switchToSignUp() {
    if (signInForm) signInForm.classList.remove('active');
    if (signUpForm) signUpForm.classList.add('active');
    hideAuthError();
}

function switchToSignIn() {
    if (signUpForm) signUpForm.classList.remove('active');
    if (signInForm) signInForm.classList.add('active');
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
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    
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
    if (btnText) btnText.classList.add('hidden');
    if (btnLoading) btnLoading.classList.remove('hidden');
    
    // Send registration request
    socket.emit('register', {
        username,
        email,
        password,
        displayName: displayName || username
    });
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

function showAuthError(message) {
    if (authError) {
        authError.textContent = message;
        authError.classList.remove('hidden');
    }
}

function hideAuthError() {
    if (authError) {
        authError.classList.add('hidden');
    }
}

// Chat functions
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
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    const messageData = { message };
    
    // Add reply information if present
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

function displayMessageHistory(messages) {
    if (!messagesContainer) return;
    
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
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-content">
                <span class="welcome-icon">💬</span>
                <h3>Welcome to LinkLy!</h3>
                <p>Start a conversation and connect with your team</p>
            </div>
        </div>
    `;
}

function displayMessage(message, scroll = true) {
    if (!messagesContainer) return;
    
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

function setReplyTo(messageId, username, message) {
    replyToMessage = { id: messageId, username, message };
    showReplyIndicator(username, message);
    if (messageInput) messageInput.focus();
}

function showReplyIndicator(username, message) {
    const inputContainer = document.querySelector('.message-input-container');
    if (!inputContainer) return;
    
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

// Make functions globally accessible
window.setReplyTo = setReplyTo;
window.clearReply = clearReply;

function handleUserJoined(username) {
    if (username !== (currentUser?.displayName || currentUser?.username)) {
        showSystemMessage(`${username} joined the chat`);
    }
}

function handleUserLeft(username) {
    showSystemMessage(`${username} left the chat`);
}

function handleUserTyping(data) {
    if (!typingIndicator) return;
    
    if (data.isTyping) {
        typingIndicator.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
}

// Settings functions
function openSettings() {
    if (!currentUser) {
        showSystemMessage('Please login first', 'error');
        return;
    }
    
    console.log('Opening settings for user:', currentUser);
    
    // Populate the form
    const displayNameInput = document.getElementById('newDisplayName');
    const bioInput = document.getElementById('newBio');
    const avatarColorInput = document.getElementById('newAvatarColor');
    const userIdSpan = document.getElementById('showUserId');
    const lyCodeSpan = document.getElementById('showLyCode');
    
    if (displayNameInput) displayNameInput.value = currentUser.displayName || currentUser.username || '';
    if (bioInput) bioInput.value = currentUser.bio || '';
    if (avatarColorInput) avatarColorInput.value = currentUser.avatarColor || '#667eea';
    if (userIdSpan) userIdSpan.textContent = currentUser.userId || '#000000';
    if (lyCodeSpan) lyCodeSpan.textContent = currentUser.lyCode || 'LY000000';
    
    // Set current status
    selectedStatus = currentUser.status || 'online';
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === selectedStatus);
        btn.onclick = () => {
            document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedStatus = btn.dataset.status;
        };
    });
    
    // Show modal
    if (settingsModal) settingsModal.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
    
    console.log('Settings opened successfully');
}

function saveNewSettings() {
    const displayNameInput = document.getElementById('newDisplayName');
    const bioInput = document.getElementById('newBio');
    const avatarColorInput = document.getElementById('newAvatarColor');
    
    const displayName = displayNameInput ? displayNameInput.value.trim() : '';
    const bio = bioInput ? bioInput.value.trim() : '';
    const avatarColor = avatarColorInput ? avatarColorInput.value : '#667eea';
    
    console.log('Saving settings:', { displayName, bio, avatarColor, status: selectedStatus });
    
    // Send update to server
    socket.emit('update_profile', {
        displayName: displayName || undefined,
        bio: bio || undefined,
        avatarColor: avatarColor,
        status: selectedStatus,
        profilePicture: 'default'
    });
    
    // Close modal
    closeSettings();
    showSystemMessage('Profile updated successfully!', 'success');
}

function closeSettings() {
    if (settingsModal) settingsModal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

// Make settings functions globally accessible
window.openSettings = openSettings;
window.saveNewSettings = saveNewSettings;
window.closeSettings = closeSettings;

function handleProfileUpdated(updatedProfile) {
    console.log('Profile updated received:', updatedProfile);
    
    // Update current user data
    currentUser = { ...currentUser, ...updatedProfile };
    
    // Update UI elements
    if (currentUserName) {
        currentUserName.textContent = currentUser.displayName || currentUser.username;
    }
    
    // Update localStorage
    localStorage.setItem('userData', JSON.stringify(currentUser));
    
    // Show success message
    showSystemMessage('Profile updated successfully!', 'success');
    
    closeSettings();
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        socket.disconnect();
        currentUser = null;
        location.reload();
    }
}

// UI functions
function showChat() {
    if (authScreen) {
        authScreen.classList.remove('active');
        authScreen.classList.add('hidden');
    }
    if (chatContainer) {
        chatContainer.classList.remove('hidden');
    }
    if (messageInput) messageInput.focus();
    
    // Update user info if elements exist
    if (currentUserName && currentUser) {
        currentUserName.textContent = currentUser.displayName || currentUser.username;
    }
    if (currentUserId && currentUser) {
        currentUserId.textContent = currentUser.userId || '#000000';
    }
}

function updateConnectionStatus(status, text) {
    if (connectionStatus) connectionStatus.className = `status-dot ${status}`;
    if (statusText) statusText.textContent = text;
}

function checkConnection() {
    if (socket.connected) {
        updateConnectionStatus('connected', 'Connected');
    } else {
        updateConnectionStatus('disconnected', 'Connecting...');
    }
}

function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function showSystemMessage(message, type = 'info') {
    if (!messagesContainer) return;
    
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

function updateUsersList(users) {
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    // Update user count displays
    if (userCount) userCount.textContent = users.length;
    if (footerUserCount) footerUserCount.textContent = users.length;
    
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        
        // Get profile picture
        const profilePic = getProfilePicture(user.profilePicture);
        
        li.innerHTML = `
            <div class="user-avatar" style="background-color: ${user.avatarColor || '#667eea'}">
                ${profilePic}
            </div>
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.displayName || user.username)}</div>
                ${user.bio ? `<div class="user-bio">${escapeHtml(user.bio)}</div>` : ''}
                ${user.userId ? `<div class="user-id">${escapeHtml(user.userId)}</div>` : ''}
            </div>
            <div class="status-indicator ${user.status || 'online'}"></div>
        `;
        usersList.appendChild(li);
    });
    
    console.log('Updated user list with', users.length, 'users');
}

function getProfilePicture(profileType) {
    const profilePictures = {
        'default': '👤',
        'avatar1': '👨‍💼',
        'avatar2': '👩‍💻',
        'avatar3': '🎨',
        'avatar4': '🚀',
        'avatar5': '🎮',
        'avatar6': '🌟',
        'avatar7': '🎭'
    };
    return profilePictures[profileType] || profilePictures['default'];
}

// Tab functions
function switchTab(e) {
    const tabName = e.currentTarget.dataset.tab;
    
    // Update tab appearance
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName === 'public' ? 'publicChatTab' : 'dmChatTab').classList.add('active');
}

function switchToDMTab() {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const dmTab = document.querySelector('[data-tab="dms"]');
    if (dmTab) dmTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const dmChatTab = document.getElementById('dmChatTab');
    if (dmChatTab) dmChatTab.classList.add('active');
}

// User search functions
function handleUserSearch() {
    if (!userSearchInput) return;
    
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

function startDirectMessage(user) {
    // Add user to DM list if not already there
    const dmList = document.getElementById('dmList');
    if (!dmList) return;
    
    const noDms = dmList.querySelector('.no-dms');
    if (noDms) {
        noDms.remove();
    }
    
    // Create DM conversation item
    const dmItem = document.createElement('div');
    dmItem.className = 'dm-item';
    dmItem.innerHTML = `
        <div class="dm-avatar" style="background-color: ${user.avatarColor || '#667eea'}">
            ${getProfilePicture(user.profilePicture)}
        </div>
        <div class="dm-info">
            <div class="dm-name">${escapeHtml(user.displayName || user.username)}</div>
            <div class="dm-id">${escapeHtml(user.userId)}</div>
        </div>
        <div class="status-indicator ${user.status || 'online'}"></div>
    `;
    
    dmList.appendChild(dmItem);
    
    showSystemMessage(`Direct message started with ${user.displayName || user.username}`, 'success');
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

    .reply-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px 8px 0 0;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
    }

    .reply-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .reply-icon {
        color: #6b7280;
    }

    .reply-cancel {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 1.25rem;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .reply-cancel:hover {
        background: #e5e7eb;
    }

    @keyframes messageSlideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
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

console.log('LinkLy chat application initialized successfully');