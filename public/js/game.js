class SpaceDefender {
    constructor() {
        this.canvas = document.getElementById('spaceGame');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'idle'; // idle, playing, paused, gameover
        this.score = 0;
        this.highScore = 0;
        this.lives = 3;
        this.level = 1;
        
        // Игровые объекты
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 80,
            width: 50,
            height: 50,
            speed: 8,
            color: '#667eea'
        };
        
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        
        this.keys = {};
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 2000; // ms
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupGameControls();
        this.setupSocketListeners();
        this.render();
        
        // Загрузка рекорда из localStorage
        this.highScore = parseInt(localStorage.getItem('spaceDefenderHighScore')) || 0;
        document.getElementById('highScore').textContent = this.highScore;
    }

    setupEventListeners() {
        // Управление клавиатурой
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.shoot();
            }
            
            if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Адаптивный размер canvas
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    setupGameControls() {
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('pauseGameBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('resetGameBtn').addEventListener('click', () => {
            this.resetGame();
        });
    }

    setupSocketListeners() {
        if (app.socket) {
            app.socket.on('new-highscore', (data) => {
                this.updateLeaderboard(data);
            });
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = Math.min(800, container.clientWidth - 40);
        this.canvas.height = 500;
        
        if (this.gameState !== 'idle') {
            this.render();
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.powerUps = [];
        
        this.player.x = this.canvas.width / 2 - 25;
        
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('pauseGameBtn').disabled = false;
        document.getElementById('gameScore').textContent = '0';
        document.getElementById('gameLives').textContent = '3';
        
        this.gameLoop();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseGameBtn').textContent = '▶️ Продолжить';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseGameBtn').textContent = '⏸️ Пауза';
            this.gameLoop();
        }
    }

    resetGame() {
        this.gameState = 'idle';
        document.getElementById('startGameBtn').disabled = false;
        document.getElementById('pauseGameBtn').disabled = true;
        document.getElementById('pauseGameBtn').textContent = '⏸️ Пауза';
        this.render();
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;

        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.movePlayer();
        this.moveBullets();
        this.moveEnemies();
        this.moveParticles();
        this.movePowerUps();
        
        this.spawnEnemies();
        this.checkCollisions();
        this.updateLevel();
    }

    movePlayer() {
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        if (this.keys['ArrowUp'] && this.player.y > this.canvas.height / 2) {
            this.player.y -= this.player.speed;
        }
        if (this.keys['ArrowDown'] && this.player.y < this.canvas.height - this.player.height) {
            this.player.y += this.player.speed;
        }
    }

    moveBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > 0;
        });
    }

    moveEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            enemy.y += enemy.speed;
            
            // Вращение астероидов
            if (enemy.type === 'asteroid') {
                enemy.rotation += enemy.rotationSpeed;
            }
            
            return enemy.y < this.canvas.height;
        });
    }

    moveParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            return particle.life > 0;
        });
    }

    movePowerUps() {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += powerUp.speed;
            return powerUp.y < this.canvas.height;
        });
    }

    spawnEnemies() {
        const now = Date.now();
        if (now - this.lastEnemySpawn > this.enemySpawnRate) {
            this.createEnemy();
            this.lastEnemySpawn = now;
        }
    }

    createEnemy() {
        const types = ['asteroid', 'ufo'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const enemy = {
            x: Math.random() * (this.canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            speed: 2 + Math.random() * 2 + this.level * 0.5,
            type: type,
            color: type === 'asteroid' ? '#8B4513' : '#48bb78',
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        };
        
        this.enemies.push(enemy);
    }

    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 15,
            speed: 10,
            color: '#ff6b6b'
        });
        
        // Эффект выстрела
        this.createMuzzleFlash();
    }

    createMuzzleFlash() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3,
                life: 20,
                color: '#ff8e8e'
            });
        }
    }

    checkCollisions() {
        // Столкновения пуль с врагами
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    // Уничтожение врага
                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    this.enemies.splice(enemyIndex, 1);
                    this.bullets.splice(bulletIndex, 1);
                    
                    // Начисление очков
                    this.score += enemy.type === 'ufo' ? 50 : 20;
                    document.getElementById('gameScore').textContent = this.score;
                    
                    // Проверка рекорда
                    if (this.score > this.highScore) {
                        this.highScore = this.score;
                        document.getElementById('highScore').textContent = this.highScore;
                        localStorage.setItem('spaceDefenderHighScore', this.highScore);
                        
                        // Отправка рекорда на сервер
                        if (app.socket && app.currentUser) {
                            app.socket.emit('game-score', {
                                score: this.highScore,
                                game: 'space_defender'
                            });
                        }
                    }
                    
                    // Шанс выпадения бонуса
                    if (Math.random() < 0.1) {
                        this.createPowerUp(enemy.x, enemy.y);
                    }
                }
            });
        });

        // Столкновения игрока с врагами
        this.enemies.forEach((enemy, index) => {
            if (this.isColliding(this.player, enemy)) {
                this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                this.enemies.splice(index, 1);
                this.lives--;
                document.getElementById('gameLives').textContent = this.lives;
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });

        // Столкновения с бонусами
        this.powerUps.forEach((powerUp, index) => {
            if (this.isColliding(this.player, powerUp)) {
                this.powerUps.splice(index, 1);
                this.applyPowerUp(powerUp.type);
            }
        });
    }

    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                color: '#ff8e8e'
            });
        }
    }

    createPowerUp(x, y) {
        const types = ['life', 'rapidfire', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            speed: 2,
            type: type,
            color: type === 'life' ? '#ff6b6b' : type === 'rapidfire' ? '#667eea' : '#48bb78'
        });
    }

    applyPowerUp(type) {
        switch (type) {
            case 'life':
                this.lives = Math.min(this.lives + 1, 5);
                document.getElementById('gameLives').textContent = this.lives;
                break;
            case 'rapidfire':
                // Временное ускорение стрельбы
                setTimeout(() => {
                    // Возврат к нормальной скорости
                }, 5000);
                break;
            case 'shield':
                // Временная защита
                setTimeout(() => {
                    // Отключение защиты
                }, 3000);
                break;
        }
    }

    updateLevel() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.enemySpawnRate = Math.max(500, 2000 - this.level * 100);
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('startGameBtn').disabled = false;
        document.getElementById('pauseGameBtn').disabled = true;
        
        app.showNotification(`🎮 Игра окончена! Ваш счёт: ${this.score}`, 'info');
    }

    render() {
        // Очистка canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Рендер игровых объектов
        this.renderPlayer();
        this.renderBullets();
        this.renderEnemies();
        this.renderParticles();
        this.renderPowerUps();
        this.renderUI();

        // Экран паузы
        if (this.gameState === 'paused') {
            this.renderPauseScreen();
        }

        // Экран игры окончена
        if (this.gameState === 'gameover') {
            this.renderGameOverScreen();
        }
    }

    renderPlayer() {
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Детали корабля
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(this.player.x + 20, this.player.y, 10, 10);
    }

    renderBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    }

    renderEnemies() {
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            
            if (enemy.type === 'asteroid') {
                this.ctx.rotate(enemy.rotation);
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
                
                // Детали астероида
                this.ctx.fillStyle = '#654321';
                this.ctx.fillRect(-10, -5, 8, 8);
                this.ctx.fillRect(5, 8, 6, 6);
            } else {
                // НЛО
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height / 2);
                this.ctx.fillRect(-enemy.width / 3, -enemy.height / 2, enemy.width * 2/3, enemy.height);
            }
            
            this.ctx.restore();
        });
    }

    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 2, 2);
        });
    }

    renderPowerUps() {
        this.powerUps.forEach(powerUp => {
            this.ctx.fillStyle = powerUp.color;
            this.ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            
            // Иконка бонуса
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('★', powerUp.x + 6, powerUp.y + 14);
        });
    }

    renderUI() {
        // Очки и жизни
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Очки: ${this.score}`, 10, 25);
        this.ctx.fillText(`Жизни: ${this.lives}`, 10, 50);
        this.ctx.fillText(`Уровень: ${this.level}`, 10, 75);
    }

    renderPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⏸️ ПАУЗА', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите P для продолжения', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    renderGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎮 ИГРА ОКОНЧЕНА', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Ваш счёт: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Рекорд: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Нажмите "Заново" для новой игры', this.canvas.width / 2, this.canvas.height / 2 + 70);
    }

    updateLeaderboard(data) {
        const scoresList = document.getElementById('scoresList');
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.innerHTML = `
            <div>
                <strong>${data.player.firstName}</strong>
                <div style="color: var(--text-muted); font-size: 0.9rem;">${data.game}</div>
            </div>
            <div style="font-weight: bold; color: var(--accent);">${data.score}</div>
        `;
        
        scoresList.insertBefore(scoreItem, scoresList.firstChild);
        
        // Ограничиваем список 10 элементами
        if (scoresList.children.length > 10) {
            scoresList.removeChild(scoresList.lastChild);
        }
    }
}

// Инициализация игры после загрузки DOM
let spaceGame;
document.addEventListener('DOMContentLoaded', () => {
    spaceGame = new SpaceDefender();
    window.spaceGame = spaceGame; // Делаем глобально доступной для app.js
});