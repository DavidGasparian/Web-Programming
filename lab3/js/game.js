'use strict';

// Игровое поле 4x4 и вся механика 2048.
window.Game = (function () {
  const SIZE = 4;
  const CELLS = SIZE * SIZE;

  let nextId = 1;
  let random = Math.random;

  const LINES = { left: [], right: [], up: [], down: [] };

  for (let i = 0; i < SIZE; i++) {
    const row = [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3];
    const col = [i, i + 4, i + 8, i + 12];

    LINES.left.push(row);
    LINES.right.push(row.slice().reverse());
    LINES.up.push(col);
    LINES.down.push(col.slice().reverse());
  }

  function emptyGrid() {
    return new Array(CELLS).fill(null);
  }

  function cloneGrid(grid) {
    return grid.map(function (cell) {
      return cell ? { id: cell.id, value: cell.value } : null;
    });
  }

  function getValues(grid) {
    return grid.map(function (cell) {
      return cell ? cell.value : 0;
    });
  }

  function canMove(grid) {
    for (let i = 0; i < CELLS; i++) {
      if (!grid[i]) return true;
    }

    for (let i = 0; i < CELLS; i++) {
      const value = grid[i].value;

      if ((i + 1) % SIZE !== 0 && grid[i + 1].value === value) return true;
      if (i + SIZE < CELLS && grid[i + SIZE].value === value) return true;
    }

    return false;
  }

  // Добавляет плитки в свободные клетки
  function addTiles(grid, count) {
    const free = [];

    for (let i = 0; i < CELLS; i++) {
      if (!grid[i]) free.push(i);
    }

    const added = [];

    for (let i = 0; i < count && free.length; i++) {
      const index = free.splice(Math.floor(random() * free.length), 1)[0];
      const value = random() < 0.9 ? 2 : 4;
      const tile = { id: nextId++, value: value };

      grid[index] = tile;
      added.push({ id: tile.id, value: value, index: index });
    }

    return added;
  }

  //одинаковые соседние плитки сливаются
  function slide(grid, direction) {
    const result = emptyGrid();
    const moves = [];
    const merges = [];
    let gained = 0;

    LINES[direction].forEach(function (line) {
      const tiles = [];

      line.forEach(function (index) {
        if (grid[index]) tiles.push(grid[index]);
      });

      let position = 0;

      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const next = tiles[i + 1];
        const target = line[position];

        if (next && next.value === tile.value) {
          const value = tile.value * 2;

          result[target] = { id: tile.id, value: value };
          moves.push({ id: tile.id, to: target });
          moves.push({ id: next.id, to: target });
          merges.push({ survivorId: tile.id, absorbedId: next.id, value: value });
          gained += value;
          i++;
        } else {
          result[target] = { id: tile.id, value: tile.value };
          moves.push({ id: tile.id, to: target });
        }

        position++;
      }
    });

    return {
      grid: result,
      moves: moves,
      merges: merges,
      gained: gained,
      changed: getValues(result).join() !== getValues(grid).join()
    };
  }

  function createGame(best) {
    const grid = emptyGrid();

    addTiles(grid, 1 + Math.floor(random() * 3));

    return {
      grid: grid,
      score: 0,
      best: best || 0,
      over: false,
      saved: false,
      prev: null
    };
  }

  function move(state, direction) {
    if (!state || state.over || !LINES[direction]) return null;

    let grid = cloneGrid(state.grid);
    const steps = [];
    let gained = 0;

    for (let pass = 0; pass < 16; pass++) {
      const result = slide(grid, direction);

      if (!result.changed) break;

      grid = result.grid;
      gained += result.gained;
      steps.push({ moves: result.moves, merges: result.merges, gained: result.gained });
    }

    if (steps.length === 0) return null;

    const prev = { grid: cloneGrid(state.grid), score: state.score };
    const spawned = addTiles(grid, 1 + Math.floor(random() * 2));
    const score = state.score + gained;

    return {
      state: {
        grid: grid,
        score: score,
        best: Math.max(state.best || 0, score),
        over: !canMove(grid),
        saved: false,
        prev: prev
      },
      steps: steps,
      spawned: spawned,
      gained: gained
    };
  }

  // Отмена одного хода
  function undo(state) {
    if (!state || state.over || !state.prev) return null;

    return {
      grid: cloneGrid(state.prev.grid),
      score: state.prev.score,
      best: state.best,
      over: false,
      saved: false,
      prev: null
    };
  }

  function serialize(state) {
    return {
      grid: cloneGrid(state.grid),
      score: state.score,
      best: state.best,
      over: state.over,
      saved: state.saved
    };
  }

  function load(saved) {
    if (!saved || !Array.isArray(saved.grid) || saved.grid.length !== CELLS) {
      return null;
    }

    const grid = [];

    for (let i = 0; i < CELLS; i++) {
      const cell = saved.grid[i];

      if (!cell) {
        grid.push(null);
      } else if (Number.isInteger(cell.value) && cell.value >= 2) {
        grid.push({ id: nextId++, value: cell.value });
      } else {
        return null;
      }
    }

    const score = Number.isInteger(saved.score) ? saved.score : 0;

    return {
      grid: grid,
      score: score,
      best: Math.max(score, Number.isInteger(saved.best) ? saved.best : 0),
      over: !canMove(grid),
      saved: Boolean(saved.saved),
      prev: null
    };
  }

  return {
    SIZE: SIZE,
    createGame: createGame,
    move: move,
    undo: undo,
    canMove: canMove,
    serialize: serialize,
    load: load,
    getValues: getValues,
    _setRandom: function (fn) {
      random = fn;
    }
  };
})();
