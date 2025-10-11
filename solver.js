const GRID_SIZE = 9;
const SUBGRID_SIZE = 3;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

let boardElement;
let statusElement;
let solveButton;
let clearButton;
let exampleButton;

let isSolving = false;

function createGrid() {
  if (!boardElement) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const tr = document.createElement('tr');

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.placeholder = '·';
      input.dataset.row = row;
      input.dataset.col = col;
      input.className = 'cell-input';
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

function handleCellInput(event) {
  const input = event.target;
  const value = input.value.replace(/[^1-9]/g, '');
  input.value = value;
  input.classList.remove('invalid', 'solved');
  validateRealtime();
}

function getInputs() {
  return Array.from(boardElement.querySelectorAll('.cell-input'));
}

function readBoard() {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  getInputs().forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const value = input.value;
    board[row][col] = value ? Number(value) : 0;
  });
  return board;
}

function setBoard(board, options = {}) {
  const { fixed = false, animate = false } = options;
  getInputs().forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const value = board[row][col];
    input.value = value ? value : '';
    if (value === 0) {
      input.classList.remove('solved');
      if (!fixed) {
        input.classList.remove('fixed');
      }
    } else {
      if (animate) {
        input.classList.add('solved');
      }
      if (fixed) {
        input.classList.add('fixed');
      }
    }
  });
}

function resetFixedStyles() {
  getInputs().forEach((input) => input.classList.remove('fixed'));
}

function setStatus(message, type = 'info') {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

function validateRealtime() {
  const board = readBoard();
  const conflicts = findConflicts(board);

  getInputs().forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    const hasConflict = conflicts.some((conflict) => conflict.row === row && conflict.col === col);
    if (hasConflict) {
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
  });

  if (conflicts.length > 0) {
    setStatus('检测到冲突：请检查红色高亮格。', 'error');
    return false;
  }

  setStatus('棋盘合法，可开始求解。', 'success');
  return true;
}

function findConflicts(board) {
  const conflicts = [];

  const pushConflict = (row, col) => {
    conflicts.push({ row, col });
  };

  for (let i = 0; i < GRID_SIZE; i += 1) {
    const rowSet = new Map();
    const colSet = new Map();
    for (let j = 0; j < GRID_SIZE; j += 1) {
      const rowVal = board[i][j];
      const colVal = board[j][i];

      if (rowVal) {
        if (rowSet.has(rowVal)) {
          pushConflict(i, j);
          pushConflict(i, rowSet.get(rowVal));
        } else {
          rowSet.set(rowVal, j);
        }
      }

      if (colVal) {
        if (colSet.has(colVal)) {
          pushConflict(j, i);
          pushConflict(colSet.get(colVal), i);
        } else {
          colSet.set(colVal, j);
        }
      }
    }
  }

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += SUBGRID_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += SUBGRID_SIZE) {
      const boxSet = new Map();
      for (let r = 0; r < SUBGRID_SIZE; r += 1) {
        for (let c = 0; c < SUBGRID_SIZE; c += 1) {
          const row = boxRow + r;
          const col = boxCol + c;
          const val = board[row][col];
          if (!val) continue;
          const key = `${val}`;
          if (boxSet.has(key)) {
            const { row: conflictRow, col: conflictCol } = boxSet.get(key);
            pushConflict(row, col);
            pushConflict(conflictRow, conflictCol);
          } else {
            boxSet.set(key, { row, col });
          }
        }
      }
    }
  }

  return conflicts;
}

function getCandidates(board, row, col) {
  const used = new Set();

  for (let i = 0; i < GRID_SIZE; i += 1) {
    used.add(board[row][i]);
    used.add(board[i][col]);
  }

  const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;

  for (let r = startRow; r < startRow + SUBGRID_SIZE; r += 1) {
    for (let c = startCol; c < startCol + SUBGRID_SIZE; c += 1) {
      used.add(board[r][c]);
    }
  }

  return DIGITS.filter((digit) => !used.has(Number(digit)));
}

function selectNextCell(board) {
  let best = null;
  let bestCandidates = null;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) {
        const candidates = getCandidates(board, row, col);
        if (candidates.length === 0) {
          return null;
        }
        if (!best || candidates.length < bestCandidates.length) {
          best = { row, col };
          bestCandidates = candidates;
          if (candidates.length === 1) {
            return { ...best, candidates };
          }
        }
      }
    }
  }

  return best ? { ...best, candidates: bestCandidates } : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function solveRecursive(board) {
  const nextCell = selectNextCell(board);
  if (!nextCell) {
    return true; // solved
  }

  const { row, col, candidates } = nextCell;

  for (const candidate of candidates) {
    board[row][col] = Number(candidate);
    updateSingleCell(row, col, candidate, true);
    await sleep(12);

    if (await solveRecursive(board)) {
      return true;
    }

    board[row][col] = 0;
    updateSingleCell(row, col, '', false);
    await sleep(6);
  }

  return false;
}

function updateSingleCell(row, col, value, animate) {
  if (!boardElement) return;
  const input = boardElement.querySelector(`.cell-input[data-row="${row}"][data-col="${col}"]`);
  if (!input) return;
  input.value = value;
  input.classList.toggle('solved', animate && value);
}

function disableControls() {
  isSolving = true;
  if (solveButton) solveButton.disabled = true;
  if (clearButton) clearButton.disabled = true;
  if (exampleButton) exampleButton.disabled = true;
}

function enableControls() {
  isSolving = false;
  if (solveButton) solveButton.disabled = false;
  if (clearButton) clearButton.disabled = false;
  if (exampleButton) exampleButton.disabled = false;
}

async function handleSolve() {
  if (isSolving) return;
  setStatus('正在分析棋盘，请稍候…', 'info');

  const board = readBoard();
  const valid = validateRealtime();
  if (!valid) {
    return;
  }

  disableControls();

  const start = performance.now();
  const solved = await solveRecursive(board);
  const end = performance.now();

  enableControls();

  if (solved) {
    setStatus(`求解成功！耗时 ${(end - start).toFixed(1)} ms。`, 'success');
  } else {
    setStatus('未能求解当前棋盘，请检查题目是否存在多解或无解。', 'error');
  }
}

function handleClear() {
  if (isSolving) return;
  getInputs().forEach((input) => {
    input.value = '';
    input.classList.remove('invalid', 'solved', 'fixed');
  });
  setStatus('棋盘已清空，欢迎输入新的题目。', 'info');
}

function handleLoadExample() {
  if (isSolving) return;
  const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
  resetFixedStyles();
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let i = 0; i < puzzle.length; i += 1) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const char = puzzle[i];
    board[row][col] = Number(char);
  }
  setBoard(board, { fixed: true });
  validateRealtime();
  setStatus('已加载示例题目，蓝色数字为原题面。', 'info');
}

function setupEventListeners() {
  if (!solveButton || !clearButton || !exampleButton) {
    return;
  }

  solveButton.addEventListener('click', handleSolve);
  clearButton.addEventListener('click', handleClear);
  exampleButton.addEventListener('click', handleLoadExample);
}

function init() {
  boardElement = document.querySelector('.sudoku-board tbody');
  statusElement = document.getElementById('status');
  solveButton = document.getElementById('solve-board');
  clearButton = document.getElementById('clear-board');
  exampleButton = document.getElementById('load-example');

  createGrid();
  setupEventListeners();
  setStatus('请在棋盘中输入数字或加载示例题目。', 'info');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
