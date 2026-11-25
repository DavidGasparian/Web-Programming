'use strict';

(function () {
  const Game = window.Game;

  const STATE_KEY = 'lab3:2048:state';
  const LEADERS_KEY = 'lab3:2048:leaderboard';

  // Цвета плиток: [фон, цвет текста].
  const COLORS = {
    2: ['#eee4d6', '#6d6257'],
    4: ['#ecdfc3', '#6d6257'],
    8: ['#f3b27f', '#4a2a13'],
    16: ['#f79b63', '#3f2410'],
    32: ['#f47c5d', '#ffffff'],
    64: ['#ed5c3d', '#ffffff'],
    128: ['#f3d06c', '#4a3a0d'],
    256: ['#f1c750', '#443407'],
    512: ['#eebb35', '#3d2e04'],
    1024: ['#ecb022', '#332603'],
    2048: ['#f0b02a', '#2b2002'],
    4096: ['#8666e8', '#ffffff'],
    8192: ['#5f43d8', '#ffffff'],
    16384: ['#3b7fe0', '#ffffff'],
    32768: ['#1fa78c', '#04231c'],
    65536: ['#e2477a', '#ffffff'],
    131072: ['#26252e', '#f6cf62']
  };

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const undoBtn = document.getElementById('undo');
  const restartBtn = document.getElementById('restart');
  const leadersBtn = document.getElementById('leaders');
  const board = document.getElementById('board');
  const gridEl = document.getElementById('grid');
  const tilesEl = document.getElementById('tiles');
  const dpad = document.getElementById('dpad');

  const gameOverModal = document.getElementById('gameover-modal');
  const gameOverScore = document.getElementById('gameover-score');
  const gameOverMessage = document.getElementById('gameover-message');
  const saveForm = document.getElementById('save-form');
  const nameInput = document.getElementById('player-name');
  const nameError = document.getElementById('name-error');
  const restartOverBtn = document.getElementById('restart-over');
  const openLeadersOverBtn = document.getElementById('open-leaders-over');

  const leadersModal = document.getElementById('leaders-modal');
  const closeLeadersBtn = document.getElementById('close-leaders');
  const leadersTable = document.getElementById('leaders-table');
  const leadersBody = document.getElementById('leaders-body');
  const leadersEmpty = document.getElementById('leaders-empty');

  const tiles = new Map();
  let state = null;
  let busy = false;
  let swipeStart = null;

  /* Запуск  */
  function init() {
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      gridEl.appendChild(cell);
    }

    state = loadState() || Game.createGame(0);
    saveState();

    bindEvents();
    render();

    if (state.over) {
      showGameOver();
    }
  }

  /* Сохранение */

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(Game.serialize(state)));
    } catch (error) {
    }
  }

  function loadState() {
    try {
      return Game.load(JSON.parse(localStorage.getItem(STATE_KEY)));
    } catch (error) {
      return null;
    }
  }

  /* Отрисовка */
  function render() {
    tilesEl.innerHTML = '';
    tiles.clear();

    state.grid.forEach(function (tile, index) {
      if (tile) addTile(tile, index, false);
    });

    updateScore();
    updateUndo();
    updateDpad();
  }

  function addTile(tile, index, isNew) {
    const element = document.createElement('div');

    element.className = 'tile';
    element.dataset.id = tile.id;
    paintTile(element, tile.value);
    placeTile(element, index);

    if (isNew) element.classList.add('tile--new');

    tilesEl.appendChild(element);
    tiles.set(tile.id, element);

    return element;
  }

  function paintTile(element, value) {
    const colors = COLORS[value] || ['#3b3a46', '#ffd98a'];

    element.dataset.digits = String(value).length;
    element.textContent = value;
    element.style.background = colors[0];
    element.style.color = colors[1];
  }

  function placeTile(element, index) {
    element.style.setProperty('--x', index % 4);
    element.style.setProperty('--y', Math.floor(index / 4));
  }

  function updateScore() {
    scoreEl.textContent = state.score.toLocaleString('ru-RU');
    bestEl.textContent = state.best.toLocaleString('ru-RU');
  }

  function updateUndo() {
    undoBtn.disabled = busy || state.over || !state.prev;
  }

  function isModalOpen() {
    return !gameOverModal.hidden || !leadersModal.hidden;
  }

  function updateDpad() {
    dpad.hidden = window.innerWidth > 760 || state.over || isModalOpen();
  }

  /* Ход */

  function handleMove(direction) {
    if (busy || state.over || isModalOpen()) return;

    const result = Game.move(state, direction);

    if (result) animateMove(result);
  }

  async function animateMove(result) {
    busy = true;
    updateUndo();

    let shownScore = state.score;

    for (const step of result.steps) {
      step.moves.forEach(function (move) {
        const element = tiles.get(move.id);
        if (element) placeTile(element, move.to);
      });

      await wait(140);

      step.merges.forEach(function (merge) {
        const survivor = tiles.get(merge.survivorId);
        const absorbed = tiles.get(merge.absorbedId);

        if (survivor) {
          paintTile(survivor, merge.value);
          survivor.classList.remove('tile--pop');
          void survivor.offsetWidth;
          survivor.classList.add('tile--pop');
        }

        if (absorbed) {
          tiles.delete(merge.absorbedId);
          absorbed.classList.add('tile--gone');
          setTimeout(function () {
            absorbed.remove();
          }, 150);
        }
      });

      if (step.gained > 0) {
        shownScore += step.gained;
        scoreEl.textContent = shownScore.toLocaleString('ru-RU');
      }

      await wait(100);
    }

    state = result.state;

    state.grid.forEach(function (tile, index) {
      if (!tile) return;

      const element = tiles.get(tile.id);

      if (element) {
        paintTile(element, tile.value);
        placeTile(element, index);
      } else {
        addTile(tile, index, true);
      }
    });

    tiles.forEach(function (element, id) {
      const exists = state.grid.some(function (tile) {
        return tile && tile.id === id;
      });

      if (!exists) {
        element.remove();
        tiles.delete(id);
      }
    });

    updateScore();
    saveState();

    busy = false;
    updateUndo();
    updateDpad();

    if (state.over) {
      setTimeout(showGameOver, 200);
    }
  }

  function handleUndo() {
    if (busy) return;

    const previous = Game.undo(state);

    if (!previous) return;

    state = previous;
    saveState();
    render();
  }

  function restart() {
    if (busy) return;

    state = Game.createGame(state.best);
    saveState();

    resetForm();
    closeModal(gameOverModal);
    closeModal(leadersModal);
    render();
  }

  /* Окончание игры и рекорд */

  function showGameOver() {
    if (!state.over) return;

    gameOverScore.textContent = state.score.toLocaleString('ru-RU');

    if (state.saved) {
      saveForm.hidden = true;
      gameOverMessage.textContent = 'Ваш рекорд сохранён!';
      gameOverMessage.classList.add('saved');
    } else {
      resetForm();
    }

    openModal(gameOverModal);
  }

  function resetForm() {
    saveForm.hidden = false;
    gameOverMessage.textContent = 'Введите имя и сохраните результат в таблицу лидеров.';
    gameOverMessage.classList.remove('saved');
    nameInput.value = '';
    nameError.hidden = true;
    nameInput.removeAttribute('aria-invalid');
  }

  function saveResult(event) {
    event.preventDefault();

    if (!state.over || state.saved) return;

    const name = nameInput.value.trim().replace(/\s+/g, ' ');

    if (!name) {
      nameError.textContent = 'Введите имя.';
      nameError.hidden = false;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }

    addLeader(name, state.score);

    state.saved = true;
    saveState();

    saveForm.hidden = true;
    gameOverMessage.textContent = 'Ваш рекорд сохранён!';
    gameOverMessage.classList.add('saved');
    restartOverBtn.focus();
  }

  /* Таблица лидеров */

  function getLeaders() {
    try {
      const list = JSON.parse(localStorage.getItem(LEADERS_KEY));

      if (!Array.isArray(list)) return [];

      return list
        .filter(function (item) {
          return item && typeof item.name === 'string' && typeof item.score === 'number';
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  function addLeader(name, score) {
    const list = getLeaders();

    list.push({ name: name, score: score, date: new Date().toISOString() });
    list.sort(function (a, b) {
      return b.score - a.score;
    });

    try {
      localStorage.setItem(LEADERS_KEY, JSON.stringify(list.slice(0, 10)));
    } catch (error) {
    }
  }

  function formatDate(value) {
    const date = new Date(value);

    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
  }

  function showLeaders() {
    if (busy) return;

    const list = getLeaders();

    leadersBody.innerHTML = '';
    leadersTable.hidden = list.length === 0;
    leadersEmpty.hidden = list.length > 0;

    list.forEach(function (item, index) {
      const row = document.createElement('tr');
      const rank = document.createElement('td');
      const name = document.createElement('td');
      const points = document.createElement('td');
      const date = document.createElement('td');

      rank.className = 'rank';
      rank.textContent = index + 1;
      name.className = 'name';
      name.textContent = item.name;
      points.className = 'points';
      points.textContent = item.score.toLocaleString('ru-RU');
      date.className = 'date';
      date.textContent = formatDate(item.date);

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(points);
      row.appendChild(date);
      leadersBody.appendChild(row);
    });

    openModal(leadersModal);
  }

  /* Модальные окна */
  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    updateDpad();
  }

  function closeModal(modal) {
    modal.hidden = true;

    if (gameOverModal.hidden && leadersModal.hidden) {
      document.body.classList.remove('modal-open');
    }

    updateDpad();
  }

  /* События */

  function bindEvents() {
    undoBtn.addEventListener('click', handleUndo);
    restartBtn.addEventListener('click', restart);
    restartOverBtn.addEventListener('click', restart);
    leadersBtn.addEventListener('click', showLeaders);
    openLeadersOverBtn.addEventListener('click', showLeaders);
    closeLeadersBtn.addEventListener('click', function () {
      closeModal(leadersModal);
    });

    leadersModal.addEventListener('click', function (event) {
      if (event.target === leadersModal) closeModal(leadersModal);
    });

    saveForm.addEventListener('submit', saveResult);

    nameInput.addEventListener('input', function () {
      nameError.hidden = true;
      nameInput.removeAttribute('aria-invalid');
    });

    document.querySelectorAll('#dpad button').forEach(function (button) {
      button.addEventListener('click', function () {
        handleMove(button.dataset.move);
      });
    });

    const keys = {
      arrowleft: 'left',
      arrowright: 'right',
      arrowup: 'up',
      arrowdown: 'down',
      a: 'left',
      d: 'right',
      w: 'up',
      s: 'down'
    };

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!leadersModal.hidden) closeModal(leadersModal);
        return;
      }

      if (event.target.tagName === 'INPUT' || isModalOpen()) return;

      const direction = keys[event.key.toLowerCase()];

      if (!direction) return;

      event.preventDefault();
      handleMove(direction);
    });

    board.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' || busy || state.over || isModalOpen()) return;

      swipeStart = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener('pointerup', function (event) {
      if (!swipeStart) return;

      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;

      swipeStart = null;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }
    });

    window.addEventListener('pointercancel', function () {
      swipeStart = null;
    });

    window.addEventListener('resize', updateDpad);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  init();
})();
