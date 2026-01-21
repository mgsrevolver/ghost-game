// Graham's Ghost Bash - Game Logic (2.5D Edition)

// ============================================
// GAME LOOP & TIMING
// ============================================
let lastTime = 0;
let gameLoopId = null;

function gameLoop(currentTime) {
    if (!gameState.gameStarted) {
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    const dt = Math.min(deltaTime, 0.1);

    // Update all game systems
    updatePlayer(dt);
    updateGhosts(dt);
    checkCollisions();
    updateDepthSorting();

    gameLoopId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    if (!gameLoopId) {
        lastTime = performance.now();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

function stopGameLoop() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
}

// ============================================
// SOUND EFFECTS (Web Audio API - Mobile Fixed)
// ============================================
let audioContext = null;
let audioUnlocked = false;
let masterGain = null;

function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.gain.setValueAtTime(0.5, audioContext.currentTime);
            masterGain.connect(audioContext.destination);
        }

        // Always try to resume on interaction
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }

        // Unlock audio on first interaction
        if (!audioUnlocked && audioContext.state === 'running') {
            // Play a very short beep to fully unlock
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            gain.gain.setValueAtTime(0.001, audioContext.currentTime); // Nearly silent
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.01);
            audioUnlocked = true;
            console.log('Audio unlocked');
        }
    } catch (e) {
        console.log('Audio init error:', e);
    }
}

// Play a sound effect
function playSound(type) {
    try {
        if (!audioContext || audioContext.state !== 'running') {
            // Try to init again
            initAudio();
            if (!audioContext || audioContext.state !== 'running') return;
        }

        switch(type) {
            case 'lightOn':
                playTone([800, 1200], 0.1, 'square', 0.3);
                break;
            case 'lightOff':
                playTone([400, 200], 0.1, 'square', 0.3);
                break;
            case 'kungFu':
                playTone([200, 600, 800], 0.15, 'sawtooth', 0.4);
                playTone([100], 0.1, 'square', 0.3, 0.05);
                break;
            case 'ghostHit':
                playTone([600, 650], 0.08, 'sine', 0.2);
                playTone([700, 750], 0.08, 'sine', 0.2, 0.08);
                playTone([800, 850], 0.08, 'sine', 0.2, 0.16);
                break;
            case 'gummyCollect':
                playTone([880, 1108], 0.15, 'sine', 0.3);
                break;
            case 'chuckEAppear':
                playTone([523], 0.12, 'sine', 0.25);
                playTone([659], 0.12, 'sine', 0.25, 0.1);
                playTone([784], 0.12, 'sine', 0.25, 0.2);
                break;
            case 'hug':
                playTone([400, 500, 600], 0.3, 'sine', 0.3);
                break;
            case 'victory':
                playTone([523], 0.2, 'square', 0.2);
                playTone([659], 0.2, 'square', 0.2, 0.15);
                playTone([784], 0.2, 'square', 0.2, 0.3);
                playTone([1047], 0.3, 'square', 0.25, 0.45);
                break;
            case 'roomComplete':
                playTone([659], 0.15, 'sine', 0.25);
                playTone([784], 0.15, 'sine', 0.25, 0.12);
                playTone([880], 0.2, 'sine', 0.25, 0.24);
                break;
            case 'boo':
                // Spooky descending tone
                playTone([400, 200, 100], 0.3, 'sawtooth', 0.4);
                break;
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

// Simplified tone player
function playTone(frequencies, duration, type, volume, delay = 0) {
    if (!audioContext) return;

    const startTime = audioContext.currentTime + delay;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(masterGain);

    // Set frequencies over time
    if (frequencies.length === 1) {
        osc.frequency.setValueAtTime(frequencies[0], startTime);
    } else {
        const step = duration / frequencies.length;
        frequencies.forEach((freq, i) => {
            if (i === 0) {
                osc.frequency.setValueAtTime(freq, startTime);
            } else {
                osc.frequency.linearRampToValueAtTime(freq, startTime + (step * i));
            }
        });
    }

    // Volume envelope
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
}

// ============================================
// GAME STATE
// ============================================
const gameState = {
    currentRoom: 0,
    lightsOn: true,
    ghosts: [],
    activeGhosts: 0,
    gummyBears: 0,
    roomGummies: 0,
    chuckEVisible: false,
    chuckETimeout: null,
    gameStarted: false,
    tutorialShown: false,

    // Player state (2.5D)
    player: {
        x: 50,           // Percentage position
        y: 70,
        targetX: null,
        targetY: null,
        speed: 25,       // Percent per second
        facing: 'right',
        walking: false,
        hp: 3,
        maxHp: 3,
        invulnerable: false,
        invulnerableTimer: 0,
        knockback: { x: 0, y: 0, timer: 0 }
    },

    // Ghost AI state
    ghostData: [],

    // Input state
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    }
};

// Room configurations
const rooms = [
    {
        name: 'Arcade Floor',
        class: 'arcade-room',
        ghostCount: 4,
        ghostPositions: [
            { x: 20, y: 30 },
            { x: 65, y: 25 },
            { x: 35, y: 55 },
            { x: 75, y: 55 }
        ]
    },
    {
        name: 'Trampoline Zone',
        class: 'trampoline-room',
        ghostCount: 5,
        ghostPositions: [
            { x: 15, y: 35 },
            { x: 50, y: 25 },
            { x: 80, y: 40 },
            { x: 30, y: 60 },
            { x: 65, y: 60 }
        ]
    },
    {
        name: 'Prize Counter',
        class: 'prize-room',
        ghostCount: 4,
        ghostPositions: [
            { x: 25, y: 30 },
            { x: 70, y: 35 },
            { x: 45, y: 55 },
            { x: 80, y: 55 }
        ]
    }
];

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    titleScreen: document.getElementById('title-screen'),
    gameScreen: document.getElementById('game-screen'),
    roomCompleteScreen: document.getElementById('room-complete-screen'),
    victoryScreen: document.getElementById('victory-screen'),
    startButton: document.getElementById('start-button'),
    lightSwitch: document.getElementById('light-switch'),
    room: document.getElementById('room'),
    roomDecor: document.getElementById('room-decor'),
    ghostsContainer: document.getElementById('ghosts-container'),
    gummiesContainer: document.getElementById('gummies-container'),
    chuckE: document.getElementById('chuck-e'),
    chuckEHearts: document.querySelector('.chuck-e-hearts'),
    gummyCount: document.getElementById('gummy-count'),
    roomNumber: document.getElementById('room-number'),
    earnedCount: document.getElementById('earned-count'),
    totalGummies: document.getElementById('total-gummies'),
    nextRoomButton: document.getElementById('next-room-button'),
    playAgainButton: document.getElementById('play-again-button'),
    kungFuEffect: document.getElementById('kung-fu-effect'),
    // 2.5D additions
    player: document.getElementById('player'),
    hpContainer: document.getElementById('hp-container'),
    moveTarget: document.getElementById('move-target'),
    booEffect: document.getElementById('boo-effect'),
    respawnScreen: document.getElementById('respawn-screen'),
    tooFarText: document.getElementById('too-far-text')
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    // Set up event listeners
    addTouchListener(elements.startButton, startGame);
    addTouchListener(elements.lightSwitch, toggleLights);
    addTouchListener(elements.nextRoomButton, nextRoom);
    addTouchListener(elements.playAgainButton, restartGame);
    // Note: Chuck E now heals on proximity, not tap

    // Tap-to-move on game area
    elements.room.addEventListener('touchstart', handleRoomTouch, { passive: false });
    elements.room.addEventListener('click', handleRoomClick);

    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Respawn button
    const respawnBtn = document.getElementById('respawn-button');
    if (respawnBtn) {
        addTouchListener(respawnBtn, respawnPlayer);
    }

    // Prevent default touch behaviors
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Start the game loop
    startGameLoop();
}

// ============================================
// INPUT HANDLING
// ============================================
function handleRoomTouch(e) {
    if (!gameState.gameStarted) return;
    e.preventDefault();

    const touch = e.touches[0];
    setMoveTarget(touch.clientX, touch.clientY);
}

function handleRoomClick(e) {
    if (!gameState.gameStarted) return;
    // Don't respond to clicks that were touches
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;

    setMoveTarget(e.clientX, e.clientY);
}

function setMoveTarget(clientX, clientY) {
    const roomRect = elements.room.getBoundingClientRect();
    const x = ((clientX - roomRect.left) / roomRect.width) * 100;
    const y = ((clientY - roomRect.top) / roomRect.height) * 100;

    // Clamp to room bounds
    gameState.player.targetX = Math.max(5, Math.min(95, x));
    gameState.player.targetY = Math.max(20, Math.min(85, y));

    // Show move target indicator briefly
    showMoveTarget(gameState.player.targetX, gameState.player.targetY);
}

function showMoveTarget(x, y) {
    if (!elements.moveTarget) return;
    elements.moveTarget.style.left = x + '%';
    elements.moveTarget.style.top = y + '%';
    elements.moveTarget.classList.add('visible');

    setTimeout(() => {
        elements.moveTarget.classList.remove('visible');
    }, 300);
}

function handleKeyDown(e) {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup':
            gameState.keys.up = true;
            break;
        case 's': case 'arrowdown':
            gameState.keys.down = true;
            break;
        case 'a': case 'arrowleft':
            gameState.keys.left = true;
            break;
        case 'd': case 'arrowright':
            gameState.keys.right = true;
            break;
        case ' ':
            // Space to attack nearby ghost
            attackNearbyGhost();
            break;
    }
}

