'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

/**
 * Инициализация базы данных ресторана.
 * Создаёт таблицы и заполняет их тестовыми данными при первом запуске.
 */
function initDb() {
  const db = new DatabaseSync(path.join(__dirname, 'restaurant.db'));

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS bookings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT    NOT NULL,
      guests      INTEGER NOT NULL,
      date        TEXT    NOT NULL,
      time        TEXT    NOT NULL,
      comment     TEXT    DEFAULT '',
      status      TEXT    NOT NULL DEFAULT 'новая',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL,
      price       INTEGER NOT NULL,
      weight      TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS promos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      badge       TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL
    );
  `);

  seedMenu(db);
  seedReviews(db);
  seedPromos(db);

  return db;
}

function seedMenu(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n;
  if (count > 0) return;

  const items = [
    ['Закуски', 'Тартар из говядины', 'Мраморная говядина, желток конфи, каперсы, гренки', 690, '160 г'],
    ['Закуски', 'Брускетта с томатами', 'Чиабатта, томаты черри, страчателла, базилик', 390, '120 г'],
    ['Закуски', 'Севиче из тунца', 'Тунец, маракуйя, красный лук, чипсы из батата', 740, '150 г'],
    ['Салаты', 'Салат с бурратой', 'Буррата, томаты, песто, руккола, ореховый соус', 620, '220 г'],
    ['Салаты', 'Цезарь с курицей', 'Романо, пармезан, куриное филе су-вид, крутоны', 540, '240 г'],
    ['Салаты', 'Тёплый салат с ростбифом', 'Ростбиф, микс-салат, запечённые овощи, винегрет', 680, '250 г'],
    ['Горячее', 'Стейк рибай', 'Мраморная говядина Prime, соус демиглас, овощи гриль', 2450, '350 г'],
    ['Горячее', 'Утиная ножка конфи', 'Утка, пюре из сельдерея, вишнёвый соус', 1290, '280 г'],
    ['Горячее', 'Паста с трюфелем', 'Тальолини, трюфельный крем, пармезан 24 месяца', 980, '260 г'],
    ['Горячее', 'Лосось на гриле', 'Норвежский лосось, спаржа, соус бёр блан', 1450, '270 г'],
    ['Горячее', 'Ризотто с белыми грибами', 'Карнароли, белые грибы, трюфельное масло', 890, '280 г'],
    ['Десерты', 'Павлова с манго', 'Хрустальная безе, крем шантильи, манго, маракуйя', 460, '150 г'],
    ['Десерты', 'Шоколадный фондан', 'Тёплый шоколадный кекс, мороженое ваниль', 420, '130 г'],
    ['Десерты', 'Тирамису', 'Классический, маскарпоне, савоярди, эспрессо', 450, '160 г'],
    ['Напитки', 'Домашний лимонад', 'Свежие ягоды, мята, лёд — на выбор', 320, '400 мл'],
    ['Напитки', 'Облепиховый чай', 'Облепиха, мёд, апельсин, специи', 390, '450 мл'],
  ];

  const stmt = db.prepare(
    'INSERT INTO menu_items (category, name, description, price, weight) VALUES (?, ?, ?, ?, ?)'
  );
  for (const it of items) stmt.run(...it);
}

function seedReviews(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n;
  if (count > 0) return;

  const reviews = [
    ['Анна Смирнова', 5, 'Невероятный вечер! Стейк приготовлен идеально, а атмосфера — как в лучших ресторанах Парижа. Обязательно вернёмся с мужем на годовщину.'],
    ['Дмитрий Козлов', 5, 'Бронировал столик на восьмилетие дочери. Всё чётко: стол был готов вовремя, официант вёл себя профессионально. Фондан — восторг!'],
    ['Мария Орлова', 4, 'Очень красивый интерьер и вкусная паста с трюфелем. Единственное — в пятницу вечером шумно, лучше бронировать заранее и просить столик у окна.'],
    ['Игорь Волков', 5, 'Проводили деловой ужин на 6 персон. Отличный сервис, винная карта на высоте. Сомелье помог подобрать вино под каждое блюдо.'],
  ];

  const stmt = db.prepare('INSERT INTO reviews (name, rating, text) VALUES (?, ?, ?)');
  for (const r of reviews) stmt.run(...r);
}

function seedPromos(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM promos').get().n;
  if (count > 0) return;

  const promos = [
    ['Бизнес-ланч', 'Ланч за 790 ₽', 'Комплексный обед: салат или суп, горячее и напиток. Пн–Пт, 12:00–16:00.'],
    ['Винные среды', '−30% на винную карту', 'Каждую среду — скидка 30% на все бутылки вина. Идеальный повод открыть что-то новое.'],
    ['Девичник', 'Комплимент от шефа', 'Для компаний от 4 гостей — десерт-комплимент и игристое в подарок. По предварительной брони.'],
  ];

  const stmt = db.prepare('INSERT INTO promos (badge, title, description) VALUES (?, ?, ?)');
  for (const p of promos) stmt.run(...p);
}

module.exports = { initDb };
