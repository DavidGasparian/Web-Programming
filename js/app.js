'use strict';

const STORAGE_KEY = 'techstore_cart';

const cartCountEl = document.getElementById('cart-count');
const cartSumEl = document.getElementById('cart-sum');
const modalTotalEl = document.getElementById('modal-total-sum');
const itemsContainer = document.getElementById('cart-items-container');

const modalOverlay = document.getElementById('cart-modal');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const successCloseBtn = document.getElementById('success-close-btn');

const cartView = document.getElementById('cart-view');
const orderView = document.getElementById('order-view');
const successView = document.getElementById('success-view');
const orderForm = document.getElementById('order-form');

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryLinks = document.querySelectorAll('.category-link');
const productCards = document.querySelectorAll('.product-card');
const catalogCountEl = document.getElementById('catalog-count');
const productsGrid = document.getElementById('products-grid');

// СОСТОЯНИЕ КОРЗИНЫ
// Элемент корзины: { id, name, price, qty }
let cart = loadCart();

function loadCart() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return [];
        // отбрасываем некорректные записи (например, если localStorage правили вручную)
        return data.filter(item =>
            item &&
            Number.isFinite(item.id) &&
            typeof item.name === 'string' &&
            Number.isFinite(item.price) &&
            Number.isInteger(item.qty) && item.qty > 0
        );
    } catch (e) {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error('Не удалось сохранить корзину:', e);
    }
}

// ОПЕРАЦИИ С КОРЗИНОЙ
function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCart();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(id);
        return;
    }
    updateCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

function clearCart() {
    cart = [];
    updateCart();
}

function updateCart() {
    saveCart();
    renderCart();
}

// ОТРИСОВКА
function formatPrice(value) {
    return value.toLocaleString('ru-RU') + ' ₽';
}

function getTotals() {
    return cart.reduce(
        (acc, item) => {
            acc.qty += item.qty;
            acc.sum += item.price * item.qty;
            return acc;
        },
        { qty: 0, sum: 0 }
    );
}

function createButton(text, className, action, id, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = text;
    btn.dataset.action = action;
    btn.dataset.id = id;
    if (label) btn.setAttribute('aria-label', label);
    return btn;
}

function createCartItem(item) {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const info = document.createElement('div');
    info.className = 'cart-item__info';
    const name = document.createElement('div');
    name.className = 'cart-item__name';
    name.textContent = item.name;
    const price = document.createElement('div');
    price.className = 'cart-item__price';
    price.textContent = formatPrice(item.price);
    info.append(name, price);

    const controls = document.createElement('div');
    controls.className = 'cart-item__controls';
    const qty = document.createElement('span');
    qty.className = 'qty-value';
    qty.textContent = item.qty;
    controls.append(
        createButton('−', 'qty-btn', 'decrease', item.id, 'Уменьшить количество'),
        qty,
        createButton('+', 'qty-btn', 'increase', item.id, 'Увеличить количество')
    );

    const sum = document.createElement('div');
    sum.className = 'cart-item__sum';
    sum.textContent = formatPrice(item.price * item.qty);

    const remove = createButton('Удалить', 'remove-btn', 'remove', item.id);

    row.append(info, controls, sum, remove);
    return row;
}

function renderCart() {
    const totals = getTotals();

    // шапка и итог в модальном окне
    cartCountEl.textContent = totals.qty;
    cartSumEl.textContent = formatPrice(totals.sum);
    modalTotalEl.textContent = formatPrice(totals.sum);

    // список товаров
    itemsContainer.replaceChildren();
    if (cart.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-cart-msg';
        empty.textContent = 'Корзина пуста';
        itemsContainer.append(empty);
    } else {
        cart.forEach(item => itemsContainer.append(createCartItem(item)));
    }

    // нельзя оформить пустой заказ
    checkoutBtn.disabled = cart.length === 0;
}

// ОБРАБОТЧИКИ: КОРЗИНА
// Добавление в корзину (делегирование: работает для всех кнопок «В корзину»)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;

    addToCart({
        id: Number(btn.dataset.id),
        name: btn.dataset.name,
        price: Number(btn.dataset.price)
    });

    // Анимация после нажатия кнопки добавить
    if (!btn.dataset.busy) {
        const original = btn.textContent;
        btn.dataset.busy = '1';
        btn.textContent = 'Добавлено ✓';
        setTimeout(() => {
            btn.textContent = original;
            delete btn.dataset.busy;
        }, 800);
    }
});

// Кнопки внутри корзины
itemsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    switch (btn.dataset.action) {
        case 'increase': changeQty(id, 1); break;
        case 'decrease': changeQty(id, -1); break;
        case 'remove': removeFromCart(id); break;
    }
});

// МОДАЛЬНОЕ ОКНО
function showView(view) {
    cartView.hidden = view !== 'cart';
    orderView.hidden = view !== 'order';
    successView.hidden = view !== 'success';
}

function openModal() {
    showView('cart');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

openCartBtn.addEventListener('click', openModal);
closeCartBtn.addEventListener('click', closeModal);
successCloseBtn.addEventListener('click', closeModal);

// клик по фону закрывает окно
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

// Форма "Оформить заказ"
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    showView('order');
});

// ОФОРМЛЕНИЕ ЗАКАЗА
orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = new FormData(orderForm);
    const fields = ['firstName', 'lastName', 'address', 'phone'];
    const allFilled = fields.every(name => String(data.get(name)).trim() !== '');

    if (!allFilled) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    clearCart();       // заказ оформлен, корзина очищается (и в localStorage тоже)
    orderForm.reset();
    showView('success'); // сообщение «Заказ создан»
});

// КАТЕГОРИИ И ПОИСК
let currentCategory = 'all';
let searchQuery = '';

function applyFilters() {
    let visible = 0;

    productCards.forEach(card => {
        const matchCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
        const matchSearch = card.dataset.name.toLowerCase().includes(searchQuery);
        card.hidden = !(matchCategory && matchSearch);
        if (!card.hidden) visible++;
    });

    catalogCountEl.textContent = `Найдено: ${visible}`;

    // сообщение, если ничего не найдено
    let noResults = document.getElementById('no-results');
    if (visible === 0) {
        if (!noResults) {
            noResults = document.createElement('p');
            noResults.id = 'no-results';
            noResults.className = 'no-results';
            noResults.textContent = 'Ничего не найдено';
            productsGrid.append(noResults);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        categoryLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentCategory = link.dataset.category;
        applyFilters();
    });
});

searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    applyFilters();
});

searchForm.addEventListener('submit', (e) => e.preventDefault());

renderCart();
applyFilters();
