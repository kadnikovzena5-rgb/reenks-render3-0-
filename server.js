const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Базы данных в памяти
const users = new Map();
const posts = [];
const chats = new Map();
const onlineUsers = new Map();

// Инициализация демо-данных
function initSampleData() {
  // Демо пользователи
  const demoUsers = [
    {
      id: 'user1',
      email: 'alex@demo.ru',
      password: bcrypt.hashSync('123456', 10),
      profile: {
        firstName: 'Алексей',
        lastName: 'Петров',
        username: 'alex_petrov',
        avatar: 'https://ui-avatars.com/api/?name=Алексей+Петров&background=667eea&color=fff',
        bio: 'Разработчик REENKS 3.0 🚀'
      }
    },
    {
      id: 'user2',
      email: 'maria@demo.ru', 
      password: bcrypt.hashSync('123456', 10),
      profile: {
        firstName: 'Мария',
        lastName: 'Иванова',
        username: 'maria_ivanova',
        avatar: 'https://ui-avatars.com/api/?name=Мария+Иванова&background=ff6b6b&color=fff',
        bio: 'Дизайнер Living Glass 🎨'
      }
    }
  ];

  demoUsers.forEach(user => {
    users.set(user.id, user);
  });

  // Демо посты
  const demoPosts = [
    {
      id: uuidv4(),
      authorId: 'user1',
      author: demoUsers[0].profile,
      content: '🚀 REENKS 3.0 запущен! Новый дизайн Living Glass, мессенджер и игры!',
      likes: 15,
      comments: [
        {
          id: uuidv4(),
          authorId: 'user2',
          author: demoUsers[1].profile,
          content: 'Выглядит потрясающе! 🎉',
          createdAt: new Date()
        }
      ],
      createdAt: new Date()
    }
  ];

  demoPosts.forEach(post => posts.push(post));

  // Демо чат
  const demoChat = {
    id: 'chat1',
    participants: ['user1', 'user2'],
    messages: [
      {
        id: uuidv4(),
        authorId: 'user1',
        content: 'Привет! Как тебе новая версия?',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: uuidv4(), 
        authorId: 'user2',
        content: 'Супер! Дизайн просто огонь! 🔥',
        timestamp: new Date(Date.now() - 1800000)
      }
    ]
  };

  chats.set('chat1', demoChat);
}

initSampleData();

// Socket.io обработчики
io.on('connection', (socket) => {
  console.log('🔗 Новое подключение:', socket.id);

  let currentUser = null;

  // Регистрация
  socket.on('register', async (userData) => {
    try {
      const existingUser = Array.from(users.values()).find(
        u => u.email === userData.email
      );
      
      if (existingUser) {
        socket.emit('auth-error', { message: 'Email уже занят' });
        return;
      }

      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = {
        id: userId,
        email: userData.email,
        password: hashedPassword,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName + '+' + userData.lastName)}&background=667eea&color=fff`,
          bio: userData.bio || 'Новый пользователь REENKS 3.0 🚀'
        }
      };

      users.set(userId, user);
      currentUser = user;
      
      socket.emit('registered', { user: user.profile });
      
    } catch (error) {
      socket.emit('auth-error', { message: 'Ошибка регистрации' });
    }
  });

  // Авторизация
  socket.on('login', async (credentials) => {
    try {
      const user = Array.from(users.values()).find(
        u => u.email === credentials.email
      );

      if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
        socket.emit('auth-error', { message: 'Неверный email или пароль' });
        return;
      }

      currentUser = user;
      onlineUsers.set(user.id, { socketId: socket.id, ...user.profile });
      
      socket.emit('logged-in', { 
        user: user.profile,
        feed: posts,
        onlineUsers: Array.from(onlineUsers.values()),
        chats: Array.from(chats.values()).filter(chat => 
          chat.participants.includes(user.id)
        )
      });

      // Уведомляем других о входе
      socket.broadcast.emit('user-online', user.profile);

    } catch (error) {
      socket.emit('auth-error', { message: 'Ошибка входа' });
    }
  });

  // Создание поста
  socket.on('create-post', (postData) => {
    if (!currentUser) return;

    const post = {
      id: uuidv4(),
      authorId: currentUser.id,
      author: currentUser.profile,
      content: postData.content,
      likes: 0,
      comments: [],
      createdAt: new Date()
    };

    posts.unshift(post);
    io.emit('new-post', post);
  });

  // Отправка сообщения
  socket.on('send-message', (messageData) => {
    if (!currentUser) return;

    const chat = chats.get(messageData.chatId);
    if (!chat || !chat.participants.includes(currentUser.id)) return;

    const message = {
      id: uuidv4(),
      authorId: currentUser.id,
      author: currentUser.profile,
      content: messageData.content,
      timestamp: new Date()
    };

    chat.messages.push(message);
    
    // Отправляем сообщение всем участникам чата
    chat.participants.forEach(participantId => {
      const participantSocket = onlineUsers.get(participantId);
      if (participantSocket) {
        io.to(participantSocket.socketId).emit('new-message', {
          chatId: messageData.chatId,
          message: message
        });
      }
    });
  });

  // Создание чата
  socket.on('create-chat', (targetUserId) => {
    if (!currentUser || !users.has(targetUserId)) return;

    const chatId = uuidv4();
    const chat = {
      id: chatId,
      participants: [currentUser.id, targetUserId],
      messages: []
    };

    chats.set(chatId, chat);
    
    // Уведомляем участников
    [currentUser.id, targetUserId].forEach(userId => {
      const userSocket = onlineUsers.get(userId);
      if (userSocket) {
        io.to(userSocket.socketId).emit('chat-created', chat);
      }
    });
  });

  // Игровые события
  socket.on('game-score', (scoreData) => {
    if (!currentUser) return;

    io.emit('new-highscore', {
      player: currentUser.profile,
      score: scoreData.score,
      game: scoreData.game
    });
  });

  // Отключение
  socket.on('disconnect', () => {
    if (currentUser) {
      onlineUsers.delete(currentUser.id);
      socket.broadcast.emit('user-offline', currentUser.profile);
    }
  });
});

// API маршруты
app.get('/api/stats', (req, res) => {
  res.json({
    onlineUsers: onlineUsers.size,
    totalUsers: users.size,
    totalPosts: posts.length,
    totalChats: chats.size
  });
});

app.get('/api/users', (req, res) => {
  const usersList = Array.from(users.values()).map(user => ({
    id: user.id,
    ...user.profile
  }));
  res.json(usersList);
});

// Обслуживание фронтенда
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║              🚀 REENKS 3.0              ║');
  console.log('║           Living Glass Edition          ║');
  console.log('║                                          ║');
  console.log(`║     📍 Port: ${PORT}                           ║`);
  console.log('║                                          ║');
  console.log('║     👥 Система регистрации              ║');
  console.log('║     💬 WebRTC мессенджер                ║');
  console.log('║     🎮 Космический защитник             ║');
  console.log('║     🎨 Living Glass дизайн              ║');
  console.log('║                                          ║');
  console.log('║     🌐 Готов к работе!                  ║');
  console.log('╚══════════════════════════════════════════╝');
});