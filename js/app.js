'use strict';

/* =========================================================
   1. СОСТОЯНИЕ И LOCALSTORAGE
   ========================================================= */
const STORAGE_KEY = 'techstore_cart';
let cart = [];

function loadCart() {
    try {
        cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        cart = [];
    }
}

function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

/* =========================================================
   2. ССЫЛКИ НА DOM
   ========================================================= */
const modal       = document.getElementById('cart-modal');
const openBtn     = document.getElementById('open-cart-btn');
const closeBtn    = document.getElementById('close-cart-btn');
const itemsBox    = document.getElementById('cart-items-container');
const modalTotal  = document.getElementById('modal-total-sum');
const headerCount = document.getElementById('cart-count');
const headerSum   = document.getElementById('cart-sum');
const orderForm   = document.getElementById('order-form');
const cartView    = document.getElementById('cart-view');
const orderView   = document.getElementById('order-view');
const checkoutBtn = document.getElementById('checkout-btn');

/* =========================================================
   3. ХЕЛПЕРЫ
   ========================================================= */
const formatPrice = (n) => n.toLocaleString('ru-RU') + ' ₽';
const getTotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const getCount = () => cart.reduce((s, i) => s + i.qty, 0);

/* =========================================================
   4. ДОБАВЛЕНИЕ ТОВАРА (критерий: «добавление в корзину»)
   ========================================================= */
function addToCart(id, name, price) {
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, price, qty: 1 });

    saveCart();
    render();
}

/* Делегирование — один обработчик на всю страницу.
   Ловит и hero-кнопку, и кнопки внутри карточек. */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;

    addToCart(
        Number(btn.dataset.id),
        btn.dataset.name,
        Number(btn.dataset.price)
    );
});

/* =========================================================
   5. РЕНДЕР (критерии: «сумма пересчитывается», «итог корректен»)
   ========================================================= */
function render() {
    /* Шапка */
    headerCount.textContent = getCount();
    headerSum.textContent   = formatPrice(getTotal());

    /* Пустая корзина */
    if (cart.length === 0) {
        itemsBox.innerHTML = '<p class="empty-cart-msg">Корзина пуста</p>';
        modalTotal.textContent = formatPrice(0);
        checkoutBtn.disabled = true;
        return;
    }
    checkoutBtn.disabled = false;

    /* Позиции */
    itemsBox.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div>
                <div><strong>${item.name}</strong></div>
                <div>${formatPrice(item.price)}</div>
            </div>
            <div class="cart-item__controls">
                <button class="qty-btn" data-action="dec" aria-label="Уменьшить">−</button>
                <span>${item.qty}</span>
                <button class="qty-btn" data-action="inc" aria-label="Увеличить">+</button>
                <button class="remove-btn" data-action="remove">Удалить</button>
            </div>
        </div>
    `).join('');

    modalTotal.textContent = formatPrice(getTotal());
}

/* =========================================================
   6. +, −, УДАЛИТЬ (критерии: «удаление», «изменение количества»)
   ========================================================= */
itemsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id   = Number(btn.closest('.cart-item').dataset.id);
    const item = cart.find(i => i.id === id);
    if (!item) return;

    switch (btn.dataset.action) {
        case 'inc':
            item.qty += 1;
            break;
        case 'dec':
            item.qty -= 1;
            if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
            break;
        case 'remove':
            cart = cart.filter(i => i.id !== id);
            break;
    }

    saveCart();
    render();
});

/* =========================================================
   6.5. ФИЛЬТРАЦИЯ КАТАЛОГА: КАТЕГОРИИ + ПОИСК
   ========================================================= */

/* Текущее состояние фильтров */
let activeCategory = 'all';
let searchQuery = '';

const cards           = document.querySelectorAll('.product-card');
const categoryLinks   = document.querySelectorAll('.category-link');
const searchForm      = document.getElementById('search-form');
const searchInput     = document.getElementById('search-input');
const catalogCount    = document.getElementById('catalog-count');

/* Применяем оба фильтра: и категорию, и поиск */
function applyFilters() {
    let visible = 0;

    cards.forEach(card => {
        const matchCategory =
            activeCategory === 'all' ||
            card.dataset.category === activeCategory;

        const name = (card.dataset.name || '').toLowerCase();
        const matchSearch = name.includes(searchQuery);

        if (matchCategory && matchSearch) {
            card.hidden = false;
            visible++;
        } else {
            card.hidden = true;
        }
    });

    /* Обновляем счётчик «Найдено: N» */
    if (catalogCount) {
        catalogCount.textContent = `Найдено: ${visible}`;
    }
}

/* --- Клик по категории --- */
categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();          // не перезагружать страницу по href="#"

        /* Подсветка активной */
        categoryLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        activeCategory = link.dataset.category;
        applyFilters();
    });
});

/* --- Поиск --- */
searchForm.addEventListener('submit', (e) => e.preventDefault()); // Enter не перезагружает

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    applyFilters();
});

/* Первичная отрисовка */
applyFilters();

/* =========================================================
   7. МОДАЛКА: открыть / закрыть
   ========================================================= */
function openModal() {
    /* Всегда открываем на экране корзины */
    cartView.hidden  = false;
    orderView.hidden = true;
    modal.classList.add('active');
}
function closeModal() {
    modal.classList.remove('active');
}

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);

/* Клик по фону */
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

/* Escape */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

/* =========================================================
   8. ПЕРЕХОД К ФОРМЕ (критерий: «форма открывается
      при нажатии на кнопку Оформить заказ»)
   ========================================================= */
checkoutBtn.addEventListener('click', () => {
    cartView.hidden  = true;
    orderView.hidden = false;
});

/* =========================================================
   9. SUBMIT ФОРМЫ (критерий: «Заказ создан!»)
   ========================================================= */
orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    /* Встроенная валидация HTML уже отработала (required) */
    alert('Заказ создан!');

    /* Сброс */
    cart = [];
    saveCart();
    render();
    orderForm.reset();
    closeModal();
});

/* =========================================================
   10. СТАРТ
   ========================================================= */
loadCart();
render();