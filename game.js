// Graham's Ghost Bash - Game Logic

// ============================================
// SOUND EFFECTS (Web Audio API)
// ============================================
let audioContext = null;
let audioUnlocked = false;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume audio context on user interaction (required for mobile)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // iOS/Safari requires playing a sound during a user gesture to "unlock" audio
    if (!audioUnlocked) {
        unlockAudio();
    }
}

function unlockAudio() {
    if (!audioContext || audioUnlocked) return;

    // Create a short silent buffer and play it to unlock audio on iOS
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);

    // Also create and immediately stop an oscillator (belt and suspenders approach)
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, audioContext.currentTime); // Silent
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(0);
    osc.stop(audioContext.currentTime + 0.001);

    audioUnlocked = true;
    console.log('Audio unlocked for mobile');
}

// Play a sound effect
function playSound(type) {
    if (!audioContext) return;

    // Make sure context is running
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const now = audioContext.currentTime;

    switch(type) {
        case 'lightOn':
            playLightSwitch(true);
            break;
        case 'lightOff':
            playLightSwitch(false);
            break;
        case 'kungFu':
            playKungFu();
            break;
        case 'ghostHit':
            playGhostGiggle();
            break;
        case 'gummyCollect':
            playGummyCollect();
            break;
        case 'chuckEAppear':
            playChuckESound();
            break;
        case 'hug':
            playHugSound();
            break;
        case 'victory':
            playVictorySound();
            break;
        case 'roomComplete':
            playRoomComplete();
            break;
    }
}

function playLightSwitch(on) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 800 : 400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(on ? 1200 : 200, audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.1);
}

function playKungFu() {
    // "HI-YA!" sound - quick ascending tone
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);

    // Add a punch noise
    const noise = audioContext.createOscillator();
    const noiseGain = audioContext.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.type = 'square';
    noise.frequency.setValueAtTime(100, audioContext.currentTime + 0.05);
    noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    noise.start(audioContext.currentTime + 0.05);
    noise.stop(audioContext.currentTime + 0.15);
}

function playGhostGiggle() {
    // Cute ghost giggle - wobbly high tone
    for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = 'sine';
        const baseFreq = 600 + (i * 100);
        osc.frequency.setValueAtTime(baseFreq, audioContext.currentTime + (i * 0.08));
        osc.frequency.setValueAtTime(baseFreq + 50, audioContext.currentTime + (i * 0.08) + 0.04);

        gain.gain.setValueAtTime(0.2, audioContext.currentTime + (i * 0.08));
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (i * 0.08) + 0.08);

        osc.start(audioContext.currentTime + (i * 0.08));
        osc.stop(audioContext.currentTime + (i * 0.08) + 0.08);
    }
}

function playGummyCollect() {
    // Happy coin-like collect sound
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioContext.currentTime);
    osc.frequency.setValueAtTime(1108, audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.2);
}

function playChuckESound() {
    // Friendly appearance jingle
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + (i * 0.1));

        gain.gain.setValueAtTime(0.25, audioContext.currentTime + (i * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (i * 0.1) + 0.15);

        osc.start(audioContext.currentTime + (i * 0.1));
        osc.stop(audioContext.currentTime + (i * 0.1) + 0.15);
    });
}

function playHugSound() {
    // Warm, happy hug sound
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.4);
}

function playVictorySound() {
    // Triumphant victory fanfare
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + (i * 0.15));

        gain.gain.setValueAtTime(0.2, audioContext.currentTime + (i * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (i * 0.15) + 0.3);

        osc.start(audioContext.currentTime + (i * 0.15));
        osc.stop(audioContext.currentTime + (i * 0.15) + 0.3);
    });
}

function playRoomComplete() {
    // Level complete jingle
    const notes = [659, 784, 880]; // E5, G5, A5
    notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + (i * 0.12));

        gain.gain.setValueAtTime(0.25, audioContext.currentTime + (i * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + (i * 0.12) + 0.2);

        osc.start(audioContext.currentTime + (i * 0.12));
        osc.stop(audioContext.currentTime + (i * 0.12) + 0.2);
    });
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
    tutorialShown: false
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
    kungFuEffect: document.getElementById('kung-fu-effect')
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
    addTouchListener(elements.chuckE, hugChuckE);

    // Prevent default touch behaviors
    document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}

// Helper to add touch/click listener
function addTouchListener(element, callback) {
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        initAudio(); // Initialize/resume audio on every touch
        callback();
    }, { passive: false });

    element.addEventListener('click', (e) => {
        // Only trigger on click if not a touch device
        if (!('ontouchstart' in window)) {
            initAudio(); // Initialize/resume audio on every click
            callback();
        }
    });
}

// Also listen for any touch on the document to unlock audio early
document.addEventListener('touchstart', function unlockOnTouch() {
    initAudio();
}, { once: false, passive: true });

// ============================================
// GAME FLOW
// ============================================
function startGame() {
    gameState.gameStarted = true;
    gameState.currentRoom = 0;
    gameState.gummyBears = 0;
    updateGummyCounter();

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
    gameState.activeGhosts = 0;
    gameState.roomGummies = 0;

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

    addTouchListener(ghost, () => kungFuGhost(ghost));

    elements.ghostsContainer.appendChild(ghost);
    gameState.ghosts.push(ghost);
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

        // Hide remaining ghosts
        gameState.ghosts.forEach(ghost => {
            if (!ghost.classList.contains('kung-fu')) {
                ghost.classList.remove('visible');
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

    // Show tutorial hint again
    const hint = document.getElementById('switch-hint');
    const lightSwitch = document.getElementById('light-switch');
    if (hint) hint.classList.add('hint-visible');
    if (lightSwitch) lightSwitch.classList.add('hint-glow');

    updateGummyCounter();
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

    // Random chance to appear
    const delay = 5000 + Math.random() * 10000; // 5-15 seconds
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
