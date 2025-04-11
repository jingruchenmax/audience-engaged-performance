import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
  push
} from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🔊 Audio Map
const groupToAudio = {
  dnb: new Audio('/audio/Rhyth.wav'),
  bells: new Audio('/audio/Wind.wav'),
  brass: new Audio('/audio/Brass.wav'),
  piano: new Audio('/audio/Strings.wav')
};

Object.values(groupToAudio).forEach(audio => {
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  audio.muted = false;
});

// 🔒 State
const userId = `user_${Math.random().toString(36).substring(2, 10)}`;
const userRef = ref(db, `users/${userId}`);
onDisconnect(userRef).remove();

const groupButtons = document.querySelectorAll('.group-button');
const groupPage = document.getElementById('group-page');
const groupTitle = document.getElementById('group-title');
const mainButton = document.getElementById('main-button');
const homePage = document.getElementById('home');

let selectedGroup = null;
let currentAudio = null;
let instrumentColor = '#333';
let globalStartTimestamp = null;
let playStart = null;
let isPlaying = false;

// 🎚️ Fade volume helper
function fadeVolume(audio, targetVolume, duration = 300) {
  if (!audio) return;
  const stepTime = 16;
  const steps = Math.ceil(duration / stepTime);
  const volumeDiff = targetVolume - audio.volume;
  const stepSize = volumeDiff / steps;
  let currentStep = 0;

  function step() {
    if (!audio) return;
    currentStep++;
    audio.volume = Math.min(Math.max(0, audio.volume + stepSize), 1);
    if (currentStep < steps) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// 🔁 Fetch timestamp if needed
async function fetchGlobalTimestamp() {
  const snapshot = await get(ref(db, 'globalTimestamp'));
  if (snapshot.exists()) {
    globalStartTimestamp = snapshot.val();
  } else {
    console.warn('No global timestamp available.');
  }
}

// 📲 Instrument selection
groupButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedGroup = button.dataset.group;
    currentAudio = groupToAudio[selectedGroup];

    instrumentColor = getComputedStyle(document.documentElement)
      .getPropertyValue(`--color-${selectedGroup}`)
      .trim();

    document.documentElement.style.setProperty('--active-color', instrumentColor);
    mainButton.style.backgroundColor = instrumentColor;
    groupTitle.textContent = `${button.textContent} Mode`;

    set(userRef, {
      instrument: selectedGroup,
      playing: false,
      joinedAt: serverTimestamp(),
      activationRecords: []
    });

    fetchGlobalTimestamp();

    homePage.classList.remove('active');
    groupPage.classList.add('active');
  });
});

// ▶️ Start playback when held
async function onHoldStart() {
  await fetchGlobalTimestamp();
  if (!currentAudio) return;
  if (isPlaying) return;
  isPlaying = true;

  groupPage.classList.add('active-playing');

  if (isNaN(currentAudio.duration)) {
    await new Promise(resolve => {
      currentAudio.addEventListener('canplaythrough', resolve, { once: true });
    });
  }

  const offset = (Date.now() - globalStartTimestamp) / 1000;
  const duration = currentAudio.duration || 60;
  currentAudio.currentTime = offset % duration;

  try {
    await currentAudio.play();
    fadeVolume(currentAudio, 1, 300);
    playStart = Date.now();
    update(userRef, { playing: true });
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
}

function onHoldEnd() {
  if (!isPlaying) return;
  isPlaying = false;

  if (!currentAudio) return;

  groupPage.classList.remove('active-playing');

  // Immediately mute and stop
  fadeVolume(currentAudio, 0);
  currentAudio.pause();
  currentAudio.currentTime = 0;

  update(userRef, { playing: false });

  if (playStart) {
    push(ref(db, `users/${userId}/activationRecords`), {
      start: playStart,
      end: Date.now()
    });
    playStart = null;
  }
}


// 🖱️ + 👆 Events
mainButton.addEventListener('mousedown', onHoldStart);
mainButton.addEventListener('mouseup', onHoldEnd);
mainButton.addEventListener('mouseleave', onHoldEnd);
mainButton.addEventListener('touchstart', e => {
  e.preventDefault();
  onHoldStart();
}, { passive: false });
mainButton.addEventListener('touchend', onHoldEnd);
mainButton.addEventListener('touchcancel', onHoldEnd);
