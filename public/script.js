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
        this.setupDiscordFeatures();
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
        document.getElementById('cancelSettings')?.addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveNewSettings());
        this.overlay?.addEventListener('click', () => this.closeSettings());
        
        // Settings tab functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-button')) {
                this.switchTab(e.target.dataset.tab);
            }
            if (e.target.matches('.color-preset')) {
                document.getElementById('newAvatarColor').value = e.target.dataset.color;
                this.updateColorPreview();
                this.updateAvatarPreview();
            }
        });
        
        // Real-time updates for settings
        document.getElementById('newDisplayName')?.addEventListener('input', (e) => {
            this.updateCounter('displayNameCounter', e.target.value.length);
            this.updateAvatarPreview();
        });
        
        document.getElementById('newBio')?.addEventListener('input', (e) => {
            this.updateCounter('bioCounter', e.target.value.length);
        });
        
        document.getElementById('newAvatarColor')?.addEventListener('input', () => {
            this.updateColorPreview();
            this.updateAvatarPreview();
        });
        
        document.getElementById('messageFont')?.addEventListener('input', (e) => {
            document.getElementById('currentFontSize').textContent = e.target.value + 'px';
        });
        
        // Enhanced message input features
        document.getElementById('emojiBtn')?.addEventListener('click', () => {
            this.toggleEmojiPicker();
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.matches('.emoji-option')) {
                this.insertEmoji(e.target.textContent);
            }
            if (!e.target.closest('.message-input-container')) {
                this.hideEmojiPicker();
            }
        });

        
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
        
        this.socket.on('session_verified', (userData) => {
            this.currentUser = userData;
            localStorage.setItem('authToken', userData.token || Date.now().toString());
            localStorage.setItem('userData', JSON.stringify(userData));
            this.showChat();
            this.hideAuthError();
            this.updateUserProfile();
            console.log('Session verified and data restored');
        });
        
        this.socket.on('session_invalid', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            this.currentUser = null;
            console.log('Session invalid, cleared local storage');
        });

        this.socket.on('auth_success', (userData) => {
            this.currentUser = userData;
            localStorage.setItem('authToken', userData.token || Date.now().toString());
            localStorage.setItem('userData', JSON.stringify(userData));
            this.showChat();
            this.hideAuthError();
            this.updateUserProfile();
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
            this.playNotificationSound();
            this.showDesktopNotification(message);
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
            const preferences = JSON.parse(localStorage.getItem('linkly_preferences') || '{}');
            if (preferences.showTyping !== false) {
                if (data.isTyping) {
                    this.typingIndicator.textContent = `${data.username} is typing...`;
                    this.typingIndicator.classList.remove('hidden');
                } else {
                    this.typingIndicator.classList.add('hidden');
                }
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
                const parsedUserData = JSON.parse(userData);
                // Verify session with server
                this.socket.emit('verify_session', { 
                    token: token, 
                    userData: parsedUserData 
                });
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
            <div class="channel-start">
                <div class="channel-start-icon">#</div>
                <h2 class="channel-start-title">Welcome to #general</h2>
                <p class="channel-start-description">This is the beginning of the <strong>#general</strong> channel.</p>
                <div class="channel-guidelines">
                    <div class="guideline-item">
                        <span class="guideline-icon">📋</span>
                        <div class="guideline-text">
                            <strong>Channel Guidelines</strong>
                            <p>Keep conversations respectful and on-topic</p>
                        </div>
                    </div>
                    <div class="guideline-item">
                        <span class="guideline-icon">💬</span>
                        <div class="guideline-text">
                            <strong>Getting Started</strong>
                            <p>Say hello and introduce yourself to the community!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    displayMessage(message, scroll = true) {
        if (!this.messagesContainer) return;
        
        // Remove channel start when first real message arrives
        const channelStart = this.messagesContainer.querySelector('.channel-start');
        if (channelStart) {
            channelStart.remove();
        }
        
        // Check if we should group with previous message (Discord-style)
        const lastMessage = this.messagesContainer.lastElementChild;
        const shouldGroup = this.shouldGroupMessage(lastMessage, message);
        
        if (shouldGroup) {
            // Add to existing message group
            this.addToMessageGroup(lastMessage, message);
        } else {
            // Create new message group
            this.createNewMessageGroup(message);
        }
        
        if (scroll) {
            this.scrollToBottom();
        }
    }
    
    shouldGroupMessage(lastMessageElement, newMessage) {
        if (!lastMessageElement || !lastMessageElement.classList.contains('message-group')) return false;
        
        const lastUsername = lastMessageElement.dataset.username;
        const lastTimestamp = parseInt(lastMessageElement.dataset.timestamp);
        const newTimestamp = new Date(newMessage.timestamp).getTime();
        
        // Group if same user and within 5 minutes
        return lastUsername === newMessage.username && (newTimestamp - lastTimestamp) < 5 * 60 * 1000;
    }
    
    addToMessageGroup(messageGroup, message) {
        const messagesContent = messageGroup.querySelector('.message-group-content');
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.escapeHtml(message.message);
        messagesContent.appendChild(messageContent);
        
        // Update timestamp
        messageGroup.dataset.timestamp = new Date(message.timestamp).getTime();
        const timeElement = messageGroup.querySelector('.message-time');
        if (timeElement) {
            timeElement.textContent = new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }
    
    createNewMessageGroup(message) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        messageGroup.dataset.username = message.username;
        messageGroup.dataset.timestamp = new Date(message.timestamp).getTime();
        
        if (message.username === (this.currentUser?.displayName || this.currentUser?.username)) {
            messageGroup.classList.add('own-message');
        }
        
        const timeStr = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const userInitial = message.username ? message.username.charAt(0).toUpperCase() : 'U';
        const avatarColor = message.avatarColor || '#667eea';
        
        messageGroup.innerHTML = `
            <div class="message-avatar" style="background: ${avatarColor}">
                ${userInitial}
            </div>
            <div class="message-group-content">
                <div class="message-header">
                    <span class="message-author">${this.escapeHtml(message.displayName || message.username)}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(messageGroup);
        
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
                    <p>#${user.userId || '000000'}</p>
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
    
    // Enhanced Settings Methods
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
        document.getElementById('showUsername').textContent = this.currentUser.username || 'N/A';
        document.getElementById('showEmail').textContent = this.currentUser.email || 'N/A';
        
        // Update character counters
        this.updateCounter('displayNameCounter', document.getElementById('newDisplayName').value.length);
        this.updateCounter('bioCounter', document.getElementById('newBio').value.length);
        
        // Update color preview and avatar preview
        this.updateColorPreview();
        this.updateAvatarPreview();
        
        // Set status
        this.selectedStatus = this.currentUser.status || 'online';
        document.querySelectorAll('.status-option').forEach(option => {
            option.classList.toggle('active', option.dataset.status === this.selectedStatus);
        });
        
        // Load preferences from localStorage
        this.loadPreferences();
        
        // Load app stats
        this.loadAppStats();
        
        this.settingsModal?.classList.add('active');
        this.overlay?.classList.remove('hidden');
        
        // Set first tab as active
        this.switchTab('profile');
    }
    
    closeSettings() {
        this.settingsModal?.classList.remove('active');
        this.overlay?.classList.add('hidden');
    }
    
    saveNewSettings() {
        const displayName = document.getElementById('newDisplayName').value.trim();
        const bio = document.getElementById('newBio').value.trim();
        const avatarColor = document.getElementById('newAvatarColor').value;
        
        // Save preferences
        this.savePreferences();
        
        // Update profile
        this.socket.emit('update_profile', {
            displayName: displayName || undefined,
            bio: bio || undefined,
            avatarColor: avatarColor,
            status: this.selectedStatus,
            profilePicture: 'default'
        });
        
        this.showSystemMessage('Settings saved successfully!', 'info');
        setTimeout(() => {
            this.closeSettings();
        }, 1000);
    }
    
    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    updateCounter(counterId, length) {
        const counter = document.getElementById(counterId);
        if (counter) {
            counter.textContent = length;
        }
    }
    
    updateColorPreview() {
        const colorInput = document.getElementById('newAvatarColor');
        const colorPreview = document.getElementById('colorPreview');
        if (colorInput && colorPreview) {
            colorPreview.style.background = colorInput.value;
        }
    }
    
    updateAvatarPreview() {
        const displayName = document.getElementById('newDisplayName').value;
        const avatarColor = document.getElementById('newAvatarColor').value;
        const avatarPreview = document.getElementById('avatarPreview');
        
        if (avatarPreview) {
            const initial = (displayName || this.currentUser?.username || 'U').charAt(0).toUpperCase();
            avatarPreview.textContent = initial;
            avatarPreview.style.background = avatarColor;
        }
    }
    
    loadPreferences() {
        const preferences = JSON.parse(localStorage.getItem('linkly_preferences') || '{}');
        
        document.getElementById('soundNotifications').checked = preferences.soundNotifications !== false;
        document.getElementById('desktopNotifications').checked = preferences.desktopNotifications === true;
        document.getElementById('autoScroll').checked = preferences.autoScroll !== false;
        document.getElementById('showTyping').checked = preferences.showTyping !== false;
        document.getElementById('messageFont').value = preferences.messageFontSize || 14;
        document.getElementById('currentFontSize').textContent = (preferences.messageFontSize || 14) + 'px';
        
        // Apply font size immediately
        document.documentElement.style.setProperty('--message-font-size', (preferences.messageFontSize || 14) + 'px');
    }
    
    savePreferences() {
        const preferences = {
            soundNotifications: document.getElementById('soundNotifications').checked,
            desktopNotifications: document.getElementById('desktopNotifications').checked,
            autoScroll: document.getElementById('autoScroll').checked,
            showTyping: document.getElementById('showTyping').checked,
            messageFontSize: parseInt(document.getElementById('messageFont').value)
        };
        
        localStorage.setItem('linkly_preferences', JSON.stringify(preferences));
        
        // Apply font size immediately
        document.documentElement.style.setProperty('--message-font-size', preferences.messageFontSize + 'px');
    }
    
    loadAppStats() {
        // Request stats from server
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalMessages').textContent = data.totalMessages || 0;
                document.getElementById('totalUsers').textContent = this.userCount?.textContent || 0;
                
                // Calculate uptime (mock for now)
                const uptime = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
                document.getElementById('uptime').textContent = uptime + 'd';
            })
            .catch(error => {
                console.log('Could not load app stats');
            });
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSystemMessage('Copied to clipboard!', 'info');
        }).catch(() => {
            this.showSystemMessage('Failed to copy to clipboard', 'error');
        });
    }
    
    // Enhanced messaging features
    playNotificationSound() {
        const preferences = JSON.parse(localStorage.getItem('linkly_preferences') || '{}');
        if (preferences.soundNotifications !== false) {
            // Create a subtle notification sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (error) {
                console.log('Could not play notification sound');
            }
        }
    }
    
    showDesktopNotification(message) {
        const preferences = JSON.parse(localStorage.getItem('linkly_preferences') || '{}');
        if (preferences.desktopNotifications === true && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(`${message.username}`, {
                    body: message.message,
                    icon: '/logo.png',
                    tag: 'linkly-message'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.showDesktopNotification(message);
                    }
                });
            }
        }
    }
    
    scrollToBottom() {
        if (this.messagesContainer) {
            const preferences = JSON.parse(localStorage.getItem('linkly_preferences') || '{}');
            if (preferences.autoScroll !== false) {
                this.messagesContainer.scrollTo({
                    top: this.messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
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
    
    // Enhanced UI Methods
    toggleEmojiPicker() {
        const emojiPicker = document.getElementById('emojiPicker');
        emojiPicker?.classList.toggle('hidden');
    }
    
    hideEmojiPicker() {
        const emojiPicker = document.getElementById('emojiPicker');
        emojiPicker?.classList.add('hidden');
    }
    
    insertEmoji(emoji) {
        const messageInput = this.messageInput;
        if (messageInput) {
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const value = messageInput.value;
            messageInput.value = value.substring(0, start) + emoji + value.substring(end);
            messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
            messageInput.focus();
            this.hideEmojiPicker();
        }
    }
    
    setupDiscordFeatures() {
        // Search messages functionality
        const searchBtn = document.getElementById('searchMessages');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.showSearchOverlay();
            });
        }
        
        // Add message reactions on hover
        this.setupMessageHoverEffects();
        
        // Add keyboard shortcuts (Discord-like)
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearchOverlay();
            }
            
            // Escape to close overlays
            if (e.key === 'Escape') {
                this.closeAllOverlays();
            }
        });
    }
    
    setupMessageHoverEffects() {
        // Use event delegation for dynamic messages
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener('mouseenter', (e) => {
                if (e.target.closest('.message-group')) {
                    const messageGroup = e.target.closest('.message-group');
                    messageGroup.classList.add('hovered');
                }
            }, true);
            
            this.messagesContainer.addEventListener('mouseleave', (e) => {
                if (e.target.closest('.message-group')) {
                    const messageGroup = e.target.closest('.message-group');
                    messageGroup.classList.remove('hovered');
                }
            }, true);
        }
    }
    
    showSearchOverlay() {
        // Create search overlay if it doesn't exist
        let searchOverlay = document.getElementById('searchOverlay');
        if (!searchOverlay) {
            searchOverlay = document.createElement('div');
            searchOverlay.id = 'searchOverlay';
            searchOverlay.className = 'search-overlay';
            searchOverlay.innerHTML = `
                <div class="search-modal">
                    <div class="search-header">
                        <input type="text" id="searchInput" class="search-input-modal" placeholder="Search messages..." autofocus>
                        <button class="search-close" onclick="this.closest('.search-overlay').remove()">×</button>
                    </div>
                    <div class="search-results">
                        <div class="search-placeholder">Start typing to search messages...</div>
                    </div>
                </div>
            `;
            document.body.appendChild(searchOverlay);
            
            // Add search functionality
            const searchInput = searchOverlay.querySelector('#searchInput');
            searchInput.addEventListener('input', (e) => {
                this.performMessageSearch(e.target.value);
            });
        }
        
        searchOverlay.style.display = 'flex';
        searchOverlay.querySelector('#searchInput').focus();
    }
    
    performMessageSearch(query) {
        // This would typically search through message history
        // For now, we'll show a placeholder
        const searchResults = document.querySelector('.search-results');
        if (query.trim()) {
            searchResults.innerHTML = `
                <div class="search-placeholder">
                    <div class="search-icon">🔍</div>
                    <p>Search functionality coming soon!</p>
                    <p class="search-hint">We're working on implementing message search across your conversation history.</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = '<div class="search-placeholder">Start typing to search messages...</div>';
        }
    }
    
    closeAllOverlays() {
        const searchOverlay = document.getElementById('searchOverlay');
        if (searchOverlay) {
            searchOverlay.remove();
        }
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