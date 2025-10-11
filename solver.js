const GRID_SIZE = 9;
const SUBGRID_SIZE = 3;
const FULL_MASK = (1 << GRID_SIZE) - 1;
const THEME_STORAGE_KEY = 'sudoku-theme-preference';
const EXAMPLE_PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const CHALLENGE_PUZZLE = '000700080700080004002000000600200000150000020000006007000000300500060009010009000';

let boardElement;
let statusElement;
let solveButton;
let clearButton;
let exampleButton;
let challengeButton;
let themeToggleButton;
let themeToggleIcon;
let themeToggleText;

let isSolving = false;
const fixedCells = new Set();

function cellKey(row, col) {
  return `${row}-${col}`;
}

function createGrid() {
  if (!boardElement) return;

  const fragment = document.createDocumentFragment();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const tr = document.createElement('tr');

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const td = document.createElement('td');
      const tone = (Math.floor(row / SUBGRID_SIZE) + Math.floor(col / SUBGRID_SIZE)) % 2 === 0 ? 'base' : 'alt';
      td.dataset.tone = tone;

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.placeholder = '·';
      input.className = 'cell-input';
      input.dataset.row = row;
      input.dataset.col = col;
      input.addEventListener('input', handleCellInput);
      input.addEventListener('focus', () => input.select());

      td.appendChild(input);
      tr.appendChild(td);
    }

    fragment.appendChild(tr);
  }

  boardElement.innerHTML = '';
  boardElement.appendChild(fragment);
}

function getInputs() {
  return Array.from(boardElement.querySelectorAll('.cell-input'));
}

function readBoard() {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

  getInputs().forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const value = Number(input.value);
    board[row][col] = Number.isInteger(value) && value >= 1 && value <= 9 ? value : 0;
  });

  return board;
}

function clearBoard({ resetStatus = true } = {}) {
  fixedCells.clear();
  const emptyBoard = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  setBoard(emptyBoard, { syncFixed: true });
  if (resetStatus) {
    setStatus('棋盘已清空，请录入新的题目。', 'info');
  }
}

function setBoard(board, options = {}) {
  const { syncFixed = false, highlightDiffFrom = null } = options;

  if (syncFixed) {
    fixedCells.clear();
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] !== 0) {
          fixedCells.add(cellKey(row, col));
        }
      }
    }
  }

  getInputs().forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const key = cellKey(row, col);
    const value = board[row][col];
    const previous = highlightDiffFrom ? highlightDiffFrom[row][col] : null;

    input.value = value ? String(value) : '';
    input.classList.remove('invalid');
    input.classList.remove('solved');

    if (fixedCells.has(key)) {
      input.classList.add('fixed');
    } else {
      input.classList.remove('fixed');
    }

    if (highlightDiffFrom && previous === 0 && value !== 0 && !fixedCells.has(key)) {
      input.classList.add('solved');
    }
  });
}

function handleCellInput(event) {
  const input = event.target;
  const numeric = input.value.replace(/[^1-9]/g, '');
  input.value = numeric;
  input.classList.remove('solved');
  input.classList.remove('invalid');
  validateRealtime();
}

function setStatus(message, type = 'info') {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

function findConflicts(board) {
  const conflicts = new Set();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const seen = new Map();
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      if (!value) continue;
      if (seen.has(value)) {
        conflicts.add(cellKey(row, col));
        conflicts.add(cellKey(row, seen.get(value)));
      } else {
        seen.set(value, col);
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const seen = new Map();
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const value = board[row][col];
      if (!value) continue;
      if (seen.has(value)) {
        conflicts.add(cellKey(row, col));
        conflicts.add(cellKey(seen.get(value), col));
      } else {
        seen.set(value, row);
      }
    }
  }

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += SUBGRID_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += SUBGRID_SIZE) {
      const seen = new Map();
      for (let row = 0; row < SUBGRID_SIZE; row += 1) {
        for (let col = 0; col < SUBGRID_SIZE; col += 1) {
          const r = boxRow + row;
          const c = boxCol + col;
          const value = board[r][c];
          if (!value) continue;
          if (seen.has(value)) {
            const { row: prevRow, col: prevCol } = seen.get(value);
            conflicts.add(cellKey(r, c));
            conflicts.add(cellKey(prevRow, prevCol));
          } else {
            seen.set(value, { row: r, col: c });
          }
        }
      }
    }
  }

  return conflicts;
}

