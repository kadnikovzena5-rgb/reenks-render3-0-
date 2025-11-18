class REENKSApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentTab = 'news';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectToServer();
        this.showNotification('🚀 REENKS 3.0 загружен!', 'success');
    }

    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Создание поста
        document.getElementById('publishPost').addEventListener('click', () => {
            this.createPost();
        });

        // Enter для создания поста
        document.getElementById('postInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.createPost();
            }
        });

        // Закрытие модального окна
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });
    }

    connectToServer() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 10000
            });

            this.socket.on('connect', () => {
                this.showNotification('✅ Подключено к серверу', 'success');
            });

            this.socket.on('registered', (data) => {
                this.handleRegistration(data);
            });

            this.socket.on('logged-in', (data) => {
                this.handleLogin(data);
            });

            this.socket.on('auth-error', (data) => {
                this.showNotification(`❌ ${data.message}`, 'error');
            });

            this.socket.on('new-post', (post) => {
                this.addPostToFeed(post);
            });

            this.socket.on('user-online', (user) => {
                this.showNotification(`👋 ${user.firstName} онлайн`, 'info');
            });

            this.socket.on('user-offline', (user) => {
                this.showNotification(`👋 ${user.firstName} вышел`, 'info');
            });

            this.socket.on('disconnect', () => {
                this.showNotification('🔌 Соединение прервано', 'error');
            });

        } catch (error) {
            console.error('Connection error:', error);
            this.showNotification('❌ Ошибка подключения', 'error');
        }
    }

    switchTab(tabName) {
        // Скрыть все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Убрать активный класс со всех табов
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Показать выбранную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Активировать соответствующий таб
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.currentTab = tabName;

        // Особые действия при переключении вкладок
        if (tabName === 'games' && window.spaceGame) {
            window.spaceGame.render();
        }
    }

    createPost() {
        if (!this.currentUser) {
            this.showNotification('⚠️ Сначала войдите в аккаунт', 'error');
            this.switchTab('profile');
            return;
        }

        const postInput = document.getElementById('postInput');
        const content = postInput.value.trim();

        if (!content) {
            this.showNotification('📝 Введите текст поста', 'error');
            return;
        }

        if (content.length > 500) {
            this.showNotification('⚠️ Пост не более 500 символов', 'error');
            return;
        }

        this.socket.emit('create-post', { content });
        postInput.value = '';
        this.showNotification('📝 Пост опубликован!', 'success');
    }

    addPostToFeed(post) {
        const postsFeed = document.getElementById('postsFeed');
        
        // Убираем сообщение о пустой ленте
        if (postsFeed.querySelector('.empty-state')) {
            postsFeed.innerHTML = '';
        }

        const postElement = this.createPostElement(post);
        postsFeed.insertBefore(postElement, postsFeed.firstChild);
    }

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'glass-card post';
        postDiv.innerHTML = `
            <div class="post-header">
                <img src="${post.author.avatar}" alt="${post.author.firstName}" class="user-avatar-small">
                <div>
                    <div class="post-author">${post.author.firstName} ${post.author.lastName}</div>
                    <div class="post-time">${this.formatTime(post.createdAt)}</div>
                </div>
            </div>
            <div class="post-content">${this.escapeHTML(post.content)}</div>
            <div class="post-stats">
                <span>❤️ ${post.likes} лайков</span>
                <span>💬 ${post.comments.length} комментариев</span>
                <span>👁️ ${Math.floor(Math.random() * 50)} просмотров</span>
            </div>
            <div class="post-actions-bar">
                <div class="post-action" onclick="app.likePost('${post.id}')">
                    ❤️ Нравится
                </div>
                <div class="post-action" onclick="app.commentOnPost('${post.id}')">
                    💬 Комментировать
                </div>
                <div class="post-action" onclick="app.sharePost('${post.id}')">
                    🔗 Поделиться
                </div>
            </div>
            ${post.comments && post.comments.length > 0 ? `
                <div style="margin-top: 1rem; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">Комментарии:</div>
                    ${post.comments.map(comment => `
                        <div style="display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <img src="${comment.author.avatar}" alt="Аватар" style="width: 30px; height: 30px; border-radius: 50%;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 0.9rem;">${comment.author.firstName}</div>
                                <div style="font-size: 0.9rem;">${this.escapeHTML(comment.content)}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                                    ${this.formatTime(comment.createdAt)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        return postDiv;
    }

    likePost(postId) {
        if (!this.currentUser) {
            this.showNotification('⚠️ Сначала войдите в аккаунт', 'error');
            return;
        }
        this.socket.emit('like-post', postId);
    }

    commentOnPost(postId) {
        if (!this.currentUser) {
            this.showNotification('⚠️ Сначала войдите в аккаунт', 'error');
            return;
        }
        
        const comment = prompt('Введите ваш комментарий:');
        if (comment && comment.trim()) {
            this.socket.emit('add-comment', {
                postId: postId,
                content: comment.trim()
            });
        }
    }

    sharePost(postId) {
        if (navigator.share) {
            navigator.share({
                title: 'REENKS - Интересный пост',
                text: 'Посмотрите этот пост в REENKS!',
                url: window.location.href
            });
        } else {
            this.showNotification('🔗 Ссылка скопирована в буфер обмена', 'success');
            // В реальном приложении здесь была бы логика копирования
        }
    }

    handleRegistration(data) {
        this.currentUser = data.user;
        this.updateUIAfterAuth();
        this.showNotification(`🎉 Добро пожаловать, ${data.user.firstName}!`, 'success');
    }

    handleLogin(data) {
        this.currentUser = data.user;
        this.updateUIAfterAuth();
        
        // Загружаем ленту
        if (data.feed && data.feed.length > 0) {
            data.feed.forEach(post => this.addPostToFeed(post));
        }

        this.showNotification(`👋 С возвращением, ${data.user.firstName}!`, 'success');
    }

    updateUIAfterAuth() {
        // Показываем профиль и скрываем формы авторизации
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('profileSection').style.display = 'block';

        // Обновляем данные профиля
        document.getElementById('profileName').textContent = 
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('profileUsername').textContent = 
            `@${this.currentUser.username}`;
        document.getElementById('profileBio').textContent = 
            this.currentUser.bio || 'Расскажите о себе...';
        document.getElementById('profileAvatar').src = this.currentUser.avatar;
        document.getElementById('currentUserAvatar').src = this.currentUser.avatar;
        document.getElementById('navAvatar').textContent = this.currentUser.firstName[0];

        // Обновляем навбар
        document.querySelector('.nav-actions .user-avatar').textContent = 
            this.currentUser.firstName[0];
    }

    logout() {
        this.currentUser = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('profileSection').style.display = 'none';
        document.getElementById('postsFeed').innerHTML = `
            <div class="glass-card empty-state">
                <div class="empty-icon">📝</div>
                <h3>Лента пуста</h3>
                <p>Будьте первым, кто опубликует пост!</p>
            </div>
        `;
        this.showNotification('👋 До встречи!', 'info');
    }

    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const messageEl = document.getElementById('toastMessage');
        
        messageEl.textContent = message;
        toast.className = `notification-toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalOverlay').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none';
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        if (days < 7) return `${days} дн назад`;
        
        return time.toLocaleDateString('ru-RU');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
const app = new REENKSApp();