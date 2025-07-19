// Modern LinkLy Chat Application - Complete JavaScript Redesign
class LinkLyApp {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.isTyping = false;
        this.typingTimeout = null;
        this.selectedStatus = 'online';
        this.messageCount = 0;
        
        this.init();
    }
    
    init() {
        this.bindElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.checkExistingSession();
        this.animateAuthScreen();
    }
    
    bindElements() {
        // Auth elements
        this.authScreen = document.getElementById('authScreen');
        this.chatContainer = document.getElementById('chatContainer');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.authError = document.getElementById('authError');
        
        // Chat elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.usersList = document.getElementById('usersList');
        this.userCount = document.getElementById('userCount');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('statusText');
        this.currentUserName = document.getElementById('currentUserName');
        this.currentUserId = document.getElementById('currentUserId');
        this.currentUserAvatar = document.getElementById('currentUserAvatar');
        this.userSearchInput = document.getElementById('userSearchInput');
        this.settingsModal = document.getElementById('settingsModal');
        this.overlay = document.getElementById('overlay');
    }
    
    setupEventListeners() {
        // Auth form switching
        document.getElementById('showSignUp')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToSignUp();
        });
        
        document.getElementById('showSignIn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToSignIn();
        });
        
        // Form submissions
        this.loginForm?.addEventListener('submit', (e) => this.handleSignIn(e));
        this.registerForm?.addEventListener('submit', (e) => this.handleSignUp(e));
        
        // Message input
        this.messageInput?.addEventListener('keydown', (e) => this.handleMessageKeydown(e));
        this.messageInput?.addEventListener('input', () => this.handleTyping());
        this.sendButton?.addEventListener('click', () => this.sendMessage());
        
        // User search
        this.userSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleUserSearch();
            }
        });
        
        // Settings and logout
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSettings());
        this.overlay?.addEventListener('click', () => this.closeSettings());
        
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
        
        // Status selector
        document.querySelectorAll('.status-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.selectedStatus = option.dataset.status;
            });
        });
        
        // Auto-resize message input
        this.messageInput?.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }
    
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus('connected', 'Connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('disconnected', 'Disconnected');
        });
        
        this.socket.on('auth_success', (userData) => {
            this.currentUser = userData;
            localStorage.setItem('authToken', userData.token || Date.now().toString());
            localStorage.setItem('userData', JSON.stringify(userData));
            this.showChat();
            this.hideAuthError();
            this.updateUserProfile();
            
            // Request updated user list
            setTimeout(() => {
                this.socket.emit('get_users');
            }, 500);
        });
        
        this.socket.on('auth_error', (error) => {
            this.showAuthError(error);
            this.resetAuthForms();
        });
        
        this.socket.on('message_history', (messages) => {
            this.displayMessageHistory(messages);
        });
        
        this.socket.on('new_message', (message) => {
            this.displayMessage(message);
            this.messageCount++;
        });
        
        this.socket.on('users_update', (users) => {
            this.updateUsersList(users);
        });
        
        this.socket.on('user_joined', (username) => {
            if (username !== (this.currentUser?.displayName || this.currentUser?.username)) {
                this.showSystemMessage(`${username} joined the chat`, 'info');
            }
        });
        
        this.socket.on('user_left', (username) => {
            this.showSystemMessage(`${username} left the chat`, 'info');
        });
        
        this.socket.on('user_typing', (data) => {
            if (data.isTyping) {
                this.typingIndicator.textContent = `${data.username} is typing...`;
                this.typingIndicator.classList.remove('hidden');
            } else {
                this.typingIndicator.classList.add('hidden');
            }
        });
        
        this.socket.on('profile_updated', (updatedProfile) => {
            this.currentUser = { ...this.currentUser, ...updatedProfile };
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.updateUserProfile();
            this.closeSettings();
            this.showSystemMessage('Profile updated successfully!', 'success');
        });
        
        this.socket.on('user_search_result', (result) => {
            if (result.found) {
                this.showSystemMessage(`Found user: ${result.user.displayName || result.user.username} (${result.user.userId})`, 'success');
            } else {
                this.showSystemMessage('User not found or is invisible', 'error');
            }
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showSystemMessage('Connection error: ' + error, 'error');
        });
    }
    
    checkExistingSession() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showChat();
                this.socket.emit('validate_token', token);
            } catch (error) {
                console.error('Session restore failed:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
            }
        }
    }
    
    animateAuthScreen() {
        // Add staggered animation to feature list
        const features = document.querySelectorAll('.brand-features li');
        features.forEach((feature, index) => {
            feature.style.opacity = '0';
            feature.style.transform = 'translateX(-30px)';
            setTimeout(() => {
                feature.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                feature.style.opacity = '1';
                feature.style.transform = 'translateX(0)';
            }, index * 200);
        });
    }
    
    // Auth Methods
    switchToSignUp() {
        this.loginForm?.classList.remove('active');
        this.registerForm?.classList.add('active');
        this.hideAuthError();
        this.animateFormSwitch();
    }
    
    switchToSignIn() {
        this.registerForm?.classList.remove('active');
        this.loginForm?.classList.add('active');
        this.hideAuthError();
        this.animateFormSwitch();
    }
    
    animateFormSwitch() {
        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            activeForm.style.transform = 'translateY(20px)';
            activeForm.style.opacity = '0';
            setTimeout(() => {
                activeForm.style.transform = 'translateY(0)';
                activeForm.style.opacity = '1';
            }, 100);
        }
    }
    
    handleSignIn(e) {
        e.preventDefault();
        
        const emailOrUsername = document.getElementById('signInEmail').value.trim();
        const password = document.getElementById('signInPassword').value;
        
        if (!emailOrUsername || !password) {
            this.showAuthError('Email/username and password are required');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters long');
            return;
        }
        
        this.showButtonLoading(this.loginForm.querySelector('.auth-button'));
        this.socket.emit('authenticate', { emailOrUsername, password });
    }
    
    handleSignUp(e) {
        e.preventDefault();
        
        const username = document.getElementById('signUpUsername').value.trim();
        const email = document.getElementById('signUpEmail').value.trim();
        const password = document.getElementById('signUpPassword').value;
        const displayName = document.getElementById('signUpDisplayName').value.trim();
        
        if (!username || !email || !password) {
            this.showAuthError('Username, email, and password are required');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters long');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showAuthError('Please enter a valid email address');
            return;
        }
        
        this.showButtonLoading(this.registerForm.querySelector('.auth-button'));
        this.socket.emit('register', {
            username,
            email,
            password,
            displayName: displayName || username
        });
    }
    
    showButtonLoading(button) {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.loading-spinner');
        btnText?.classList.add('hidden');
        spinner?.classList.remove('hidden');
    }
    
    resetAuthForms() {
        document.querySelectorAll('.btn-text').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.loading-spinner').forEach(el => el.classList.add('hidden'));
    }
    
    showAuthError(message) {
        if (this.authError) {
            this.authError.textContent = message;
            this.authError.classList.remove('hidden');
            this.authError.style.animation = 'shake 0.5s ease-in-out';
        }
    }
    
    hideAuthError() {
        if (this.authError) {
            this.authError.classList.add('hidden');
        }
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Chat Methods
    showChat() {
        this.authScreen?.classList.remove('active');
        this.authScreen?.classList.add('hidden');
        this.chatContainer?.classList.remove('hidden');
        this.messageInput?.focus();
        
        // Animate chat entrance
        setTimeout(() => {
            this.chatContainer.style.opacity = '0';
            this.chatContainer.style.transform = 'translateY(20px)';
            this.chatContainer.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                this.chatContainer.style.opacity = '1';
                this.chatContainer.style.transform = 'translateY(0)';
            }, 50);
        }, 100);
    }
    
    updateUserProfile() {
        if (this.currentUser) {
            this.currentUserName.textContent = this.currentUser.displayName || this.currentUser.username;
            this.currentUserId.textContent = this.currentUser.userId || '#000000';
            
            // Update avatar
            const avatar = this.currentUser.displayName || this.currentUser.username || 'U';
            this.currentUserAvatar.textContent = avatar.charAt(0).toUpperCase();
            this.currentUserAvatar.style.background = this.currentUser.avatarColor || 'var(--accent-gradient)';
        }
    }
    
    handleMessageKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }
    
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', true);
        }
        
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('typing', false);
        }, 1000);
    }
    
    sendMessage() {
        if (!this.messageInput) return;
        
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Add send animation
        this.sendButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.sendButton.style.transform = 'scale(1)';
        }, 150);
        
        this.socket.emit('send_message', { message });
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        // Stop typing indicator
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.emit('typing', false);
            clearTimeout(this.typingTimeout);
        }
    }
    
    displayMessageHistory(messages) {
        if (!this.messagesContainer) return;
        
        this.messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            this.showWelcomeMessage();
        } else {
            messages.forEach((message, index) => {
                setTimeout(() => {
                    this.displayMessage(message, false);
                }, index * 100); // Staggered animation
            });
        }
        
        this.scrollToBottom();
    }
    
    showWelcomeMessage() {
        if (!this.messagesContainer) return;
        
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <div class="welcome-icon">🚀</div>
                    <h3>Welcome to LinkLy!</h3>
                    <p>Start a conversation and connect with your team. Send your first message to get the conversation rolling!</p>
                </div>
            </div>
        `;
    }
    
    displayMessage(message, scroll = true) {
        if (!this.messagesContainer) return;
        
        // Remove welcome message
        const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.opacity = '0';
            welcomeMsg.style.transform = 'translateY(-20px)';
            setTimeout(() => welcomeMsg.remove(), 300);
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        const isOwn = this.currentUser && message.username === (this.currentUser.displayName || this.currentUser.username);
        if (isOwn) {
            messageEl.classList.add('own-message');
        }
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const avatar = message.username.charAt(0).toUpperCase();
        
        messageEl.innerHTML = `
            <div class="message-bubble">
                <div class="message-header">
                    <div class="message-avatar">${avatar}</div>
                    <span class="message-author">${this.escapeHtml(message.username)}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageEl);
        
        if (scroll) {
            this.scrollToBottom();
        }
    }
    
    updateUsersList(users) {
        if (!this.usersList) return;
        
        this.usersList.innerHTML = '';
        this.userCount.textContent = users.length;
        
        users.forEach((user, index) => {
            const li = document.createElement('li');
            li.className = 'user-item';
            
            const avatar = (user.displayName || user.username).charAt(0).toUpperCase();
            
            li.innerHTML = `
                <div class="user-item-avatar" style="background: ${user.avatarColor || 'var(--accent-gradient)'}">
                    ${avatar}
                    <div class="status-dot ${user.status || 'online'}"></div>
                </div>
                <div class="user-item-info">
                    <h4>${this.escapeHtml(user.displayName || user.username)}</h4>
                    <p>${user.bio ? this.escapeHtml(user.bio) : user.userId}</p>
                </div>
            `;
            
            // Add staggered animation
            li.style.opacity = '0';
            li.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                li.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                li.style.opacity = '1';
                li.style.transform = 'translateX(0)';
            }, index * 50);
            
            this.usersList.appendChild(li);
        });
    }
    
    handleUserSearch() {
        if (!this.userSearchInput) return;
        
        const searchTerm = this.userSearchInput.value.trim();
        if (!searchTerm) return;
        
        const formattedId = searchTerm.startsWith('#') ? searchTerm : '#' + searchTerm;
        
        if (formattedId.length !== 7 || !/^#\d{6}$/.test(formattedId)) {
            this.showSystemMessage('Please enter a valid User ID format (#123456)', 'error');
            return;
        }
        
        this.socket.emit('search_user', { userId: formattedId });
        this.userSearchInput.value = '';
    }
    
    // Settings Methods
    openSettings() {
        if (!this.currentUser) {
            this.showSystemMessage('Please login first', 'error');
            return;
        }
        
        // Populate settings form
        document.getElementById('newDisplayName').value = this.currentUser.displayName || this.currentUser.username || '';
        document.getElementById('newBio').value = this.currentUser.bio || '';
        document.getElementById('newAvatarColor').value = this.currentUser.avatarColor || '#667eea';
        document.getElementById('showUserId').textContent = this.currentUser.userId || '#000000';
        document.getElementById('showLyCode').textContent = this.currentUser.lyCode || 'LY000000';
        
        // Set status
        this.selectedStatus = this.currentUser.status || 'online';
        document.querySelectorAll('.status-option').forEach(option => {
            option.classList.toggle('active', option.dataset.status === this.selectedStatus);
        });
        
        this.settingsModal?.classList.add('active');
        this.overlay?.classList.remove('hidden');
    }
    
    closeSettings() {
        this.settingsModal?.classList.remove('active');
        this.overlay?.classList.add('hidden');
    }
    
    saveNewSettings() {
        const displayName = document.getElementById('newDisplayName').value.trim();
        const bio = document.getElementById('newBio').value.trim();
        const avatarColor = document.getElementById('newAvatarColor').value;
        
        this.socket.emit('update_profile', {
            displayName: displayName || undefined,
            bio: bio || undefined,
            avatarColor: avatarColor,
            status: this.selectedStatus,
            profilePicture: 'default'
        });
    }
    
    handleLogout() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            this.socket.disconnect();
            this.currentUser = null;
            location.reload();
        }
    }
    
    // Utility Methods
    updateConnectionStatus(status, text) {
        if (this.connectionStatus) {
            this.connectionStatus.className = `status-indicator ${status}`;
        }
        if (this.statusText) {
            this.statusText.textContent = text;
        }
    }
    
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTo({
                top: this.messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
    
    showSystemMessage(message, type = 'info') {
        if (!this.messagesContainer) return;
        
        const systemMessage = document.createElement('div');
        systemMessage.className = `system-message ${type}`;
        systemMessage.textContent = message;
        
        // Add entrance animation
        systemMessage.style.opacity = '0';
        systemMessage.style.transform = 'scale(0.8)';
        this.messagesContainer.appendChild(systemMessage);
        
        setTimeout(() => {
            systemMessage.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            systemMessage.style.opacity = '1';
            systemMessage.style.transform = 'scale(1)';
        }, 50);
        
        this.scrollToBottom();
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (systemMessage.parentNode) {
                systemMessage.style.opacity = '0';
                systemMessage.style.transform = 'translateY(-20px)';
                setTimeout(() => systemMessage.remove(), 300);
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for HTML onclick handlers
function closeSettings() {
    app.closeSettings();
}

function saveNewSettings() {
    app.saveNewSettings();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes messageSlideIn {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    .message {
        animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .user-item:hover {
        transform: translateX(5px);
    }
    
    .auth-button:active {
        transform: translateY(-1px) scale(0.98);
    }
    
    .send-button:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LinkLyApp();
    console.log('LinkLy Modern Chat Application initialized');
});