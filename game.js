// Game constants
const GAME_STATES = {
    START: 'start',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Game configuration
const CONFIG = {
    initialLives: 3,
    pointsPerWatermelon: 10,
    watermelonSpawnInterval: 1500, // milliseconds
    minSpawnInterval: 600,
    spawnIntervalDecrease: 50,
    gravity: 0.5,
    initialVelocityY: -15,
    watermelonRadius: 40,
    sliceThreshold: 5,
    trailMaxLength: 20
};

// Game state
let gameState = GAME_STATES.START;
let score = 0;
let lives = CONFIG.initialLives;
let watermelons = [];
let slicedWatermelons = [];
let mouseTrail = [];
let lastSpawnTime = 0;
let currentSpawnInterval = CONFIG.watermelonSpawnInterval;
let animationId = null;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const startMenu = document.getElementById('startMenu');
const gameOverMenu = document.getElementById('gameOverMenu');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');

// Initialize canvas size
function resizeCanvas() {
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    
    // Set canvas size with aspect ratio consideration
    if (maxWidth > maxHeight) {
        canvas.width = Math.min(maxWidth * 0.9, 1200);
        canvas.height = Math.min(maxHeight * 0.9, 800);
    } else {
        canvas.width = maxWidth;
        canvas.height = maxHeight;
    }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Watermelon class
class Watermelon {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = CONFIG.watermelonRadius;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.15;
        this.sliced = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw watermelon
        // Outer green skin
        ctx.fillStyle = '#2d5016';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Green stripes
        ctx.strokeStyle = '#1a3d0f';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            ctx.stroke();
        }

        // Lighter green overlay
        ctx.fillStyle = '#3d7018';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.85, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isOffScreen() {
        return this.y > canvas.height + this.radius;
    }

    isCollidingWithTrail(trail) {
        for (let i = 1; i < trail.length; i++) {
            const p1 = trail[i - 1];
            const p2 = trail[i];
            
            const dist = this.distanceToLineSegment(p1.x, p1.y, p2.x, p2.y);
            if (dist < this.radius) {
                return true;
            }
        }
        return false;
    }

    distanceToLineSegment(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        
        if (lengthSquared === 0) {
            return Math.sqrt((this.x - x1) ** 2 + (this.y - y1) ** 2);
        }
        
        let t = ((this.x - x1) * dx + (this.y - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        
        return Math.sqrt((this.x - closestX) ** 2 + (this.y - closestY) ** 2);
    }
}

// Sliced watermelon class
class SlicedWatermelon {
    constructor(x, y, vx, vy, rotation, isLeft) {
        this.x = x;
        this.y = y;
        this.vx = vx + (isLeft ? -3 : 3);
        this.vy = vy - 2;
        this.radius = CONFIG.watermelonRadius;
        this.rotation = rotation;
        this.rotationSpeed = (isLeft ? -0.2 : 0.2);
        this.isLeft = isLeft;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.rotation += this.rotationSpeed;
        this.alpha = Math.max(0, this.alpha - 0.02);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw half watermelon
        ctx.beginPath();
        if (this.isLeft) {
            ctx.arc(0, 0, this.radius, Math.PI / 2, -Math.PI / 2);
        } else {
            ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2);
        }
        ctx.closePath();

        // Outer green skin
        ctx.fillStyle = '#2d5016';
        ctx.fill();

        // Red flesh
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        if (this.isLeft) {
            ctx.arc(0, 0, this.radius * 0.8, Math.PI / 2, -Math.PI / 2);
        } else {
            ctx.arc(0, 0, this.radius * 0.8, -Math.PI / 2, Math.PI / 2);
        }
        ctx.closePath();
        ctx.fill();

        // White rind
        ctx.strokeStyle = '#f1f2f6';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (this.isLeft) {
            ctx.arc(0, 0, this.radius * 0.85, Math.PI / 2, -Math.PI / 2);
        } else {
            ctx.arc(0, 0, this.radius * 0.85, -Math.PI / 2, Math.PI / 2);
        }
        ctx.stroke();

        // Seeds
        ctx.fillStyle = '#2d3436';
        for (let i = 0; i < 3; i++) {
            const seedX = (Math.random() - 0.5) * this.radius * 0.5;
            const seedY = (Math.random() - 0.5) * this.radius * 0.5;
            ctx.beginPath();
            ctx.ellipse(seedX, seedY, 3, 5, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    isFinished() {
        return this.alpha <= 0 || this.y > canvas.height + this.radius;
    }
}

// Spawn watermelon
function spawnWatermelon() {
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = canvas.height + CONFIG.watermelonRadius;
    const vx = (Math.random() - 0.5) * 4;
    const vy = CONFIG.initialVelocityY + (Math.random() - 0.5) * 4;
    
    watermelons.push(new Watermelon(x, y, vx, vy));
}

// Slice watermelon
function sliceWatermelon(watermelon) {
    if (watermelon.sliced) return;
    
    watermelon.sliced = true;
    score += CONFIG.pointsPerWatermelon;
    updateScore();
    
    // Create two halves
    slicedWatermelons.push(
        new SlicedWatermelon(watermelon.x, watermelon.y, watermelon.vx, watermelon.vy, watermelon.rotation, true)
    );
    slicedWatermelons.push(
        new SlicedWatermelon(watermelon.x, watermelon.y, watermelon.vx, watermelon.vy, watermelon.rotation, false)
    );
    
    // Increase difficulty
    if (score % 50 === 0 && currentSpawnInterval > CONFIG.minSpawnInterval) {
        currentSpawnInterval = Math.max(
            CONFIG.minSpawnInterval,
            currentSpawnInterval - CONFIG.spawnIntervalDecrease
        );
    }
}

// Mouse tracking
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mouseTrail = [{ x: mouseX, y: mouseY }];
});

canvas.addEventListener('mousemove', (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (isMouseDown) {
        mouseTrail.push({ x: mouseX, y: mouseY });
        if (mouseTrail.length > CONFIG.trailMaxLength) {
            mouseTrail.shift();
        }
    }
});

canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
    setTimeout(() => {
        mouseTrail = [];
    }, 100);
});

canvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
    mouseTrail = [];
});

