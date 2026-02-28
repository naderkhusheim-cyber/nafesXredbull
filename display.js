// ================================================================
//  display.js — Live leaderboard logic for index.html
//  Listens to Firebase Realtime Database and re-renders whenever
//  players or sort-order change.
// ================================================================

const leaderboardEl = document.getElementById('leaderboard');
const statusDotEl   = document.getElementById('status-dot');
const statusTextEl  = document.getElementById('status-text');

let currentPlayers = [];
let currentSort    = 'time-asc'; // default: fastest first

// ── Connection status ────────────────────────────────────────
db.ref('.info/connected').on('value', snap => {
  const connected = snap.val() === true;
  statusDotEl.style.background  = connected ? '#22c55e' : '#e4002b';
  statusTextEl.textContent       = connected ? 'Live' : 'Disconnected';
});

// ── Listen for players ───────────────────────────────────────
db.ref('players').on('value', snap => {
  currentPlayers = [];
  snap.forEach(child => {
    currentPlayers.push({ id: child.key, ...child.val() });
  });
  render();
});

// ── Listen for sort-order (set by admin) ─────────────────────
db.ref('settings/sortOrder').on('value', snap => {
  currentSort = snap.val() || 'time-asc';
  render();
});

// ── Render ───────────────────────────────────────────────────
function render() {
  const sorted = getSorted(currentPlayers, currentSort);

  if (sorted.length === 0) {
    leaderboardEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🏁</span>
        <p>Waiting for players&hellip;</p>
      </div>`;
    return;
  }

  leaderboardEl.innerHTML = sorted.map(buildRow).join('');
}

function buildRow(player, index) {
  const rank      = index + 1;
  const medals    = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const medal     = medals[rank] || '';
  const rankClass = rank <= 3 ? `rank-${rank}` : '';

  return `
    <div class="player-row ${rankClass}">
      <span class="rank-number">${rank}</span>
      <span class="medal" aria-hidden="true">${medal}</span>
      <span class="player-name">${safeHtml(player.name)}</span>
      <span class="player-time">${formatTime(player.time)}</span>
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────────
function getSorted(list, order) {
  const copy = [...list];
  if (order === 'time-asc')  return copy.sort((a, b) => a.time - b.time);
  if (order === 'time-desc') return copy.sort((a, b) => b.time - a.time);
  return copy; // 'entry' — preserve insertion order
}

function formatTime(seconds) {
  return `${parseFloat(seconds).toFixed(2)} Seconds`;
}

/** Escape user content before injecting into innerHTML */
function safeHtml(str) {
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

// ── Dark / Light mode toggle ──────────────────────────────────
const themeToggleBtn  = document.getElementById('theme-toggle');
const themeIconEl     = document.getElementById('theme-icon');

// Restore last choice
if (localStorage.getItem('theme') === 'light') applyLight();

themeToggleBtn.addEventListener('click', () => {
  if (document.body.classList.contains('light-mode')) {
    applyDark();
  } else {
    applyLight();
  }
});

function applyLight() {
  document.body.classList.add('light-mode');
  themeIconEl.textContent = '🌙';       // show moon → click to go dark
  localStorage.setItem('theme', 'light');
}

function applyDark() {
  document.body.classList.remove('light-mode');
  themeIconEl.textContent = '☀️';       // show sun → click to go light
  localStorage.setItem('theme', 'dark');
}
