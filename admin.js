// ================================================================
//  admin.js — Admin panel logic for admin.html
//  Handles players, sort order, display theme, and display images.
//  All changes sync instantly to the display page via Firebase.
// ================================================================

const form        = document.getElementById('player-form');
const nameInput   = document.getElementById('player-name');
const timeInput   = document.getElementById('player-time');
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');

// Local state
let playerMap   = {};   // { id: { id, name, time } }
let sortOrder   = 'time-asc';
let imageMap    = {};   // { id: { id, url, label, order } }
let currentTheme = 'dark';

// ── Theme definitions ─────────────────────────────────────────
const THEMES = [
  {
    id:     'dark',
    name:   'Red Bull\nDark',
    emoji:  '🔵',
    bg:     'linear-gradient(135deg, #100D3E 0%, #1B1464 100%)',
    accent: '#FFC906',
    glow:   'rgba(255,201,6,0.35)',
  },
  {
    id:     'redbull-booth',
    name:   'RB\nBooth',
    emoji:  '🟡',
    bg:     'linear-gradient(135deg, #2f304c 0%, #3d3e5e 100%)',
    accent: '#e4aa0a',
    glow:   'rgba(228,170,10,0.45)',
  },
  {
    id:     'redbull-booth-alive',
    name:   'RB Booth\nAlive ✦',
    emoji:  '⭐',
    bg:     'linear-gradient(135deg, #0f1025 0%, #2f304c 50%, #3d3e62 100%)',
    accent: '#e4aa0a',
    glow:   'rgba(228,170,10,0.55)',
  },
  {
    id:     'ramadan-gold',
    name:   'Ramadan\nGold',
    emoji:  '🌙',
    bg:     'linear-gradient(135deg, #05030D 0%, #1B1440 100%)',
    accent: '#D4AF37',
    glow:   'rgba(212,175,55,0.45)',
  },
  {
    id:     'ramadan-green',
    name:   'Ramadan\nGreen',
    emoji:  '☪️',
    bg:     'linear-gradient(135deg, #030D07 0%, #0D3D22 100%)',
    accent: '#C9A84C',
    glow:   'rgba(201,168,76,0.45)',
  },
  {
    id:     'ramadan-purple',
    name:   'Ramadan\nPurple',
    emoji:  '✨',
    bg:     'linear-gradient(135deg, #060110 0%, #1C1048 100%)',
    accent: '#C8A84B',
    glow:   'rgba(200,168,75,0.45)',
  },
  {
    id:     'ramadan-lantern',
    name:   'Ramadan\nLantern',
    emoji:  '🏮',
    bg:     'linear-gradient(135deg, #120600 0%, #4A1E08 100%)',
    accent: '#E6A817',
    glow:   'rgba(230,168,23,0.45)',
  },
];

// ── Firebase listeners ────────────────────────────────────────

db.ref('players').on('value', snap => {
  playerMap = {};
  snap.forEach(child => {
    playerMap[child.key] = { id: child.key, ...child.val() };
  });
  playerCount.textContent = `(${Object.keys(playerMap).length})`;
  renderList();
});

db.ref('settings/sortOrder').on('value', snap => {
  sortOrder = snap.val() || 'time-asc';
  const sel = document.getElementById('sort-select');
  if (sel) sel.value = sortOrder;
  renderList();
});

db.ref('settings/theme').on('value', snap => {
  currentTheme = snap.val() || 'dark';
  renderThemeGrid();
});

db.ref('settings/images').on('value', snap => {
  imageMap = {};
  snap.forEach(child => {
    imageMap[child.key] = { id: child.key, ...child.val() };
  });
  renderImages();
});

db.ref('settings/prizesTitle').on('value', snap => {
  const input = document.getElementById('prizes-title-input');
  if (input && !input.matches(':focus')) {
    input.value = snap.val() || '';
  }
});

// ── Add player ────────────────────────────────────────────────