function validateRealtime(options = {}) {
  const { updateStatus = true } = options;
  const board = readBoard();
  const conflicts = findConflicts(board);

  getInputs().forEach((input) => {
    const key = cellKey(Number(input.dataset.row), Number(input.dataset.col));
    if (conflicts.has(key)) {
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
  });

  if (updateStatus) {
    if (conflicts.size > 0) {
      setStatus('检测到冲突：请修正红色格内的数字。', 'error');
      return false;
    }

    const filled = board.some((row) => row.some((value) => value !== 0));
    if (filled) {
      setStatus('棋盘合法，可开始求解。', 'success');
    } else {
      setStatus('请在棋盘中输入数字或加载示例题目。', 'info');
    }
  }
  return conflicts.size === 0;
}

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

const BIT_TO_DIGIT = (() => {
  const table = new Array(1 << GRID_SIZE).fill(0);
  for (let digit = 1; digit <= GRID_SIZE; digit += 1) {
    table[1 << (digit - 1)] = digit;
  }
  return table;
})();

function solveSudoku(board) {
  const rows = new Array(GRID_SIZE).fill(0);
  const cols = new Array(GRID_SIZE).fill(0);
  const boxes = new Array(GRID_SIZE).fill(0);
  const empties = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      if (!value) {
        empties.push({ row, col });
        continue;
      }
      const bit = 1 << (value - 1);
      const box = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE + Math.floor(col / SUBGRID_SIZE);
      if (rows[row] & bit || cols[col] & bit || boxes[box] & bit) {
        return null;
      }
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
    }
  }

  function maskForCell(row, col) {
    const box = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE + Math.floor(col / SUBGRID_SIZE);
    return FULL_MASK & ~(rows[row] | cols[col] | boxes[box]);
  }

  function place(row, col, bit) {
    const value = BIT_TO_DIGIT[bit];
    const box = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE + Math.floor(col / SUBGRID_SIZE);
    board[row][col] = value;
    rows[row] |= bit;
    cols[col] |= bit;
    boxes[box] |= bit;
  }

  function remove(row, col, bit) {
    const box = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE + Math.floor(col / SUBGRID_SIZE);
    board[row][col] = 0;
    rows[row] ^= bit;
    cols[col] ^= bit;
    boxes[box] ^= bit;
  }

  function search() {
    if (empties.length === 0) {
      return true;
    }

    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = 10;

    for (let i = 0; i < empties.length; i += 1) {
      const { row, col } = empties[i];
      const mask = maskForCell(row, col);
      const count = bitCount(mask);
      if (count === 0) {
        return false;
      }
      if (count < bestCount) {
        bestCount = count;
        bestMask = mask;
        bestIndex = i;
        if (count === 1) {
          break;
        }
      }
    }

    const { row, col } = empties.splice(bestIndex, 1)[0];
    let mask = bestMask;

    while (mask) {
      const bit = mask & -mask;
      mask ^= bit;
      place(row, col, bit);
      if (search()) {
        return true;
      }
      remove(row, col, bit);
    }

    empties.splice(bestIndex, 0, { row, col });
    return false;
  }

  const success = search();
  return success ? board : null;
}

function withInputsDisabled(disabled) {
  getInputs().forEach((input) => {
    input.disabled = disabled;
  });

  [solveButton, clearButton, exampleButton, challengeButton].forEach((button) => {
    if (button) button.disabled = disabled;
  });
}

function captureFixedCells(board) {
  fixedCells.clear();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0) {
        fixedCells.add(cellKey(row, col));
      }
    }
  }
}

