class Messenger {
    constructor(app) {
        this.app = app;
        this.currentChat = null;
        this.chats = new Map();
        this.init();
    }

    init() {
        this.setupMessengerListeners();
        this.setupSocketListeners();
    }

    setupMessengerListeners() {
        // Новый чат
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.showNewChatModal();
        });

        // Отправка сообщения
        document.getElementById('sendMessageBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    setupSocketListeners() {
        this.app.socket.on('chat-created', (chat) => {
            this.addChat(chat);
        });

        this.app.socket.on('new-message', (data) => {
            this.receiveMessage(data.chatId, data.message);
        });
    }

    showNewChatModal() {
        if (!this.app.currentUser) {
            this.app.showNotification('⚠️ Сначала войдите в аккаунт', 'error');
            return;
        }

        // В реальном приложении здесь был бы список пользователей
        const content = `
            <div class="user-list">
                <p>Выберите пользователя для начала чата:</p>
                <div class="user-item" data-userid="user2">
                    <img src="https://ui-avatars.com/api/?name=Мария+Иванова&background=ff6b6b&color=fff" 
                         alt="Мария" class="user-avatar-small">
                    <div>
                        <strong>Мария Иванова</strong>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">@maria_ivanova</div>
                    </div>
                </div>
                <div class="user-item" data-userid="user3">
                    <img src="https://ui-avatars.com/api/?name=Дмитрий+Сидоров&background=48bb78&color=fff" 
                         alt="Дмитрий" class="user-avatar-small">
                    <div>
                        <strong>Дмитрий Сидоров</strong>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">@dmitry_sidorov</div>
                    </div>
                </div>
            </div>
            <style>
                .user-list { margin: 1rem 0; }
                .user-item { 
                    display: flex; 
                    align-items: center; 
                    gap: 1rem; 
                    padding: 1rem; 
                    border-radius: 12px; 
                    cursor: pointer;
                    transition: background 0.3s ease;
                    margin-bottom: 0.5rem;
                }
                .user-item:hover { background: rgba(255,255,255,0.1); }
            </style>
        `;

        this.app.showModal('💬 Новый чат', content);

        // Обработчики для выбора пользователя
        setTimeout(() => {
            document.querySelectorAll('.user-item').forEach(item => {
                item.addEventListener('click', () => {
                    const userId = item.dataset.userid;
                    this.createChat(userId);
                    this.app.hideModal();
                });
            });
        }, 100);
    }

    createChat(targetUserId) {
        this.app.socket.emit('create-chat', targetUserId);
    }

    addChat(chat) {
        this.chats.set(chat.id, chat);
        this.renderChatsList();
        
        if (!this.currentChat) {
            this.selectChat(chat.id);
        }
    }

    renderChatsList() {
        const chatsList = document.getElementById('chatsList');
        
        if (this.chats.size === 0) {
            chatsList.innerHTML = `
                <div class="empty-chats">
                    <div class="empty-icon">💬</div>
                    <p>Чатов пока нет</p>
                </div>
            `;
            return;
        }

        chatsList.innerHTML = '';
        this.chats.forEach(chat => {
            const otherUser = this.getOtherUser(chat);
            const lastMessage = chat.messages[chat.messages.length - 1];
            
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}`;
            chatElement.dataset.chatId = chat.id;
            chatElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${otherUser.avatar}" alt="${otherUser.firstName}" class="user-avatar-small">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${otherUser.firstName} ${otherUser.lastName}</div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">
                            ${lastMessage ? this.truncateText(lastMessage.content, 30) : 'Нет сообщений'}
                        </div>
                    </div>
                    ${lastMessage ? `
                        <div style="color: var(--text-muted); font-size: 0.8rem;">
                            ${this.app.formatTime(lastMessage.timestamp)}
                        </div>
                    ` : ''}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.selectChat(chat.id);
            });
            
            chatsList.appendChild(chatElement);
        });
    }

    selectChat(chatId) {
        const chat = this.chats.get(chatId);
        if (!chat) return;

        this.currentChat = chat;
        this.renderChatsList();
        this.renderMessages();
        
        // Показываем поле ввода сообщения
        document.getElementById('messageInputContainer').style.display = 'flex';
        
        // Обновляем заголовок чата
        const otherUser = this.getOtherUser(chat);
        document.getElementById('chatPartner').innerHTML = `
            <img src="${otherUser.avatar}" alt="${otherUser.firstName}" class="user-avatar-small">
            <div>
                <strong>${otherUser.firstName} ${otherUser.lastName}</strong>
                <div style="color: var(--text-muted); font-size: 0.9rem;">@${otherUser.username}</div>
            </div>
        `;
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        
        if (!this.currentChat || this.currentChat.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">💬</div>
                    <h3>Начните общение!</h3>
                    <p>Отправьте первое сообщение в этом чате</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = '';
        this.currentChat.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Прокрутка вниз
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwn = message.authorId === this.app.currentUser.id;
        
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            ${!isOwn ? `<div class="message-sender">${message.author.firstName}</div>` : ''}
            <div class="message-content">${this.app.escapeHTML(message.content)}</div>
            <div class="message-time">${this.app.formatTime(message.timestamp)}</div>
        `;
        
        return messageDiv;
    }

    sendMessage() {
        if (!this.app.currentUser || !this.currentChat) return;

        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content) return;

        this.app.socket.emit('send-message', {
            chatId: this.currentChat.id,
            content: content
        });

        messageInput.value = '';
    }

    receiveMessage(chatId, message) {
        const chat = this.chats.get(chatId);
        if (!chat) return;

        chat.messages.push(message);
        
        if (this.currentChat?.id === chatId) {
            this.renderMessages();
        } else {
            this.renderChatsList();
            this.app.showNotification(`💬 Новое сообщение от ${message.author.firstName}`, 'info');
        }
    }

    getOtherUser(chat) {
        // В реальном приложении здесь была бы логика получения данных пользователя
        const otherUserId = chat.participants.find(id => id !== this.app.currentUser?.id);
        
        // Демо-данные
        const demoUsers = {
            'user2': {
                firstName: 'Мария',
                lastName: 'Иванова',
                username: 'maria_ivanova',
                avatar: 'https://ui-avatars.com/api/?name=Мария+Иванова&background=ff6b6b&color=fff'
            },
            'user3': {
                firstName: 'Дмитрий',
                lastName: 'Сидоров', 
                username: 'dmitry_sidorov',
                avatar: 'https://ui-avatars.com/api/?name=Дмитрий+Сидоров&background=48bb78&color=fff'
            }
        };

        return demoUsers[otherUserId] || {
            firstName: 'Пользователь',
            lastName: 'Неизвестный',
            username: 'unknown',
            avatar: 'https://ui-avatars.com/api/?name=Unknown+User&background=667eea&color=fff'
        };
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new Messenger(app);
});