form.addEventListener('submit', e => {
  e.preventDefault();

  const name    = nameInput.value.trim();
  const timeVal = parseTime(timeInput.value);

  if (!name)          return showToast('Enter a player name.', 'error');
  if (isNaN(timeVal)) return showToast('Invalid time — use M:SS:MS (e.g. 1:45:29 or 45:29).', 'error');

  db.ref('players')
    .push({ name, time: timeVal })
    .then(() => {
      nameInput.value = '';
      timeInput.value = '';
      nameInput.focus();
      showToast(`${name} added!`, 'success');
    })
    .catch(() => showToast('Error saving. Check your Firebase config.', 'error'));
});

// ── Change sort order (syncs to display page) ─────────────────

function changeSortOrder() {
  const val = document.getElementById('sort-select').value;
  db.ref('settings/sortOrder').set(val);
}

// ── Delete a single player ────────────────────────────────────

function deletePlayer(id) {
  const player = playerMap[id];
  if (!player) return;
  if (!confirm(`Remove "${player.name}" from the leaderboard?`)) return;

  db.ref(`players/${id}`)
    .remove()
    .then(() => showToast(`${player.name} removed.`, 'success'))
    .catch(() => showToast('Error removing player.', 'error'));
}

// ── Clear all players ─────────────────────────────────────────

function clearAll() {
  if (Object.keys(playerMap).length === 0) {
    showToast('No players to clear.', 'error');
    return;
  }
  if (!confirm('Clear ALL players from the leaderboard?\nThis cannot be undone.')) return;

  db.ref('players')
    .remove()
    .then(() => showToast('Leaderboard cleared.', 'success'))
    .catch(() => showToast('Error clearing leaderboard.', 'error'));
}

// ── Render admin list ─────────────────────────────────────────

function renderList() {
  const players = Object.values(playerMap);

  if (players.length === 0) {
    playersList.innerHTML = `<div class="admin-empty">No players yet. Add the first one above!</div>`;
    return;
  }

  const sorted = getSorted(players, sortOrder);

  playersList.innerHTML = sorted
    .map((p, i) => buildAdminRow(p, i + 1))
    .join('');

  playersList.onclick = e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'delete') deletePlayer(btn.dataset.id);
  };
}

function buildAdminRow(player, rank) {
  return `
    <div class="admin-player-item">
      <span class="admin-rank">${rank}</span>
      <span class="admin-name">${safeHtml(player.name)}</span>
      <span class="admin-time">${formatTime(parseFloat(player.time))}</span>
      <button
        class="btn btn-icon-delete"
        data-action="delete"
        data-id="${player.id}"
        title="Remove player"
      >Remove</button>
    </div>`;
}

// ── Theme management ──────────────────────────────────────────

function setTheme(themeId) {
  db.ref('settings/theme')
    .set(themeId)
    .then(() => showToast('Theme updated!', 'success'))
    .catch(() => showToast('Error updating theme.', 'error'));
}

function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  const nameEl = document.getElementById('theme-active-name');

  const active = THEMES.find(t => t.id === currentTheme) || THEMES[0];
  if (nameEl) nameEl.textContent = active.name.replace('\n', ' ');

  grid.innerHTML = THEMES.map(t => `
    <button
      class="theme-btn ${currentTheme === t.id ? 'active' : ''}"
      onclick="setTheme('${t.id}')"
      style="--t-bg:${t.bg};--t-accent:${t.accent};--t-glow:${t.glow}"
    >
      <span class="theme-btn-emoji">${t.emoji}</span>
      <span class="theme-btn-name">${t.name.replace('\n', '<br>')}</span>
    </button>
  `).join('');
}

// ── Image management ──────────────────────────────────────────

