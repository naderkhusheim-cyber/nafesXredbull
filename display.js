// ================================================================
//  display.js — Live leaderboard logic for index.html
//  Theme is fully admin-controlled via Firebase settings/theme
//  Images are admin-controlled via Firebase settings/images
// ================================================================

const leaderboardEl = document.getElementById('leaderboard');
const galleryEl     = document.getElementById('gallery-strip');

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

// ── Firebase: Listen for images ───────────────────────────────
db.ref('settings/images').on('value', snap => {
  const imgs = [];
  snap.forEach(child => {
    imgs.push({ id: child.key, ...child.val() });
  });

  if (imgs.length === 0) {
    galleryEl.innerHTML = '';
    return;
  }

  imgs.sort((a, b) => (a.order || 0) - (b.order || 0));

  galleryEl.innerHTML = imgs
    .map(img => {
      const src = safeUrl(img.url);
      if (!src) return '';
      return `<img class="gallery-img" src="${src}" alt="${safeHtml(img.label || '')}" loading="lazy" onerror="this.remove()" />`;
    })
    .join('');
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
  const [whole, dec] = val.split('.');

  const position = rank <= 3
    ? `<span class="pos-medal">${medals[rank]}</span>`
    : `<span class="pos-number">${rank}</span>`;

  return `
    <div class="player-row ${rankClass}">
      ${position}
      <span class="player-name">${safeHtml(player.name)}</span>
      <div class="player-time">
        <div class="time-display">
          <span class="time-whole">${whole}</span><span class="time-dot">.</span><span class="time-dec">${dec}</span>
        </div>
        <div class="time-unit">Seconds</div>
      </div>
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

function safeUrl(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {}
  return '';
}
