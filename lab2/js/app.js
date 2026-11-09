'use strict';

const STORAGE_KEY = 'lab2:tasks';

let tasks = loadTasks();

const state = {
  filter: 'all',      // 'all' | 'active' | 'done'
  sort: 'manual',     // 'manual' | 'date-asc' | 'date-desc'
  query: '',          // строка поиска
  editingId: null     // id задачи, которая сейчас редактируется
};

let draggedId = null;

const ui = {};

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

//создание элемента списка задач
function createEl(tag, { className, text, attrs } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      node.setAttribute(name, value);
    }
  }
  return node;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('ru-RU');
}

//сегодняшняя дата в формате гггг/мм/дд
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isOverdue(task) {
  return !task.done && task.date !== '' && task.date < todayISO();
}

//операции над задачами
function addTask(text, date) {
  tasks.push({ id: generateId(), text, date, done: false });
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  if (state.editingId === id) state.editingId = null;
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
}

function updateTask(id, text, date) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.text = text;
  task.date = date;
  state.editingId = null;
  saveTasks();
  render();
}

//перемещает задачу fromId на место задачи toId (в основном массиве)
function moveTask(fromId, toId) {
  const fromIndex = tasks.findIndex((task) => task.id === fromId);
  const toIndex = tasks.findIndex((task) => task.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;
  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);
  saveTasks();
  render();
}


//фильтрация, поиск и сортировка
//задачи без даты всегда уходят в конец списка
function compareByDate(a, b) {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  const diff = a.date.localeCompare(b.date);
  return state.sort === 'date-asc' ? diff : -diff;
}

function getVisibleTasks() {
  const query = state.query.trim().toLowerCase();

  const result = tasks.filter((task) => {
    let matchesStatus = true;
    if (state.filter === 'done') matchesStatus = task.done;
    if (state.filter === 'active') matchesStatus = !task.done;
    const matchesQuery = task.text.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  if (state.sort !== 'manual') {
    result.sort(compareByDate);
  }
  return result;
}

//макет страницы
//подключаем css
function loadStyles() {
  const link = createEl('link', {
    attrs: { rel: 'stylesheet', href: 'css/style.css'}
  });
  document.head.append(link);
}

function createField(labelText, control) {
  const label = createEl('label', { className: 'field' });
  const caption = createEl('span', { className: 'field__label', text: labelText });
  label.append(caption, control);
  return label;
}

function createSelect(options, value, onChange) {
  const select = createEl('select', { className: 'input' });
  options.forEach(([optionValue, optionText]) => {
    const option = createEl('option', { text: optionText, attrs: { value: optionValue } });
    select.append(option);
  });
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function buildForm() {
  const form = createEl('form', {
    className: 'task-form',
    attrs: { autocomplete: 'off' }
  });

  ui.textInput = createEl('input', {
    className: 'input',
    attrs: {
      type: 'text',
      required: '',
      maxlength: '120',
      placeholder: 'Что нужно сделать?'
    }
  });

  ui.dateInput = createEl('input', {
    className: 'input',
    attrs: { type: 'date' }
  });

  const submitButton = createEl('button', {
    className: 'btn btn--primary',
    text: 'Добавить',
    attrs: { type: 'submit' }
  });

  form.append(
    createField('Новая задача', ui.textInput),
    createField('Дата', ui.dateInput),
    submitButton
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = ui.textInput.value.trim();
    if (!text) {
      ui.textInput.focus();
      return;
    }
    addTask(text, ui.dateInput.value);
    form.reset();
    ui.textInput.focus();
  });

  return form;
}

function buildToolbar() {
  const toolbar = createEl('section', {
    className: 'toolbar',
    attrs: { 'aria-label': 'Поиск, фильтр и сортировка' }
  });

  const searchInput = createEl('input', {
    className: 'input',
    attrs: { type: 'search', placeholder: 'Поиск по названию' }
  });
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    render();
  });

  const filterSelect = createSelect(
    [
      ['all', 'Все'],
      ['active', 'Невыполненные'],
      ['done', 'Выполненные']
    ],
    state.filter,
    (value) => {
      state.filter = value;
      render();
    }
  );

  const sortSelect = createSelect(
    [
      ['manual', 'Вручную (drag-and-drop)'],
      ['date-asc', 'По дате: сначала ранние'],
      ['date-desc', 'По дате: сначала поздние']
    ],
    state.sort,
    (value) => {
      state.sort = value;
      render();
    }
  );

  toolbar.append(
    createField('Поиск', searchInput),
    createField('Статус', filterSelect),
    createField('Сортировка', sortSelect)
  );
  return toolbar;
}

function buildListSection() {
  const section = createEl('section', {
    className: 'tasks',
    attrs: { 'aria-label': 'Список задач' }
  });

  ui.hint = createEl('p', { className: 'hint' });
  ui.list = createEl('ul', { className: 'task-list' });
  ui.empty = createEl('p', { className: 'empty' });

  section.append(ui.hint, ui.list, ui.empty);
  return section;
}