function handleKeyUp(e) {
    switch(e.key.toLowerCase()) {
        case 'w': case 'arrowup':
            gameState.keys.up = false;
            break;
        case 's': case 'arrowdown':
            gameState.keys.down = false;
            break;
        case 'a': case 'arrowleft':
            gameState.keys.left = false;
            break;
        case 'd': case 'arrowright':
            gameState.keys.right = false;
            break;
    }
}

// Helper to add touch/click listener
function addTouchListener(element, callback) {
    let touching = false;

    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touching = true;
        initAudio();
        callback();
    }, { passive: false });

    element.addEventListener('touchend', () => {
        touching = false;
    }, { passive: true });

    element.addEventListener('click', (e) => {
        // Only trigger click if it wasn't a touch
        if (!touching) {
            initAudio();
            callback();
        }
    });
}

// Unlock audio on first document touch
document.addEventListener('touchstart', () => initAudio(), { passive: true });
document.addEventListener('click', () => initAudio(), { passive: true });

// ============================================
// PLAYER UPDATE
// ============================================
function updatePlayer(dt) {
    const player = gameState.player;

    // Update invulnerability timer
    if (player.invulnerable) {
        player.invulnerableTimer -= dt;
        if (player.invulnerableTimer <= 0) {
            player.invulnerable = false;
            if (elements.player) {
                elements.player.classList.remove('invulnerable');
            }
        }
    }

    // Update knockback
    if (player.knockback.timer > 0) {
        player.knockback.timer -= dt;
        player.x += player.knockback.x * dt;
        player.y += player.knockback.y * dt;
        // Clamp position
        player.x = Math.max(5, Math.min(95, player.x));
        player.y = Math.max(20, Math.min(85, player.y));
    }

    // Handle keyboard movement
    let dx = 0;
    let dy = 0;
    if (gameState.keys.up) dy -= 1;
    if (gameState.keys.down) dy += 1;
    if (gameState.keys.left) dx -= 1;
    if (gameState.keys.right) dx += 1;

    // If keyboard input, clear tap target
    if (dx !== 0 || dy !== 0) {
        player.targetX = null;
        player.targetY = null;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            dx /= mag;
            dy /= mag;
        }

        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
        player.walking = true;

        if (dx !== 0) {
            player.facing = dx > 0 ? 'right' : 'left';
        }
    }
    // Handle tap-to-move
    else if (player.targetX !== null && player.targetY !== null) {
        const tdx = player.targetX - player.x;
        const tdy = player.targetY - player.y;
        const dist = Math.sqrt(tdx * tdx + tdy * tdy);

        if (dist > 1) {
            const moveX = (tdx / dist) * player.speed * dt;
            const moveY = (tdy / dist) * player.speed * dt;

            player.x += moveX;
            player.y += moveY;
            player.walking = true;

            if (Math.abs(tdx) > 0.5) {
                player.facing = tdx > 0 ? 'right' : 'left';
            }
        } else {
            // Reached target
            player.targetX = null;
            player.targetY = null;
            player.walking = false;
        }
    } else {
        player.walking = false;
    }

    // Clamp to bounds
    player.x = Math.max(5, Math.min(95, player.x));
    player.y = Math.max(20, Math.min(85, player.y));

    // Update DOM
    updatePlayerDOM();
}

function updatePlayerDOM() {
    if (!elements.player) return;
    const player = gameState.player;

    elements.player.style.left = player.x + '%';
    elements.player.style.top = player.y + '%';
    elements.player.classList.toggle('walking', player.walking);
    elements.player.classList.toggle('facing-left', player.facing === 'left');
    elements.player.classList.toggle('facing-right', player.facing === 'right');
}

