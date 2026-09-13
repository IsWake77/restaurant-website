'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

const formatPrice = (n) => `${n.toLocaleString('ru-RU')} ₽`;

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const header = $('#header');
const burger = $('#burger');
const nav = $('#nav');

window.addEventListener('scroll', () => {
  header.classList.toggle('header--scrolled', window.scrollY > 40);
}, { passive: true });

burger.addEventListener('click', () => {
  burger.classList.toggle('burger--open');
  nav.classList.toggle('nav--open');
});

nav.addEventListener('click', (e) => {
  if (e.target.classList.contains('nav__link')) {
    burger.classList.remove('burger--open');
    nav.classList.remove('nav--open');
  }
});

const menuGrid = $('#menuGrid');
const menuTabs = $('#menuTabs');
let menuItems = [];

function renderMenu(category = 'Все') {
  const items = category === 'Все' ? menuItems : menuItems.filter((i) => i.category === category);
  if (!items.length) {
    menuGrid.innerHTML = '<p class="menu__loading">В этой категории пока пусто</p>';
    return;
  }
  menuGrid.innerHTML = items.map((i) => `
    <article class="menu__card">
      <span class="menu__cat">${escapeHtml(i.category)}</span>
      <div class="menu__card-top">
        <h3 class="menu__name">${escapeHtml(i.name)}</h3>
        <span class="menu__dots"></span>
        <span class="menu__price">${formatPrice(i.price)}</span>
      </div>
      <p class="menu__desc">${escapeHtml(i.description)}</p>
      <div class="menu__meta"><span>${escapeHtml(i.weight)}</span><span>LUMIÈRE</span></div>
    </article>
  `).join('');
}

function initMenuTabs() {
  const categories = ['Все', ...new Set(menuItems.map((i) => i.category))];
  menuTabs.innerHTML = categories
    .map((c, idx) => `<button class="menu__tab${idx === 0 ? ' menu__tab--active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('');
  menuTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu__tab');
    if (!btn) return;
    $$('.menu__tab').forEach((b) => b.classList.remove('menu__tab--active'));
    btn.classList.add('menu__tab--active');
    renderMenu(btn.dataset.cat);
  });
}

async function loadMenu() {
  try {
    menuItems = await (await fetch('/api/menu')).json();
    initMenuTabs();
    renderMenu();
  } catch {
    menuGrid.innerHTML = '<p class="menu__loading">Не удалось загрузить меню 😢</p>';
  }
}

async function loadPromos() {
  const grid = $('#promosGrid');
  try {
    const promos = await (await fetch('/api/promos')).json();
    grid.innerHTML = promos.map((p) => `
      <article class="promo-card reveal reveal--visible">
        <span class="promo-card__badge">${escapeHtml(p.badge)}</span>
        <h3 class="promo-card__title">${escapeHtml(p.title)}</h3>
        <p class="promo-card__desc">${escapeHtml(p.description)}</p>
      </article>
    `).join('');
  } catch {
    grid.innerHTML = '<p class="menu__loading">Не удалось загрузить акции</p>';
  }
}

function starsHtml(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < rating ? '' : 'star--empty'}">★</span>`
  ).join('');
}

function reviewCard(r) {
  const d = new Date(r.created_at.replace(' ', 'T'));
  const date = isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
    <article class="review-card">
      <div class="review-card__head">
        <div class="review-card__avatar">${escapeHtml(r.name.trim()[0].toUpperCase())}</div>
        <div>
          <div class="review-card__name">${escapeHtml(r.name)}</div>
          <div class="review-card__date">${date}</div>
        </div>
      </div>
      <div class="review-card__stars">${starsHtml(r.rating)}</div>
      <p class="review-card__text">${escapeHtml(r.text)}</p>
    </article>`;
}

async function loadReviews() {
  const grid = $('#reviewsGrid');
  try {
    const reviews = await (await fetch('/api/reviews')).json();
    grid.innerHTML = reviews.length
      ? reviews.map(reviewCard).join('')
      : '<p class="menu__loading">Пока нет отзывов — станьте первым!</p>';
  } catch {
    grid.innerHTML = '<p class="menu__loading">Не удалось загрузить отзывы</p>';
  }
}

function showStatus(el, text, ok) {
  el.textContent = text;
  el.className = `form-status ${ok ? 'form-status--ok' : 'form-status--err'}`;
  el.hidden = false;
}

$('#reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#reviewStatus');
  const btn = $('#reviewSubmit');
  const payload = {
    name: $('#rvName').value.trim(),
    rating: Number($('#rvRating').value),
    text: $('#rvText').value.trim(),
  };

  btn.disabled = true;
  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка отправки');
    e.target.reset();
    showStatus(status, 'Спасибо! Ваш отзыв опубликован ✨', true);
    loadReviews();
  } catch (err) {
    showStatus(status, err.message, false);
  } finally {
    btn.disabled = false;
  }
});

const bookingForm = $('#bookingForm');
const bookingStatus = $('#bookingStatus');
const bkDate = $('#bkDate');

const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
bkDate.min = today.toISOString().slice(0, 10);

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#bookingSubmit');
  const payload = {
    name: $('#bkName').value.trim(),
    phone: $('#bkPhone').value.trim(),
    guests: Number($('#bkGuests').value),
    date: bkDate.value,
    time: $('#bkTime').value,
    comment: $('#bkComment').value.trim(),
  };

  btn.disabled = true;
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка бронирования');

    const when = `${formatDate(data.date)} в ${data.time}`;
    showStatus(bookingStatus, `Заявка №${data.id} принята! Столик на ${when}. Администратор перезвонит для подтверждения. ✨`, true);
    bookingForm.reset();
    $('#bkGuests').value = 2;
    $('#bkTime').value = '19:00';
  } catch (err) {
    showStatus(bookingStatus, err.message, false);
  } finally {
    btn.disabled = false;
  }
});

const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const galleryItems = $$('.gallery__item');
let currentIdx = 0;

function openLightbox(idx) {
  currentIdx = (idx + galleryItems.length) % galleryItems.length;
  lightboxImg.src = galleryItems[currentIdx].dataset.src;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

galleryItems.forEach((item, idx) => {
  item.addEventListener('click', () => openLightbox(idx));
});

$('#lightboxClose').addEventListener('click', closeLightbox);
$('#lightboxPrev').addEventListener('click', () => openLightbox(currentIdx - 1));
$('#lightboxNext').addEventListener('click', () => openLightbox(currentIdx + 1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') openLightbox(currentIdx - 1);
  if (e.key === 'ArrowRight') openLightbox(currentIdx + 1);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal--visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach((el) => observer.observe(el));

loadMenu();
loadPromos();
loadReviews();
