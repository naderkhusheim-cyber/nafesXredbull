// ================================================================
//  display.js — Live leaderboard logic for index.html
//  Theme + prizes title + images are admin-controlled via Firebase
// ================================================================

const leaderboardEl   = document.getElementById('leaderboard');
const prizeCardsEl    = document.getElementById('prize-cards');
const prizesTitleEl   = document.getElementById('prizes-title');
const prizesSectionEl = document.getElementById('prizes-section');

let currentPlayers = [];
let currentSort    = 'time-asc';

// ── Restore theme from localStorage immediately (before Firebase) ──
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

// ── Firebase: Listen for theme ────────────────────────────────
db.ref('settings/theme').on('value', snap => {
  const theme = snap.val() || 'dark';
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

// ── Firebase: Listen for prizes section title ─────────────────
db.ref('settings/prizesTitle').on('value', snap => {
  const title = snap.val() || 'PLAY AND WIN MANY PRIZES';
  prizesTitleEl.textContent = title;
});

// ── Firebase: Listen for images → floating prize cards ────────
db.ref('settings/images').on('value', snap => {
  const imgs = [];
  snap.forEach(child => imgs.push({ id: child.key, ...child.val() }));

  if (imgs.length === 0) {
    prizesSectionEl.style.display = 'none';
    prizeCardsEl.innerHTML = '';
    return;
  }

  imgs.sort((a, b) => (a.order || 0) - (b.order || 0));

  prizeCardsEl.innerHTML = imgs
    .map(img => {
      const src = safeUrl(img.url);
      if (!src) return '';
      // onerror: dim image but KEEP the white card visible
      return `<div class="prize-card"><img src="${src}" alt="${safeHtml(img.label || '')}" loading="lazy" onerror="this.style.opacity='0.35'" /></div>`;
    })
    .join('');

  prizesSectionEl.style.display = '';
});

// ── Firebase: Listen for players ─────────────────────────────
db.ref('players').on('value', snap => {
  currentPlayers = [];
  snap.forEach(child => {
    currentPlayers.push({ id: child.key, ...child.val() });
  });
  render();
});

// ── Firebase: Listen for sort-order (set by admin) ────────────
db.ref('settings/sortOrder').on('value', snap => {
  currentSort = snap.val() || 'time-asc';
  render();
});

// ── Render ───────────────────────────────────────────────────
const DISPLAY_LIMIT = 20;

function render() {
  const sorted = getSorted(currentPlayers, currentSort).slice(0, DISPLAY_LIMIT);

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
  const formatted = formatTime(parseFloat(player.time));
  const parts     = formatted.split(':');

  const position = rank <= 3
    ? `<span class="pos-medal">${medals[rank]}</span>`
    : `<span class="pos-number">${rank}</span>`;

  // 3-part: M:SS:MS  |  2-part: SS:MS
  const timeHTML = parts.length === 3
    ? `<span class="time-m">${parts[0]}</span><span class="time-sep">:</span><span class="time-s">${parts[1]}</span><span class="time-sep">:</span><span class="time-cs">${parts[2]}</span>`
    : `<span class="time-s">${parts[0]}</span><span class="time-sep">:</span><span class="time-cs">${parts[1]}</span>`;

  return `
    <div class="player-row ${rankClass}">
      ${position}
      <span class="player-name">${safeHtml(player.name)}</span>
      <div class="player-time">
        <div class="time-display">${timeHTML}</div>
      </div>
    </div>`;
}

/**
 * Format total seconds → "M:SS:MS" or "SS:MS"
 * e.g. 105.29 → "1:45:29"  |  45.29 → "45:29"
 */
function formatTime(totalSeconds) {
  const totalCs = Math.round(totalSeconds * 100);
  const cs      = totalCs % 100;
  const totalS  = Math.floor(totalCs / 100);
  const s       = totalS % 60;
  const m       = Math.floor(totalS / 60);
  const csStr   = cs.toString().padStart(2, '0');
  const sStr    = s.toString().padStart(2, '0');
  return m > 0 ? `${m}:${sStr}:${csStr}` : `${s}:${csStr}`;
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

function safeUrl(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {}
  return '';
}