// ============================================
// GHOST AI UPDATE
// ============================================
function updateGhosts(dt) {
    if (gameState.lightsOn) return; // Ghosts inactive when lights on

    gameState.ghostData.forEach((data, index) => {
        const ghost = gameState.ghosts[index];
        if (!ghost || ghost.classList.contains('kung-fu')) return;

        const player = gameState.player;
        const dx = player.x - data.x;
        const dy = player.y - data.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Detection radius (percentage of room)
        const detectionRadius = 25;
        const attackRadius = 8;

        switch(data.state) {
            case 'patrol':
                // Random wandering
                data.patrolTimer -= dt;
                if (data.patrolTimer <= 0) {
                    // Pick new patrol target
                    data.patrolTargetX = data.homeX + (Math.random() - 0.5) * 20;
                    data.patrolTargetY = data.homeY + (Math.random() - 0.5) * 20;
                    data.patrolTargetX = Math.max(5, Math.min(95, data.patrolTargetX));
                    data.patrolTargetY = Math.max(20, Math.min(85, data.patrolTargetY));
                    data.patrolTimer = 2 + Math.random() * 3;
                }

                // Move toward patrol target
                const pdx = data.patrolTargetX - data.x;
                const pdy = data.patrolTargetY - data.y;
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pDist > 1) {
                    data.x += (pdx / pDist) * data.patrolSpeed * dt;
                    data.y += (pdy / pDist) * data.patrolSpeed * dt;
                }

                // Check for player detection
                if (distToPlayer < detectionRadius) {
                    data.state = 'alert';
                    data.alertTimer = 1.0; // 1 second notice delay
                    ghost.classList.add('alert');
                }
                break;

            case 'alert':
                // Brief pause before chasing
                data.alertTimer -= dt;
                if (data.alertTimer <= 0) {
                    data.state = 'chase';
                    ghost.classList.remove('alert');
                    ghost.classList.add('chasing');
                }
                break;

            case 'chase':
                // Move toward player (slower than player so escape is possible)
                if (distToPlayer > attackRadius) {
                    data.x += (dx / distToPlayer) * data.chaseSpeed * dt;
                    data.y += (dy / distToPlayer) * data.chaseSpeed * dt;
                }

                // Lost player (lights on handled above, or far away)
                if (distToPlayer > detectionRadius * 1.5) {
                    data.state = 'patrol';
                    data.patrolTimer = 0;
                    ghost.classList.remove('chasing');
                }
                break;

            case 'cooldown':
                // After attacking, brief stun
                data.cooldownTimer -= dt;
                if (data.cooldownTimer <= 0) {
                    data.state = 'chase';
                }
                break;
        }

        // Update ghost position
        data.x = Math.max(5, Math.min(95, data.x));
        data.y = Math.max(20, Math.min(85, data.y));
        ghost.style.left = data.x + '%';
        ghost.style.top = data.y + '%';
    });
}

// ============================================
// COLLISION DETECTION
// ============================================
function checkCollisions() {
    if (!gameState.gameStarted) return;

    const player = gameState.player;

    // Ghost collisions (only when lights off)
    if (!gameState.lightsOn && !player.invulnerable) {
        gameState.ghostData.forEach((data, index) => {
            const ghost = gameState.ghosts[index];
            if (!ghost || ghost.classList.contains('kung-fu')) return;

            const dx = player.x - data.x;
            const dy = player.y - data.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8) { // Collision radius
                ghostAttackPlayer(data, index);
            }
        });
    }

    // Gummy collection (walk over to collect)
    const gummies = elements.gummiesContainer.querySelectorAll('.gummy:not(.collected)');
    gummies.forEach(gummy => {
        const gummyX = parseFloat(gummy.style.left);
        const gummyY = parseFloat(gummy.style.top);
        const dx = player.x - gummyX;
        const dy = player.y - gummyY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
            collectGummy(gummy);
        }
    });

    // Chuck E proximity healing
    if (gameState.chuckEVisible && player.hp < player.maxHp) {
        const chuckERect = elements.chuckE.getBoundingClientRect();
        const roomRect = elements.room.getBoundingClientRect();
        const chuckEX = ((chuckERect.left + chuckERect.width / 2) - roomRect.left) / roomRect.width * 100;
        const chuckEY = ((chuckERect.top + chuckERect.height / 2) - roomRect.top) / roomRect.height * 100;

        const dx = player.x - chuckEX;
        const dy = player.y - chuckEY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 12) {
            healPlayer();
        }
    }
}

// ============================================
// GHOST ATTACK
// ============================================
function ghostAttackPlayer(ghostData, ghostIndex) {
    const player = gameState.player;
    const ghost = gameState.ghosts[ghostIndex];

    // Play BOO effect
    playSound('boo');
    showBooEffect();

    // Damage player
    player.hp--;
    updateHPDisplay();

    // Knockback
    const dx = player.x - ghostData.x;
    const dy = player.y - ghostData.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    player.knockback.x = (dx / dist) * 100;
    player.knockback.y = (dy / dist) * 100;
    player.knockback.timer = 0.2;

    // Invulnerability frames
    player.invulnerable = true;
    player.invulnerableTimer = 2.0;
    if (elements.player) {
        elements.player.classList.add('invulnerable');
    }

    // Ghost cooldown
    ghostData.state = 'cooldown';
    ghostData.cooldownTimer = 1.5;
    ghost.classList.remove('chasing');

    // Check for death
    if (player.hp <= 0) {
        playerDeath();
    }
}

function showBooEffect() {
    if (!elements.booEffect) return;
    elements.booEffect.classList.remove('hidden');
    elements.booEffect.classList.add('active');

    setTimeout(() => {
        elements.booEffect.classList.remove('active');
        elements.booEffect.classList.add('hidden');
    }, 500);
}

// ============================================
// HP SYSTEM
// ============================================
function updateHPDisplay() {
    if (!elements.hpContainer) return;

    const hearts = elements.hpContainer.querySelectorAll('.heart');
    hearts.forEach((heart, index) => {
        if (index < gameState.player.hp) {
            heart.classList.remove('empty');
            heart.classList.add('full');
        } else {
            heart.classList.remove('full');
            heart.classList.add('empty');
        }
    });
}

function healPlayer() {
    if (!gameState.chuckEVisible) return;
    if (gameState.player.hp >= gameState.player.maxHp) return;

    playSound('hug');
    gameState.player.hp++;
    updateHPDisplay();

    // Show hearts
    elements.chuckEHearts.classList.remove('hidden');
    elements.chuckEHearts.classList.add('visible');

    // Hide Chuck E after healing
    setTimeout(() => {
        hideChuckE();
    }, 1000);
}