// Touch support for mobile
canvas.addEventListener('touchstart', (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    e.preventDefault();
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    mouseTrail = [{ x: mouseX, y: mouseY }];
});

canvas.addEventListener('touchmove', (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    mouseTrail.push({ x: mouseX, y: mouseY });
    if (mouseTrail.length > CONFIG.trailMaxLength) {
        mouseTrail.shift();
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isMouseDown = false;
    setTimeout(() => {
        mouseTrail = [];
    }, 100);
});

// Update game state
function update(currentTime) {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    // Spawn watermelons
    if (currentTime - lastSpawnTime > currentSpawnInterval) {
        spawnWatermelon();
        lastSpawnTime = currentTime;
    }
    
    // Update watermelons
    for (let i = watermelons.length - 1; i >= 0; i--) {
        const watermelon = watermelons[i];
        watermelon.update();
        
        // Check collision with mouse trail
        if (mouseTrail.length > 1 && !watermelon.sliced) {
            if (watermelon.isCollidingWithTrail(mouseTrail)) {
                sliceWatermelon(watermelon);
            }
        }
        
        // Check if watermelon is off screen
        if (watermelon.isOffScreen() && !watermelon.sliced) {
            watermelons.splice(i, 1);
            lives--;
            updateLives();
            
            if (lives <= 0) {
                gameOver();
            }
        } else if (watermelon.sliced) {
            watermelons.splice(i, 1);
        }
    }
    
    // Update sliced watermelons
    for (let i = slicedWatermelons.length - 1; i >= 0; i--) {
        slicedWatermelons[i].update();
        if (slicedWatermelons[i].isFinished()) {
            slicedWatermelons.splice(i, 1);
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw watermelons
    watermelons.forEach(watermelon => watermelon.draw(ctx));
    
    // Draw sliced watermelons
    slicedWatermelons.forEach(sliced => sliced.draw(ctx));
    
    // Draw mouse trail
    if (mouseTrail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(mouseTrail[0].x, mouseTrail[0].y);
        for (let i = 1; i < mouseTrail.length; i++) {
            ctx.lineTo(mouseTrail[i].x, mouseTrail[i].y);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }
}

// Game loop
function gameLoop(currentTime) {
    update(currentTime);
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// Update UI
function updateScore() {
    scoreDisplay.textContent = score;
}

function updateLives() {
    livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives));
}

// Start game
function startGame() {
    gameState = GAME_STATES.PLAYING;
    score = 0;
    lives = CONFIG.initialLives;
    watermelons = [];
    slicedWatermelons = [];
    mouseTrail = [];
    lastSpawnTime = 0;
    currentSpawnInterval = CONFIG.watermelonSpawnInterval;
    
    updateScore();
    updateLives();
    
    startMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    animationId = requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    finalScoreDisplay.textContent = score;
    gameOverMenu.classList.remove('hidden');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Initial render
render();
