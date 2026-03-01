// ================================================================
//  display.js — Live leaderboard logic for index.html
// ================================================================

const leaderboardEl = document.getElementById('leaderboard');

let currentPlayers = [];
let currentSort    = 'time-asc';

// ── Firebase: connection status (internal only, badge is hidden) ──
db.ref('.info/connected').on('value', () => {});

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
  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  const val       = parseFloat(player.time).toFixed(2);

  // Top 3 → medal only (no number). 4+ → number only (no medal).
  const position = rank <= 3
    ? `<span class="pos-medal">${medals[rank]}</span>`
    : `<span class="pos-number">${rank}</span>`;

  return `
    <div class="player-row ${rankClass}">
      ${position}
      <span class="player-name">${safeHtml(player.name)}</span>
      <span class="player-time">
        <span class="t-full">${val} Seconds</span>
        <span class="t-short">${val}s</span>
      </span>
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────────
function getSorted(list, order) {
  const copy = [...list];
  if (order === 'time-asc')  return copy.sort((a, b) => a.time - b.time);
  if (order === 'time-desc') return copy.sort((a, b) => b.time - a.time);
  return copy;
}

function safeHtml(str) {
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

// ── Theme helpers ─────────────────────────────────────────────
function applyLight() {
  document.body.classList.add('light-mode');
  localStorage.setItem('theme', 'light');
  updateThemeOption();
}

function applyDark() {
  document.body.classList.remove('light-mode');
  localStorage.setItem('theme', 'dark');
  updateThemeOption();
}

function toggleTheme() {
  document.body.classList.contains('light-mode') ? applyDark() : applyLight();
}

function updateThemeOption() {
  const btn = document.getElementById('theme-option');
  if (!btn) return;
  const isLight = document.body.classList.contains('light-mode');
  btn.textContent = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
}

// Restore saved theme on load
if (localStorage.getItem('theme') === 'light') applyLight();

// ── PC: type "LIGHT" or "DARK" anywhere on page ───────────────
let typedBuffer = '';
document.addEventListener('keydown', e => {
  if (e.key.length !== 1) return;          // ignore Enter, Shift, etc.
  typedBuffer += e.key.toUpperCase();
  typedBuffer  = typedBuffer.slice(-5);    // keep last 5 characters
  if (typedBuffer.endsWith('LIGHT')) applyLight();
  if (typedBuffer.endsWith('DARK'))  applyDark();
});

// ── Mobile: ⚙️ dropdown menu ──────────────────────────────────
const menuTrigger  = document.getElementById('mobile-menu-trigger');
const menuDropdown = document.getElementById('mobile-menu-dropdown');
const themeOption  = document.getElementById('theme-option');

menuTrigger.addEventListener('click', e => {
  e.stopPropagation();
  menuDropdown.classList.toggle('hidden');
});

themeOption.addEventListener('click', () => {
  toggleTheme();
  menuDropdown.classList.add('hidden');
});

// Close dropdown when tapping elsewhere
document.addEventListener('click', () => {
  menuDropdown.classList.add('hidden');
});

updateThemeOption();