function playerDeath() {
    gameState.gameStarted = false;
    gameState.player.targetX = null;
    gameState.player.targetY = null;

    // Show respawn screen
    if (elements.respawnScreen) {
        elements.respawnScreen.classList.add('active');
    }
}

function respawnPlayer() {
    // Reset player
    gameState.player.hp = gameState.player.maxHp;
    gameState.player.x = 50;
    gameState.player.y = 70;
    gameState.player.invulnerable = true;
    gameState.player.invulnerableTimer = 2.0;
    if (elements.player) {
        elements.player.classList.add('invulnerable');
    }

    // Reset ghosts to patrol
    gameState.ghostData.forEach((data, index) => {
        data.state = 'patrol';
        data.x = data.homeX;
        data.y = data.homeY;
        const ghost = gameState.ghosts[index];
        if (ghost) {
            ghost.classList.remove('alert', 'chasing');
        }
    });

    // Hide respawn screen
    if (elements.respawnScreen) {
        elements.respawnScreen.classList.remove('active');
    }

    updateHPDisplay();
    updatePlayerDOM();
    gameState.gameStarted = true;
}

// ============================================
// DEPTH SORTING
// ============================================
function updateDepthSorting() {
    // All entities that need depth sorting
    const entities = [];

    // Player
    if (elements.player) {
        entities.push({ element: elements.player, y: gameState.player.y });
    }

    // Ghosts
    gameState.ghosts.forEach((ghost, index) => {
        if (ghost && gameState.ghostData[index]) {
            entities.push({ element: ghost, y: gameState.ghostData[index].y });
        }
    });

    // Gummies
    const gummies = elements.gummiesContainer.querySelectorAll('.gummy');
    gummies.forEach(gummy => {
        entities.push({ element: gummy, y: parseFloat(gummy.style.top) || 0 });
    });

    // Chuck E
    if (elements.chuckE && gameState.chuckEVisible) {
        const rect = elements.chuckE.getBoundingClientRect();
        const roomRect = elements.room.getBoundingClientRect();
        const y = ((rect.top + rect.height) - roomRect.top) / roomRect.height * 100;
        entities.push({ element: elements.chuckE, y: y });
    }

    // Sort by Y position (higher Y = in front = higher z-index)
    entities.sort((a, b) => a.y - b.y);

    // Apply z-index (base 10, increment by 1)
    entities.forEach((entity, index) => {
        entity.element.style.zIndex = 10 + index;
    });
}

// ============================================
// PROXIMITY COMBAT
// ============================================
function attackNearbyGhost() {
    if (gameState.lightsOn) return;

    const player = gameState.player;
    const attackRange = 15; // Must be within 15% of room size

    let closestGhost = null;
    let closestDist = Infinity;
    let closestIndex = -1;

    gameState.ghostData.forEach((data, index) => {
        const ghost = gameState.ghosts[index];
        if (!ghost || ghost.classList.contains('kung-fu')) return;
        if (!ghost.classList.contains('visible')) return;

        const dx = player.x - data.x;
        const dy = player.y - data.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < attackRange && dist < closestDist) {
            closestGhost = ghost;
            closestDist = dist;
            closestIndex = index;
        }
    });

    if (closestGhost) {
        kungFuGhost(closestGhost);
    } else {
        showTooFarFeedback();
    }
}

function showTooFarFeedback() {
    if (!elements.tooFarText) return;
    elements.tooFarText.classList.add('visible');
    setTimeout(() => {
        elements.tooFarText.classList.remove('visible');
    }, 800);
}

// ============================================
// GAME FLOW
// ============================================
function startGame() {
    gameState.gameStarted = true;
    gameState.currentRoom = 0;
    gameState.gummyBears = 0;

    // Reset player
    gameState.player.hp = gameState.player.maxHp;
    gameState.player.x = 50;
    gameState.player.y = 70;
    gameState.player.targetX = null;
    gameState.player.targetY = null;
    gameState.player.invulnerable = false;

    updateGummyCounter();
    updateHPDisplay();

    showScreen('game');
    setupRoom(0);
}

function showScreen(screenName) {
    elements.titleScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.roomCompleteScreen.classList.remove('active');
    elements.victoryScreen.classList.remove('active');

    switch (screenName) {
        case 'title':
            elements.titleScreen.classList.add('active');
            break;
        case 'game':
            elements.gameScreen.classList.add('active');
            break;
        case 'complete':
            elements.roomCompleteScreen.classList.add('active');
            playSound('roomComplete');
            break;
        case 'victory':
            elements.victoryScreen.classList.add('active');
            playSound('victory');
            break;
    }
}

// ============================================
// ROOM SETUP
// ============================================
function setupRoom(roomIndex) {
    const roomConfig = rooms[roomIndex];

    // Update room indicator
    elements.roomNumber.textContent = roomIndex + 1;

    // Set room class
    elements.room.className = 'room ' + roomConfig.class;

    // Reset lights to ON
    gameState.lightsOn = true;
    elements.room.classList.add('lights-on');
    elements.room.classList.remove('lights-off');
    elements.lightSwitch.classList.add('on');
    elements.lightSwitch.classList.remove('off');

    // Clear existing ghosts and gummies
    elements.ghostsContainer.innerHTML = '';
    elements.gummiesContainer.innerHTML = '';
    gameState.ghosts = [];
    gameState.ghostData = [];
    gameState.activeGhosts = 0;
    gameState.roomGummies = 0;

    // Reset player position for new room
    gameState.player.x = 50;
    gameState.player.y = 70;
    gameState.player.targetX = null;
    gameState.player.targetY = null;
    updatePlayerDOM();

    // Set up room decorations
    setupRoomDecor(roomIndex);

    // Create ghosts (hidden initially)
    roomConfig.ghostPositions.forEach((pos, index) => {
        createGhost(pos.x, pos.y, index);
    });

    gameState.activeGhosts = roomConfig.ghostCount;

    // Hide Chuck E initially
    hideChuckE();

    // Maybe spawn Chuck E after a delay
    scheduleChuckE();
}

