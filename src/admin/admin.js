import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  onValue,
  get
} from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const dashboard = document.getElementById('dashboard');
const playBtn = document.getElementById('playBtn');
const loopBtn = document.getElementById('loopBtn');
const timestampDisplay = document.getElementById('timestampDisplay');
const alertBox = document.getElementById('alert');
const loopStateDisplay = document.getElementById('loopState');

const AUDIO_DURATION_SEC = 60;
let loopEnabled = true;

// 🔁 Toggle loop
loopBtn.onclick = () => {
  loopEnabled = !loopEnabled;
  set(ref(db, 'loopEnabled'), loopEnabled);
  updateLoopDisplay();
};

// ▶️ Restart music
playBtn.onclick = () => {
  const now = Date.now();
  set(ref(db, 'globalTimestamp'), now);
};

// Update loop display
function updateLoopDisplay() {
  loopStateDisplay.textContent = loopEnabled ? 'Looping ON' : 'Looping OFF';
  loopBtn.textContent = loopEnabled ? '🔁 Turn Loop OFF' : '🔁 Turn Loop ON';
}

// Listen for loop changes
onValue(ref(db, 'loopEnabled'), snapshot => {
  loopEnabled = !!snapshot.val();
  updateLoopDisplay();
});

// Listen for global timestamp
onValue(ref(db, 'globalTimestamp'), snapshot => {
  const ts = snapshot.val();
  if (!ts) return;

  const now = Date.now();
  const diffSec = (now - ts) / 1000;

  timestampDisplay.textContent = `${ts} (${new Date(ts).toLocaleTimeString()})`;

  if (diffSec > AUDIO_DURATION_SEC && !loopEnabled) {
    alertBox.textContent = '⚠️ Music clip has ended — Press ▶️ to restart';
  } else {
    alertBox.textContent = '';
  }
});

// 🎵 Instrument icons
const instrumentIcons = {
  dnb: '🥁 Drum & Bass',
  bells: '🔔 Bells & Guitars',
  brass: '🎺 Brass & Winds',
  piano: '🎹 Piano & Strings'
};

// 🧠 Update stats function
function updateStats(data) {
  const stats = {};
  const now = Date.now();

  Object.keys(instrumentIcons).forEach(key => {
    stats[key] = { count: 0, totalSeconds: 0 };
  });

  Object.entries(data).forEach(([_, user]) => {
    const inst = user.instrument;
    if (!inst) return;

    stats[inst].count++;

    const records = user.activationRecords ? Object.values(user.activationRecords) : [];

    records.forEach(record => {
      const start = record.start || 0;
      const end = record.end || now;
      stats[inst].totalSeconds += (end - start) / 1000;
    });

    // Still playing? Add live time since last record start
    if (user.playing && records.length > 0) {
      const last = records[records.length - 1];
      if (!last.end && last.start) {
        stats[inst].totalSeconds += (now - last.start) / 1000;
      }
    }
  });

  dashboard.innerHTML = '';
  Object.entries(stats).forEach(([inst, val]) => {
    dashboard.innerHTML += `
      <div style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #555; border-radius: 8px;">
        <strong>${instrumentIcons[inst]}</strong> — 
        <span>${val.count} active</span> — 
        <span>${Math.floor(val.totalSeconds)}s triggered</span>
      </div>
    `;
  });
}

// 🔁 Poll every 2 seconds
setInterval(() => {
  get(ref(db, 'users')).then(snapshot => {
    const data = snapshot.val() || {};
    updateStats(data);
  });
}, 2000);
