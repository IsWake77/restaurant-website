'use strict';

const $ = (sel) => document.querySelector(sel);

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

const STATUS_CLASS = {
  'новая': 'status--new',
  'подтверждена': 'status--confirm',
  'отменена': 'status--cancel',
};

let bookings = [];
let filter = 'все';

function tickClock() {
  $('#liveClock').textContent = new Date().toLocaleString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}
tickClock();
setInterval(tickClock, 30_000);

async function loadBookings() {
  try {
    bookings = await (await fetch('/api/bookings')).json();
    renderStats();
    renderTable();
  } catch {
    $('#bookingsTable tbody').innerHTML =
      '<tr><td colspan="10" class="admin-table__empty">Не удалось загрузить данные</td></tr>';
  }
}

function renderStats() {
  const total = bookings.length;
  const newCount = bookings.filter((b) => b.status === 'новая').length;
  const confirmed = bookings.filter((b) => b.status === 'подтверждена').length;
  const guests = bookings
    .filter((b) => b.status !== 'отменена')
    .reduce((sum, b) => sum + b.guests, 0);

  $('#stats').innerHTML = `
    <div class="stat-card"><b>${total}</b><span>всего броней</span></div>
    <div class="stat-card"><b>${newCount}</b><span>новых заявок</span></div>
    <div class="stat-card"><b>${confirmed}</b><span>подтверждено</span></div>
    <div class="stat-card"><b>${guests}</b><span>гостей ожидается</span></div>
  `;
}

function renderTable() {
  const tbody = $('#bookingsTable tbody');
  const rows = filter === 'все' ? bookings : bookings.filter((b) => b.status === filter);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="admin-table__empty">Бронирований нет</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((b) => {
    const d = new Date(b.created_at.replace(' ', 'T'));
    const created = isNaN(d)
      ? escapeHtml(b.created_at)
      : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    return `
      <tr data-id="${b.id}">
        <td class="cell-id">#${b.id}</td>
        <td class="cell-name"><b>${escapeHtml(b.name)}</b></td>
        <td>${escapeHtml(b.phone)}</td>
        <td>${b.guests}</td>
        <td class="cell-date"><b>${escapeHtml(b.date)}</b></td>
        <td class="cell-time">${escapeHtml(b.time)}</td>
        <td class="cell-comment">${escapeHtml(b.comment) || '—'}</td>
        <td class="cell-created">${created}</td>
        <td><span class="status-badge ${STATUS_CLASS[b.status] || ''}">${escapeHtml(b.status)}</span></td>
        <td>
          <div class="admin-actions">
            ${b.status === 'новая' ? '<button class="admin-btn admin-btn--ok" data-action="confirm">✓ Подтвердить</button>' : ''}
            ${b.status !== 'отменена' ? '<button class="admin-btn" data-action="cancel">✕ Отменить</button>' : ''}
            <button class="admin-btn admin-btn--del" data-action="delete">🗑 Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

$('#bookingsTable').addEventListener('click', async (e) => {
  const btn = e.target.closest('.admin-btn');
  if (!btn) return;

  const row = btn.closest('tr');
  const id = row.dataset.id;
  const action = btn.dataset.action;

  if (action === 'delete' && !confirm(`Удалить бронирование #${id}?`)) return;

  btn.disabled = true;
  try {
    if (action === 'confirm') {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'подтверждена' }),
      });
    } else if (action === 'cancel') {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'отменена' }),
      });
    } else if (action === 'delete') {
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    }
  } finally {
    loadBookings();
  }
});

$('#statusFilter').addEventListener('change', (e) => {
  filter = e.target.value;
  renderTable();
});

$('#refreshBtn').addEventListener('click', loadBookings);

loadBookings();