// ============================================
// ROOM DECORATIONS
// ============================================
function setupRoomDecor(roomIndex) {
    elements.roomDecor.innerHTML = '';

    switch(roomIndex) {
        case 0: // Arcade Floor
            elements.roomDecor.innerHTML = `
                <!-- Skee-ball lanes -->
                <div class="decor skee-ball" style="left: 5%; bottom: 15%;">
                    <svg viewBox="0 0 60 100" width="60" height="100">
                        <rect x="5" y="0" width="50" height="100" fill="#8B4513" rx="5"/>
                        <rect x="10" y="5" width="40" height="60" fill="#654321"/>
                        <circle cx="30" cy="20" r="8" fill="#FFD700" stroke="#000" stroke-width="2"/>
                        <circle cx="30" cy="38" r="10" fill="#C0C0C0" stroke="#000" stroke-width="2"/>
                        <circle cx="30" cy="58" r="12" fill="#CD7F32" stroke="#000" stroke-width="2"/>
                        <rect x="10" y="70" width="40" height="25" fill="#333" rx="3"/>
                        <circle cx="30" cy="82" r="6" fill="#fff"/>
                    </svg>
                </div>

                <!-- Arcade Cabinet 1 -->
                <div class="decor arcade-cabinet" style="left: 25%; bottom: 12%;">
                    <svg viewBox="0 0 50 90" width="50" height="90">
                        <rect x="0" y="0" width="50" height="90" fill="#222" rx="3"/>
                        <rect x="5" y="5" width="40" height="30" fill="#000" rx="2"/>
                        <rect x="7" y="7" width="36" height="26" fill="#00ff00" class="screen-glow"/>
                        <rect x="5" y="40" width="40" height="20" fill="#333"/>
                        <circle cx="15" cy="50" r="5" fill="#ff0000"/>
                        <circle cx="35" cy="50" r="5" fill="#0000ff"/>
                        <rect x="10" y="65" width="30" height="5" fill="#FFD700"/>
                    </svg>
                </div>

                <!-- Basketball Game -->
                <div class="decor basketball-game" style="right: 8%; bottom: 15%;">
                    <svg viewBox="0 0 70 100" width="70" height="100">
                        <rect x="0" y="0" width="70" height="100" fill="#1a1a2e" rx="5"/>
                        <rect x="5" y="5" width="60" height="40" fill="#000"/>
                        <text x="35" y="30" text-anchor="middle" fill="#ff6600" font-size="12" font-weight="bold">HOOPS</text>
                        <circle cx="35" cy="60" r="12" fill="none" stroke="#ff6600" stroke-width="3"/>
                        <rect x="29" y="70" width="12" height="15" fill="#ff6600"/>
                        <circle cx="25" cy="90" r="5" fill="#ff6600"/>
                        <circle cx="45" cy="90" r="5" fill="#ff6600"/>
                    </svg>
                </div>

                <!-- Arcade Cabinet 2 -->
                <div class="decor arcade-cabinet" style="left: 50%; bottom: 10%;">
                    <svg viewBox="0 0 50 90" width="50" height="90">
                        <rect x="0" y="0" width="50" height="90" fill="#1a1a4e" rx="3"/>
                        <rect x="5" y="5" width="40" height="30" fill="#000" rx="2"/>
                        <rect x="7" y="7" width="36" height="26" fill="#ff00ff" class="screen-glow"/>
                        <rect x="5" y="40" width="40" height="20" fill="#333"/>
                        <circle cx="15" cy="50" r="5" fill="#ffff00"/>
                        <circle cx="35" cy="50" r="5" fill="#00ffff"/>
                        <rect x="10" y="65" width="30" height="5" fill="#FFD700"/>
                    </svg>
                </div>

                <!-- Dance Floor Lights -->
                <div class="decor dance-floor" style="left: 35%; bottom: 0;">
                    <svg viewBox="0 0 100 30" width="150" height="30">
                        <rect x="0" y="0" width="100" height="30" fill="#111"/>
                        <rect x="5" y="5" width="15" height="15" fill="#ff0066" class="dance-light"/>
                        <rect x="25" y="5" width="15" height="15" fill="#00ff66" class="dance-light" style="animation-delay: 0.2s"/>
                        <rect x="45" y="5" width="15" height="15" fill="#6600ff" class="dance-light" style="animation-delay: 0.4s"/>
                        <rect x="65" y="5" width="15" height="15" fill="#ffff00" class="dance-light" style="animation-delay: 0.6s"/>
                        <rect x="85" y="5" width="10" height="15" fill="#00ffff" class="dance-light" style="animation-delay: 0.8s"/>
                    </svg>
                </div>
            `;
            break;

        case 1: // Trampoline Zone
            elements.roomDecor.innerHTML = `
                <!-- Trampoline 1 -->
                <div class="decor trampoline" style="left: 10%; bottom: 10%;">
                    <svg viewBox="0 0 80 40" width="100" height="50">
                        <ellipse cx="40" cy="30" rx="38" ry="8" fill="#333"/>
                        <ellipse cx="40" cy="25" rx="35" ry="15" fill="#ff6b6b"/>
                        <ellipse cx="40" cy="25" rx="30" ry="12" fill="#ff8585"/>
                        <ellipse cx="40" cy="25" rx="25" ry="9" fill="#ffa5a5"/>
                    </svg>
                </div>

                <!-- Trampoline 2 -->
                <div class="decor trampoline" style="left: 40%; bottom: 8%;">
                    <svg viewBox="0 0 80 40" width="120" height="60">
                        <ellipse cx="40" cy="30" rx="38" ry="8" fill="#333"/>
                        <ellipse cx="40" cy="25" rx="35" ry="15" fill="#4ecdc4"/>
                        <ellipse cx="40" cy="25" rx="30" ry="12" fill="#6ed7d0"/>
                        <ellipse cx="40" cy="25" rx="25" ry="9" fill="#8ee3dd"/>
                    </svg>
                </div>

                <!-- Trampoline 3 -->
                <div class="decor trampoline" style="right: 8%; bottom: 12%;">
                    <svg viewBox="0 0 80 40" width="90" height="45">
                        <ellipse cx="40" cy="30" rx="38" ry="8" fill="#333"/>
                        <ellipse cx="40" cy="25" rx="35" ry="15" fill="#ffe66d"/>
                        <ellipse cx="40" cy="25" rx="30" ry="12" fill="#ffeb85"/>
                        <ellipse cx="40" cy="25" rx="25" ry="9" fill="#fff0a5"/>
                    </svg>
                </div>

                <!-- Safety Net -->
                <div class="decor safety-net" style="left: 0; top: 10%; width: 100%;">
                    <svg viewBox="0 0 200 50" width="100%" height="60" preserveAspectRatio="none">
                        <defs>
                            <pattern id="net" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="none" stroke="#666" stroke-width="1"/>
                            </pattern>
                        </defs>
                        <rect x="0" y="0" width="200" height="50" fill="url(#net)" opacity="0.5"/>
                    </svg>
                </div>

                <!-- Foam Pit -->
                <div class="decor foam-pit" style="left: 25%; bottom: 0;">
                    <svg viewBox="0 0 100 25" width="150" height="35">
                        <rect x="0" y="5" width="100" height="20" fill="#2d2d44"/>
                        <circle cx="10" cy="15" r="6" fill="#ff6b6b"/>
                        <circle cx="25" cy="12" r="7" fill="#4ecdc4"/>
                        <circle cx="42" cy="16" r="5" fill="#ffe66d"/>
                        <circle cx="58" cy="13" r="6" fill="#95e1d3"/>
                        <circle cx="75" cy="15" r="7" fill="#f38181"/>
                        <circle cx="90" cy="12" r="5" fill="#aa96da"/>
                    </svg>
                </div>
            `;
            break;

        case 2: // Prize Counter
            elements.roomDecor.innerHTML = `
                <!-- Prize Display Case -->
                <div class="decor prize-case" style="left: 5%; bottom: 20%;">
                    <svg viewBox="0 0 80 100" width="80" height="100">
                        <rect x="0" y="0" width="80" height="100" fill="#8B4513" rx="3"/>
                        <rect x="5" y="5" width="70" height="90" fill="#87CEEB" opacity="0.3"/>
                        <rect x="5" y="5" width="70" height="90" fill="none" stroke="#654321" stroke-width="3"/>
                        <!-- Prizes -->
                        <circle cx="25" cy="25" r="10" fill="#ff69b4"/> <!-- Pink bear -->
                        <circle cx="55" cy="25" r="10" fill="#87ceeb"/> <!-- Blue bear -->
                        <rect x="15" y="45" width="20" height="25" fill="#ffd700" rx="3"/> <!-- Trophy -->
                        <circle cx="55" cy="55" r="12" fill="#ff6347"/> <!-- Ball -->
                        <rect x="10" y="75" width="25" height="15" fill="#9370db" rx="2"/> <!-- Purple prize -->
                        <rect x="45" y="78" width="25" height="12" fill="#98fb98" rx="2"/> <!-- Green prize -->
                    </svg>
                </div>

                <!-- Gummy Bear Jars -->
                <div class="decor gummy-jars" style="left: 35%; bottom: 25%;">
                    <svg viewBox="0 0 100 80" width="120" height="96">
                        <!-- Jar 1 - Red gummies -->
                        <ellipse cx="25" cy="70" rx="18" ry="5" fill="#666"/>
                        <rect x="7" y="20" width="36" height="50" fill="#fff" opacity="0.4" rx="5"/>
                        <rect x="7" y="20" width="36" height="50" fill="none" stroke="#ccc" stroke-width="2" rx="5"/>
                        <rect x="10" y="15" width="30" height="8" fill="#8B4513" rx="2"/>
                        <circle cx="18" cy="45" r="5" fill="#ff0000"/>
                        <circle cx="28" cy="50" r="4" fill="#ff0000"/>
                        <circle cx="22" cy="58" r="5" fill="#ff0000"/>
                        <circle cx="32" cy="42" r="4" fill="#ff0000"/>

                        <!-- Jar 2 - Green gummies -->
                        <ellipse cx="75" cy="70" rx="18" ry="5" fill="#666"/>
                        <rect x="57" y="20" width="36" height="50" fill="#fff" opacity="0.4" rx="5"/>
                        <rect x="57" y="20" width="36" height="50" fill="none" stroke="#ccc" stroke-width="2" rx="5"/>
                        <rect x="60" y="15" width="30" height="8" fill="#8B4513" rx="2"/>
                        <circle cx="68" cy="45" r="5" fill="#00ff00"/>
                        <circle cx="78" cy="50" r="4" fill="#00ff00"/>
                        <circle cx="72" cy="58" r="5" fill="#00ff00"/>
                        <circle cx="82" cy="42" r="4" fill="#00ff00"/>
                    </svg>
                </div>

                <!-- Ticket Counter -->
                <div class="decor ticket-counter" style="right: 5%; bottom: 15%;">
                    <svg viewBox="0 0 90 110" width="90" height="110">
                        <rect x="0" y="20" width="90" height="90" fill="#FFD700" rx="5"/>
                        <rect x="5" y="25" width="80" height="60" fill="#fff"/>
                        <text x="45" y="50" text-anchor="middle" fill="#ff0000" font-size="10" font-weight="bold">TICKETS</text>
                        <text x="45" y="70" text-anchor="middle" fill="#000" font-size="14" font-weight="bold">1000</text>
                        <rect x="20" y="90" width="50" height="15" fill="#ff6600" rx="3"/>
                        <!-- Ticket roll -->
                        <rect x="30" y="0" width="30" height="25" fill="#ffcccc"/>
                        <line x1="35" y1="5" x2="55" y2="5" stroke="#ff9999" stroke-width="1"/>
                        <line x1="35" y1="10" x2="55" y2="10" stroke="#ff9999" stroke-width="1"/>
                        <line x1="35" y1="15" x2="55" y2="15" stroke="#ff9999" stroke-width="1"/>
                    </svg>
                </div>

                <!-- Claw Machine -->
                <div class="decor claw-machine" style="right: 30%; bottom: 18%;">
                    <svg viewBox="0 0 60 90" width="60" height="90">
                        <rect x="0" y="0" width="60" height="90" fill="#ff69b4" rx="5"/>
                        <rect x="5" y="5" width="50" height="55" fill="#000"/>
                        <rect x="7" y="7" width="46" height="51" fill="#87ceeb" opacity="0.3"/>
                        <!-- Claw -->
                        <line x1="30" y1="10" x2="30" y2="25" stroke="#888" stroke-width="3"/>
                        <path d="M22 25 L30 35 L38 25" fill="none" stroke="#888" stroke-width="3"/>
                        <!-- Prizes inside -->
                        <circle cx="20" cy="45" r="6" fill="#ff6347"/>
                        <circle cx="35" cy="48" r="5" fill="#98fb98"/>
                        <circle cx="45" cy="43" r="6" fill="#dda0dd"/>
                        <!-- Control panel -->
                        <rect x="10" y="65" width="40" height="20" fill="#333" rx="3"/>
                        <circle cx="30" cy="75" r="6" fill="#ff0000"/>
                    </svg>
                </div>

                <!-- Stuffed Animals Display -->
                <div class="decor stuffed-display" style="left: 25%; top: 15%;">
                    <svg viewBox="0 0 120 40" width="150" height="50">
                        <rect x="0" y="30" width="120" height="10" fill="#8B4513"/>
                        <!-- Bears -->
                        <circle cx="20" cy="20" r="12" fill="#ff69b4"/>
                        <circle cx="14" cy="12" r="4" fill="#ff69b4"/>
                        <circle cx="26" cy="12" r="4" fill="#ff69b4"/>
                        <circle cx="17" cy="18" r="2" fill="#000"/>
                        <circle cx="23" cy="18" r="2" fill="#000"/>

                        <circle cx="55" cy="22" r="10" fill="#87ceeb"/>
                        <circle cx="50" cy="15" r="3" fill="#87ceeb"/>
                        <circle cx="60" cy="15" r="3" fill="#87ceeb"/>
                        <circle cx="52" cy="20" r="1.5" fill="#000"/>
                        <circle cx="58" cy="20" r="1.5" fill="#000"/>

                        <circle cx="90" cy="18" r="14" fill="#98fb98"/>
                        <circle cx="82" cy="8" r="5" fill="#98fb98"/>
                        <circle cx="98" cy="8" r="5" fill="#98fb98"/>
                        <circle cx="86" cy="16" r="2" fill="#000"/>
                        <circle cx="94" cy="16" r="2" fill="#000"/>
                    </svg>
                </div>
            `;
            break;
    }
}

