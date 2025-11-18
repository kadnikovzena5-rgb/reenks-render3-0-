class AuthSystem {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Переключение между формами
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Отправка форм
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.app.showNotification('📝 Заполните все поля', 'error');
            return;
        }

        this.app.socket.emit('login', { email, password });
    }

    register() {
        const formData = {
            firstName: document.getElementById('regFirstName').value,
            lastName: document.getElementById('regLastName').value,
            username: document.getElementById('regUsername').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            bio: document.getElementById('regBio').value
        };

        // Валидация
        if (!formData.firstName || !formData.lastName || !formData.username || 
            !formData.email || !formData.password) {
            this.app.showNotification('📝 Заполните обязательные поля', 'error');
            return;
        }

        if (formData.password.length < 6) {
            this.app.showNotification('🔒 Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        this.app.socket.emit('register', formData);
    }

    logout() {
        this.app.logout();
        this.showLoginForm();
        
        // Очищаем формы
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new AuthSystem(app);
});