function buildLayout() {
  const app = createEl('div', { className: 'app' });

  const header = createEl('header', { className: 'app-header' });
  const title = createEl('h1', { className: 'app-title', text: 'DavidToDo' });
  header.append(title);

  const main = createEl('main', { className: 'app-main' });
  main.append(buildForm(), buildToolbar(), buildListSection());

  const footer = createEl('footer', { className: 'app-footer' });
  ui.counter = createEl('p', { className: 'counter' });
  footer.append(ui.counter);

  app.append(header, main, footer);
  document.body.append(app);
}

function createTaskItem(task) {
  if (state.editingId === task.id) return createEditItem(task);

  const item = createEl('li', { className: 'task-item' });
  item.dataset.id = task.id;
  if (task.done) item.classList.add('task-item--done');
  if (isOverdue(task)) item.classList.add('task-item--overdue');

  const checkbox = createEl('input', {
    className: 'task-checkbox',
    attrs: { type: 'checkbox', 'aria-label': 'Отметить выполненной' }
  });
  checkbox.checked = task.done;
  checkbox.addEventListener('change', () => toggleTask(task.id));

  const body = createEl('div', { className: 'task-body' });
  body.append(createEl('span', { className: 'task-title', text: task.text }));
  if (task.date) {
    body.append(
      createEl('time', {
        className: 'task-date',
        text: formatDate(task.date),
        attrs: { datetime: task.date }
      })
    );
  }

  const actions = createEl('div', { className: 'task-actions' });

  const editButton = createEl('button', {
    className: 'btn btn--ghost',
    text: 'Изменить',
    attrs: { type: 'button' }
  });
  editButton.addEventListener('click', () => {
    state.editingId = task.id;
    render();
  });

  const deleteButton = createEl('button', {
    className: 'btn btn--danger',
    text: 'Удалить',
    attrs: { type: 'button' }
  });
  deleteButton.addEventListener('click', () => deleteTask(task.id));

  actions.append(editButton, deleteButton);
  item.append(checkbox, body, actions);

  setupDragAndDrop(item, task.id);
  return item;
}

function createEditItem(task) {
  const item = createEl('li', { className: 'task-item task-item--editing' });
  const form = createEl('form', { className: 'edit-form' });

  const textInput = createEl('input', {
    className: 'input edit-text',
    attrs: {
      type: 'text',
      required: '',
      maxlength: '120',
      'aria-label': 'Текст задачи'
    }
  });
  textInput.value = task.text;

  const dateInput = createEl('input', {
    className: 'input',
    attrs: { type: 'date', 'aria-label': 'Дата задачи' }
  });
  dateInput.value = task.date;

  const saveButton = createEl('button', {
    className: 'btn btn--primary',
    text: 'Сохранить',
    attrs: { type: 'submit' }
  });

  const cancelButton = createEl('button', {
    className: 'btn btn--ghost',
    text: 'Отмена',
    attrs: { type: 'button' }
  });

  function cancelEditing() {
    state.editingId = null;
    render();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
      textInput.focus();
      return;
    }
    updateTask(task.id, text, dateInput.value);
  });

  cancelButton.addEventListener('click', cancelEditing);
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') cancelEditing();
  });

  form.append(textInput, dateInput, saveButton, cancelButton);
  item.append(form);
  return item;
}

//drag-n-drop
function setupDragAndDrop(item, id) {
  //перетаскивание работает только в режиме ручной сортировки
  const canDrag = state.sort === 'manual';
  item.draggable = canDrag;
  if (!canDrag) return;

  item.addEventListener('dragstart', (event) => {
    draggedId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    requestAnimationFrame(() => item.classList.add('task-item--dragging'));
  });

  item.addEventListener('dragover', (event) => {
    if (draggedId === null || draggedId === id) return;
    event.preventDefault(); //без этого браузер не разрешит drop
    event.dataTransfer.dropEffect = 'move';
    item.classList.add('task-item--over');
  });

  item.addEventListener('dragleave', (event) => {
    if (!item.contains(event.relatedTarget)) {
      item.classList.remove('task-item--over');
    }
  });

  item.addEventListener('drop', (event) => {
    event.preventDefault();
    const fromId = draggedId;
    draggedId = null;
    if (fromId !== null && fromId !== id) moveTask(fromId, id);
  });

  item.addEventListener('dragend', () => {
    draggedId = null;
    render(); //убирает временные классы подсветки
  });
}

function render() {
  const visible = getVisibleTasks();

  ui.list.replaceChildren(...visible.map(createTaskItem));

  ui.empty.hidden = visible.length > 0;
  ui.empty.textContent =
    tasks.length === 0
      ? 'Задач пока нет. Добавьте первую!'
      : 'Ничего не найдено. Измените поиск или фильтр.';

  ui.hint.textContent =
    state.sort === 'manual'
      ? 'Перетащите задачу мышью, чтобы изменить порядок.'
      : 'Перетаскивание доступно только при сортировке «Вручную».';

  const doneCount = tasks.filter((task) => task.done).length;
  ui.counter.textContent = `Всего: ${tasks.length} · Выполнено: ${doneCount} · Осталось: ${tasks.length - doneCount}`;

  const editField = ui.list.querySelector('.edit-text');
  if (editField) editField.focus();
}

//запуск
function init() {
  loadStyles();
  buildLayout();
  render();
}

init();