// ============================================
// GHOST MANAGEMENT
// ============================================
function createGhost(x, y, index) {
    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.dataset.index = index;
    ghost.style.left = x + '%';
    ghost.style.top = y + '%';

    // SVG Ghost sprite
    ghost.innerHTML = `
        <svg viewBox="0 0 60 70" width="60" height="70">
            <defs>
                <radialGradient id="ghostGlow${index}" cx="50%" cy="30%" r="60%">
                    <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#e0e0ff;stop-opacity:0.8" />
                </radialGradient>
            </defs>
            <!-- Ghost body -->
            <path d="M30 5 C10 5 5 25 5 40 L5 60 L12 55 L20 60 L30 55 L40 60 L48 55 L55 60 L55 40 C55 25 50 5 30 5 Z"
                  fill="url(#ghostGlow${index})"
                  stroke="#cce"
                  stroke-width="2"/>
            <!-- Eyes -->
            <ellipse cx="20" cy="30" rx="6" ry="8" fill="#333"/>
            <ellipse cx="40" cy="30" rx="6" ry="8" fill="#333"/>
            <ellipse cx="22" cy="28" rx="2" ry="3" fill="#fff"/>
            <ellipse cx="42" cy="28" rx="2" ry="3" fill="#fff"/>
            <!-- Cute smile -->
            <path d="M22 42 Q30 50 38 42" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            <!-- Rosy cheeks -->
            <circle cx="12" cy="38" r="4" fill="#ffcccc" opacity="0.6"/>
            <circle cx="48" cy="38" r="4" fill="#ffcccc" opacity="0.6"/>
        </svg>
    `;

    // Add slight random offset to animation
    ghost.style.animationDelay = (Math.random() * 2) + 's';

    // Tap to attack (with proximity check)
    addTouchListener(ghost, () => {
        const data = gameState.ghostData[index];
        if (!data) return;

        const player = gameState.player;
        const dx = player.x - data.x;
        const dy = player.y - data.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15) {
            kungFuGhost(ghost);
        } else {
            showTooFarFeedback();
        }
    });

    elements.ghostsContainer.appendChild(ghost);
    gameState.ghosts.push(ghost);

    // Initialize ghost AI data
    gameState.ghostData.push({
        x: x,
        y: y,
        homeX: x,
        homeY: y,
        state: 'patrol',
        patrolSpeed: 5,      // Slow wander
        chaseSpeed: 18,      // Slower than player (25)
        patrolTimer: Math.random() * 2,
        patrolTargetX: x,
        patrolTargetY: y,
        alertTimer: 0,
        cooldownTimer: 0
    });
}

