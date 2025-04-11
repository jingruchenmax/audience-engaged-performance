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

const playBtn = document.getElementById('playBtn');
const loopBtn = document.getElementById('loopBtn');
const loopStateDisplay = document.getElementById('loopState');
const timestampDisplay = document.getElementById('timestampDisplay');
const alertBox = document.getElementById('alert');
const dashboard = document.getElementById('dashboard');
const video = document.getElementById('syncedVideo');
const bottomStats = document.getElementById('bottomStats');

const AUDIO_DURATION_SEC = 60;
let loopEnabled = true;

// 🔁 Toggle loop
loopBtn.onclick = () => {
  loopEnabled = !loopEnabled;
  set(ref(db, 'loopEnabled'), loopEnabled);
  updateLoopDisplay();
};

function updateLoopDisplay() {
  loopStateDisplay.textContent = loopEnabled ? 'Looping ON' : 'Looping OFF';
  loopBtn.textContent = loopEnabled ? '🔁 Turn Loop OFF' : '🔁 Turn Loop ON';
}

// ▶️ Restart music + video
playBtn.onclick = () => {
  const now = Date.now();
  set(ref(db, 'globalTimestamp'), now);
  video.currentTime = 0;
  video.muted = true;   // ✅ mute video
  video.play();
};


// Watch loop setting
onValue(ref(db, 'loopEnabled'), snapshot => {
  loopEnabled = !!snapshot.val();
  updateLoopDisplay();
});

// Sync timestamp display
onValue(ref(db, 'globalTimestamp'), snapshot => {
  const ts = snapshot.val();
  if (!ts) return;

  const now = Date.now();
  const diffSec = (now - ts) / 1000;

  if (diffSec > AUDIO_DURATION_SEC && !loopEnabled) {
    alertBox.textContent = '⚠️ Music clip has ended — Press ▶️ to restart';
  } else {
    alertBox.textContent = '';
  }
});

// 🎵 Icons
const instrumentIcons = {
  dnb: '🥁',
  bells: '🔔',
  brass: '🎺',
  piano: '🎹'
};

// 📊 Live stats every 2 seconds
function updateStats(data) {
  const stats = {};
  const now = Date.now();

  Object.keys(instrumentIcons).forEach(key => {
    stats[key] = { count: 0, totalSeconds: 0, activeNow: 0 };
  });

  Object.entries(data).forEach(([_, user]) => {
    const inst = user.instrument;
    if (!inst) return;

    stats[inst].count++;

    (user.activationRecords || []).forEach(record => {
      const start = record.start || 0;
      const end = record.end || now;
      stats[inst].totalSeconds += (end - start) / 1000;
    });

    if (user.playing) {
      stats[inst].activeNow++;
    }
  });

  // Bottom row for active counts
  bottomStats.innerHTML = '';
  Object.entries(stats).forEach(([inst, val]) => {
    bottomStats.innerHTML += `
      <div class="count-box">
        ${instrumentIcons[inst]}<br/>
        ${val.activeNow} playing
      </div>
    `;
  });
}

setInterval(() => {
  get(ref(db, 'users')).then(snapshot => {
    const data = snapshot.val() || {};
    updateStats(data);
  });
}, 2000);
