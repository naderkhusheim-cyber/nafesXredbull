// ================================================================
//  admin.js — Admin panel logic for admin.html
//  Handles adding / deleting players and changing sort order.
//  All changes sync instantly to the display page via Firebase.
// ================================================================

const form        = document.getElementById('player-form');
const nameInput   = document.getElementById('player-name');
const timeInput   = document.getElementById('player-time');
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');

// Local state — keyed by Firebase push ID for safe deletion
let playerMap  = {};   // { id: { id, name, time } }
let sortOrder  = 'time-asc';

// ── Firebase listeners ───────────────────────────────────────

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

// ── Add player ───────────────────────────────────────────────

form.addEventListener('submit', e => {
  e.preventDefault();

  const name    = nameInput.value.trim();
  const timeVal = parseFloat(timeInput.value);

  if (!name)                        return showToast('Enter a player name.', 'error');
  if (isNaN(timeVal) || timeVal < 0) return showToast('Enter a valid time (≥ 0).', 'error');

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

  // Event delegation — one listener instead of inline onclick
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
      <span class="admin-time">${parseFloat(player.time).toFixed(2)}s</span>
      <button
        class="btn btn-icon-delete"
        data-action="delete"
        data-id="${player.id}"
        title="Remove player"
      >Remove</button>
    </div>`;
}

// ── Helpers ──────────────────────────────────────────────────

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