// ============================================
// LIGHT SWITCH
// ============================================
function toggleLights() {
    gameState.lightsOn = !gameState.lightsOn;

    // Hide tutorial hint after first use
    if (!gameState.tutorialShown) {
        gameState.tutorialShown = true;
        const hint = document.getElementById('switch-hint');
        const lightSwitch = document.getElementById('light-switch');
        if (hint) hint.classList.remove('hint-visible');
        if (lightSwitch) lightSwitch.classList.remove('hint-glow');
    }

    if (gameState.lightsOn) {
        playSound('lightOn');
        // Lights ON - ghosts fade away
        elements.room.classList.add('lights-on');
        elements.room.classList.remove('lights-off');
        elements.lightSwitch.classList.add('on');
        elements.lightSwitch.classList.remove('off');

        // Hide remaining ghosts and reset their AI to patrol
        gameState.ghosts.forEach((ghost, index) => {
            if (!ghost.classList.contains('kung-fu')) {
                ghost.classList.remove('visible', 'alert', 'chasing');
            }
            // Reset ghost AI to patrol when lights on
            if (gameState.ghostData[index]) {
                gameState.ghostData[index].state = 'patrol';
                gameState.ghostData[index].patrolTimer = 0;
            }
        });

        // Check if room complete
        checkRoomComplete();

    } else {
        playSound('lightOff');
        // Lights OFF - ghosts appear
        elements.room.classList.remove('lights-on');
        elements.room.classList.add('lights-off');
        elements.lightSwitch.classList.remove('on');
        elements.lightSwitch.classList.add('off');

        // Show ghosts
        gameState.ghosts.forEach(ghost => {
            if (!ghost.classList.contains('kung-fu')) {
                ghost.classList.add('visible');
            }
        });
    }
}

// ============================================
// KUNG FU COMBAT
// ============================================
function kungFuGhost(ghost) {
    // Only can hit ghosts when lights are off and ghost is visible
    if (gameState.lightsOn || !ghost.classList.contains('visible')) {
        return;
    }

    // Already hit
    if (ghost.classList.contains('kung-fu')) {
        return;
    }

    // Play sounds
    playSound('kungFu');
    setTimeout(() => playSound('ghostHit'), 100);

    // Show kung fu effect
    showKungFuEffect();

    // Animate ghost being hit
    ghost.classList.add('kung-fu');
    ghost.classList.remove('visible');

    gameState.activeGhosts--;

    // Spawn gummy bear where ghost was
    setTimeout(() => {
        const rect = ghost.getBoundingClientRect();
        const containerRect = elements.gummiesContainer.getBoundingClientRect();
        const x = ((rect.left - containerRect.left) / containerRect.width) * 100;
        const y = ((rect.top - containerRect.top) / containerRect.height) * 100;
        spawnGummy(x, y);
    }, 200);

    // Check if all ghosts defeated
    if (gameState.activeGhosts <= 0) {
        setTimeout(() => {
            // Auto turn lights on
            if (!gameState.lightsOn) {
                toggleLights();
            }
        }, 500);
    }
}