function addImage() {
  const urlInput   = document.getElementById('image-url');
  const labelInput = document.getElementById('image-label');
  const url        = urlInput.value.trim();
  const label      = labelInput.value.trim();

  if (!url) return showToast('Enter an image URL.', 'error');

  try { new URL(url); } catch {
    return showToast('Enter a valid URL (https://...).', 'error');
  }

  db.ref('settings/images')
    .push({ url, label, order: Date.now() })
    .then(() => {
      urlInput.value   = '';
      labelInput.value = '';
      showToast('Image added!', 'success');
    })
    .catch(() => showToast('Error adding image.', 'error'));
}

function removeImage(id) {
  if (!confirm('Remove this image from the display?')) return;

  db.ref(`settings/images/${id}`)
    .remove()
    .then(() => showToast('Image removed.', 'success'))
    .catch(() => showToast('Error removing image.', 'error'));
}

function updatePrizesTitle() {
  const input = document.getElementById('prizes-title-input');
  const val   = input.value.trim();
  db.ref('settings/prizesTitle')
    .set(val || null)
    .then(() => showToast('Title updated!', 'success'))
    .catch(() => showToast('Error updating title.', 'error'));
}

function renderImages() {
  const listEl = document.getElementById('images-list');
  const images = Object.values(imageMap);

  if (images.length === 0) {
    listEl.innerHTML = '<div class="admin-empty">No images yet. Add image URLs above!</div>';
    return;
  }

  images.sort((a, b) => (a.order || 0) - (b.order || 0));

  listEl.innerHTML = images.map(img => `
    <div class="admin-image-item">
      <img
        class="admin-image-thumb"
        src="${safeHtml(img.url)}"
        alt=""
        onerror="this.style.opacity='0.25'"
      />
      <span class="admin-image-label">${safeHtml(img.label || img.url)}</span>
      <button
        class="btn btn-icon-delete"
        onclick="removeImage('${img.id}')"
        title="Remove image"
      >Remove</button>
    </div>
  `).join('');
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Parse "M:SS:MS" or "SS:MS" into total seconds (float).
 * e.g. "1:45:29" → 105.29   |   "45:29" → 45.29
 */
function parseTime(str) {
  const parts = str.trim().split(':');
  if (parts.length === 3) {
    const m  = parseInt(parts[0], 10);
    const s  = parseInt(parts[1], 10);
    const cs = parseInt(parts[2], 10);
    if ([m, s, cs].some(isNaN)) return NaN;
    if (s >= 60 || cs >= 100)   return NaN;
    return m * 60 + s + cs / 100;
  }
  if (parts.length === 2) {
    const s  = parseInt(parts[0], 10);
    const cs = parseInt(parts[1], 10);
    if ([s, cs].some(isNaN)) return NaN;
    if (cs >= 100)            return NaN;
    return s + cs / 100;
  }
  return NaN;
}

/**
 * Format total seconds into display string.
 * e.g. 105.29 → "1:45:29"   |   45.29 → "45:29"
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

function getSorted(list, order) {
  const copy = [...list];
  if (order === 'time-asc')  return copy.sort((a, b) => a.time - b.time);
  if (order === 'time-desc') return copy.sort((a, b) => b.time - a.time);
  return copy; // 'entry' — preserve insertion order
}

function safeHtml(str) {
  const el = document.createElement('span');
  el.textContent = String(str);
  return el.innerHTML;
}

// ── Export to Excel ───────────────────────────────────────────

function exportToExcel() {
  const players = Object.values(playerMap);

  if (players.length === 0) {
    showToast('No players to export.', 'error');
    return;
  }

  const sorted = getSorted(players, sortOrder);

  const rows = [['Rank', 'Player Name', 'Time (M:SS:MS)']];
  sorted.forEach((p, i) => {
    rows.push([i + 1, p.name, formatTime(parseFloat(p.time))]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
  XLSX.writeFile(wb, 'redbull-competition-results.xlsx');
  showToast('Exported to Excel!', 'success');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity    = '0';
    setTimeout(() => toast.remove(), 320);
  }, 2400);
}