function handleSolve() {
  if (isSolving) return;
  const board = readBoard();
  const conflicts = findConflicts(board);

  if (conflicts.size > 0) {
    setStatus('当前题面存在冲突，请先修正红色格。', 'error');
    return;
  }

  const hasAnyValue = board.some((row) => row.some((value) => value !== 0));
  if (!hasAnyValue) {
    setStatus('棋盘为空，请录入题目后再尝试求解。', 'info');
    return;
  }

  isSolving = true;
  withInputsDisabled(true);
  setStatus('正在分析题面，请稍候…', 'info');

  captureFixedCells(board);
  const originalBoard = board.map((row) => row.slice());
  const workingBoard = board.map((row) => row.slice());
  const start = performance.now();
  const solved = solveSudoku(workingBoard);
  const elapsed = performance.now() - start;

  if (solved) {
    setBoard(solved, { syncFixed: false, highlightDiffFrom: originalBoard });
    const seconds = (elapsed / 1000).toFixed(2);
    setStatus(`求解成功！耗时 ${seconds} 秒。`, 'success');
  } else {
    setStatus('未找到可行解，请检查题面或尝试其他题目。', 'error');
  }

  isSolving = false;
  withInputsDisabled(false);
  validateRealtime({ updateStatus: false });
}

function handleClear() {
  if (isSolving) return;
  clearBoard();
}

function loadPuzzleFromString(puzzle) {
  if (!puzzle || puzzle.length !== GRID_SIZE * GRID_SIZE) return;
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

  for (let i = 0; i < puzzle.length; i += 1) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const char = puzzle[i];
    board[row][col] = char === '0' ? 0 : Number(char);
  }

  setBoard(board, { syncFixed: true });
  validateRealtime({ updateStatus: false });
}

function handleLoadExample() {
  if (isSolving) return;
  loadPuzzleFromString(EXAMPLE_PUZZLE);
  setStatus('已加载经典示例题。蓝色数字为题面原始值。', 'info');
}

function handleLoadChallenge() {
  if (isSolving) return;
  loadPuzzleFromString(CHALLENGE_PUZZLE);
  setStatus('已加载高难度挑战题，试试看求解效果！', 'info');
}

function applyTheme(theme, { persist = true } = {}) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', mode);

  if (themeToggleIcon) {
    themeToggleIcon.textContent = mode === 'dark' ? '🌞' : '🌙';
  }
  if (themeToggleText) {
    themeToggleText.textContent = mode === 'dark' ? '浅色' : '暗色';
  }
  if (themeToggleButton) {
    themeToggleButton.setAttribute('aria-label', `切换为${mode === 'dark' ? '浅色' : '暗色'}模式`);
    themeToggleButton.dataset.theme = mode;
  }

  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
}

function initThemeToggle() {
  themeToggleButton = document.getElementById('toggle-theme');
  if (!themeToggleButton) return;
  themeToggleIcon = themeToggleButton.querySelector('.toggle-icon');
  themeToggleText = themeToggleButton.querySelector('.toggle-text');

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored, { persist: false });
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light', { persist: false });
  }

  themeToggleButton.addEventListener('click', () => {
    const current = themeToggleButton.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function initEventListeners() {
  solveButton = document.getElementById('solve-board');
  clearButton = document.getElementById('clear-board');
  exampleButton = document.getElementById('load-example');
  challengeButton = document.getElementById('load-challenge');

  if (solveButton) solveButton.addEventListener('click', handleSolve);
  if (clearButton) clearButton.addEventListener('click', handleClear);
  if (exampleButton) exampleButton.addEventListener('click', handleLoadExample);
  if (challengeButton) challengeButton.addEventListener('click', handleLoadChallenge);
}

function init() {
  boardElement = document.querySelector('.sudoku-board tbody');
  statusElement = document.getElementById('status');

  createGrid();
  initEventListeners();
  initThemeToggle();
  validateRealtime();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