function showKungFuEffect() {
    elements.kungFuEffect.classList.remove('hidden');
    elements.kungFuEffect.classList.add('active');

    // Reset animation
    const hiyaText = elements.kungFuEffect.querySelector('.hiya-text');
    hiyaText.style.animation = 'none';
    hiyaText.offsetHeight; // Trigger reflow
    hiyaText.style.animation = null;

    setTimeout(() => {
        elements.kungFuEffect.classList.remove('active');
        elements.kungFuEffect.classList.add('hidden');
    }, 400);
}

// ============================================
// GUMMY BEARS
// ============================================
function spawnGummy(x, y) {
    const gummy = document.createElement('div');
    gummy.className = 'gummy';
    gummy.style.left = x + '%';
    gummy.style.top = y + '%';

    // Gummy bear SVG with random color
    const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#ff69b4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    gummy.innerHTML = `
        <svg viewBox="0 0 40 50" width="40" height="50">
            <!-- Body -->
            <ellipse cx="20" cy="32" rx="14" ry="16" fill="${color}"/>
            <!-- Head -->
            <circle cx="20" cy="14" r="10" fill="${color}"/>
            <!-- Ears -->
            <circle cx="10" cy="6" r="5" fill="${color}"/>
            <circle cx="30" cy="6" r="5" fill="${color}"/>
            <!-- Eyes -->
            <circle cx="16" cy="13" r="2" fill="#000"/>
            <circle cx="24" cy="13" r="2" fill="#000"/>
            <!-- Nose -->
            <ellipse cx="20" cy="17" rx="2" ry="1.5" fill="#000"/>
            <!-- Arms -->
            <ellipse cx="7" cy="28" rx="4" ry="6" fill="${color}"/>
            <ellipse cx="33" cy="28" rx="4" ry="6" fill="${color}"/>
            <!-- Legs -->
            <ellipse cx="13" cy="46" rx="5" ry="4" fill="${color}"/>
            <ellipse cx="27" cy="46" rx="5" ry="4" fill="${color}"/>
            <!-- Shine -->
            <ellipse cx="24" cy="28" rx="3" ry="5" fill="#fff" opacity="0.3"/>
        </svg>
    `;

    addTouchListener(gummy, () => collectGummy(gummy));

    elements.gummiesContainer.appendChild(gummy);
}

function collectGummy(gummy) {
    if (gummy.classList.contains('collected')) return;

    playSound('gummyCollect');
    gummy.classList.add('collected');
    gameState.gummyBears++;
    gameState.roomGummies++;
    updateGummyCounter();

    setTimeout(() => {
        gummy.remove();
    }, 300);
}

function updateGummyCounter() {
    elements.gummyCount.textContent = gameState.gummyBears;
}

// ============================================
// ROOM COMPLETION
// ============================================
function checkRoomComplete() {
    // Room complete when lights are on and all ghosts are defeated
    if (gameState.lightsOn && gameState.activeGhosts <= 0) {
        setTimeout(() => {
            completeRoom();
        }, 1000);
    }
}

function completeRoom() {
    // Collect any remaining gummies automatically
    const remainingGummies = elements.gummiesContainer.querySelectorAll('.gummy:not(.collected)');
    remainingGummies.forEach(gummy => {
        collectGummy(gummy);
    });

    setTimeout(() => {
        if (gameState.currentRoom >= rooms.length - 1) {
            // Game complete!
            showVictory();
        } else {
            // Show room complete screen
            elements.earnedCount.textContent = gameState.roomGummies;
            showScreen('complete');
        }
    }, 500);
}

function nextRoom() {
    gameState.currentRoom++;
    showScreen('game');
    setupRoom(gameState.currentRoom);
}

function showVictory() {
    elements.totalGummies.textContent = gameState.gummyBears;
    showScreen('victory');
}

function restartGame() {
    gameState.currentRoom = 0;
    gameState.gummyBears = 0;
    gameState.tutorialShown = false;
    gameState.gameStarted = true;

    // Reset player
    gameState.player.hp = gameState.player.maxHp;
    gameState.player.x = 50;
    gameState.player.y = 70;
    gameState.player.targetX = null;
    gameState.player.targetY = null;
    gameState.player.invulnerable = false;
    if (elements.player) {
        elements.player.classList.remove('invulnerable');
    }

    // Show tutorial hint again
    const hint = document.getElementById('switch-hint');
    const lightSwitch = document.getElementById('light-switch');
    if (hint) hint.classList.add('hint-visible');
    if (lightSwitch) lightSwitch.classList.add('hint-glow');

    updateGummyCounter();
    updateHPDisplay();
    showScreen('game');
    setupRoom(0);
}

// ============================================
// CHUCK E CHEESE
// ============================================
function scheduleChuckE() {
    // Clear any existing timeout
    if (gameState.chuckETimeout) {
        clearTimeout(gameState.chuckETimeout);
    }

    // Appear more frequently when HP is low
    let delay;
    if (gameState.player.hp <= 1) {
        delay = 3000 + Math.random() * 4000; // 3-7 seconds when critical
    } else if (gameState.player.hp <= 2) {
        delay = 4000 + Math.random() * 6000; // 4-10 seconds when hurt
    } else {
        delay = 8000 + Math.random() * 12000; // 8-20 seconds when healthy
    }

    gameState.chuckETimeout = setTimeout(() => {
        if (gameState.gameStarted && !gameState.lightsOn) {
            showChuckE();
        } else {
            scheduleChuckE(); // Try again later
        }
    }, delay);
}

function showChuckE() {
    if (gameState.chuckEVisible) return;

    playSound('chuckEAppear');
    gameState.chuckEVisible = true;
    elements.chuckE.classList.remove('hidden');
    elements.chuckE.classList.add('visible');

    // Hide after some time
    setTimeout(() => {
        if (!elements.chuckEHearts.classList.contains('visible')) {
            hideChuckE();
        }
    }, 4000);
}

function hideChuckE() {
    gameState.chuckEVisible = false;
    elements.chuckE.classList.remove('visible');
    elements.chuckE.classList.add('hidden');
    elements.chuckEHearts.classList.remove('visible');
    elements.chuckEHearts.classList.add('hidden');

    // Schedule next appearance
    scheduleChuckE();
}

function hugChuckE() {
    if (!gameState.chuckEVisible) return;

    playSound('hug');

    // Show hearts
    elements.chuckEHearts.classList.remove('hidden');
    elements.chuckEHearts.classList.add('visible');

    // Reset hearts animation
    elements.chuckEHearts.style.animation = 'none';
    elements.chuckEHearts.offsetHeight;
    elements.chuckEHearts.style.animation = null;

    // Hide Chuck E after hug
    setTimeout(() => {
        hideChuckE();
    }, 1500);
}

// ============================================
// INITIALIZE
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
