'use strict';

const express = require('express');
const path = require('path');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const db = initDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/menu', (req, res) => {
  res.json(db.prepare('SELECT * FROM menu_items ORDER BY id').all());
});

app.get('/api/promos', (req, res) => {
  res.json(db.prepare('SELECT * FROM promos ORDER BY id').all());
});

app.get('/api/reviews', (req, res) => {
  res.json(db.prepare('SELECT * FROM reviews ORDER BY id DESC').all());
});

app.post('/api/reviews', (req, res) => {
  const { name, rating, text } = req.body || {};

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Укажите имя (минимум 2 символа)' });
  }
  const r = parseInt(rating, 10);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  }
  if (!text || text.trim().length < 5) {
    return res.status(400).json({ error: 'Отзыв слишком короткий (минимум 5 символов)' });
  }

  const info = db
    .prepare('INSERT INTO reviews (name, rating, text) VALUES (?, ?, ?)')
    .run(name.trim(), r, text.trim());

  res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid));
});

app.get('/api/bookings', (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY date DESC, time DESC, id DESC').all());
});

app.post('/api/bookings', (req, res) => {
  const { name, phone, guests, date, time, comment } = req.body || {};
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('укажите имя');
  if (!phone || !/^[+\d][\d\s()\-]{5,19}$/.test(phone.trim())) errors.push('укажите корректный телефон');

  const g = parseInt(guests, 10);
  if (!Number.isInteger(g) || g < 1 || g > 20) errors.push('количество гостей — от 1 до 20');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    errors.push('укажите дату');
  } else {
    const d = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime()) || d < today) errors.push('дата не может быть в прошлом');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) errors.push('укажите время в формате ЧЧ:ММ');

  if (errors.length) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  const info = db
    .prepare(
      'INSERT INTO bookings (name, phone, guests, date, time, comment) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name.trim(), phone.trim(), g, date, time, (comment || '').trim());

  res
    .status(201)
    .json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid));
});

app.patch('/api/bookings/:id', (req, res) => {
  const allowed = ['новая', 'подтверждена', 'отменена'];
  const { status } = req.body || {};

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Статус должен быть одним из: ${allowed.join(', ')}` });
  }

  const info = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Бронирование не найдено' });

  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

app.delete('/api/bookings/:id', (req, res) => {
  const info = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Бронирование не найдено' });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🍽  Ресторан LUMIÈRE`);
  console.log(`   Сайт:               http://localhost:${PORT}`);
  console.log(`   Панель бронирований: http://localhost:${PORT}/admin.html`);
});
