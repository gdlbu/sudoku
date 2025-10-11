const GRID_SIZE = 9;
const SUBGRID_SIZE = 3;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DETERMINISTIC_DELAY = 18;
const SEARCH_DELAY = 12;
const BACKTRACK_DELAY = 6;
const THEME_STORAGE_KEY = 'sudoku-theme-preference';

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
let themeMode = 'system';

function createGrid() {
  if (!boardElement) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const tr = document.createElement('tr');

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const td = document.createElement('td');
      const tone = (Math.floor(row / SUBGRID_SIZE) + Math.floor(col / SUBGRID_SIZE)) % 2 === 0 ? 'base' : 'alt';
      td.dataset.tone = tone === 'alt' ? 'alt' : 'base';

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
    input.classList.remove('invalid', 'solved');
    if (value === 0) {
      if (!fixed) {
        input.classList.remove('fixed');
      }
    } else {
      if (animate) {
        input.classList.add('solved');
      }
      if (fixed) {
        input.classList.add('fixed');
      } else {
        input.classList.remove('fixed');
      }
    }
  });
}

function updateSingleCell(row, col, value, highlight) {
  if (!boardElement) return;
  const selector = `.cell-input[data-row="${row}"][data-col="${col}"]`;
  const input = boardElement.querySelector(selector);
  if (!input) return;
  input.value = value ? value : '';
  if (highlight && value) {
    input.classList.add('solved');
  } else if (!value) {
    input.classList.remove('solved');
  }
  if (!value) {
    input.classList.remove('invalid');
  }
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

  const hasAnyValue = board.some((row) => row.some((value) => value !== 0));
  if (hasAnyValue) {
    setStatus('棋盘合法，可开始求解。', 'success');
  } else {
    setStatus('请在棋盘中输入数字或加载示例题目。', 'info');
  }
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

  return DIGITS.filter((digit) => !used.has(digit));
}

function computeCandidatesMap(board) {
  return board.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      if (value !== 0) return null;
      return new Set(getCandidates(board, rowIndex, colIndex));
    }),
  );
}

function findHiddenSingle(candidatesMap) {
  // Rows
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const positions = new Map();
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const candidates = candidatesMap[row][col];
      if (!candidates) continue;
      for (const candidate of candidates) {
        if (!positions.has(candidate)) {
          positions.set(candidate, []);
        }
        positions.get(candidate).push({ row, col });
      }
    }
    for (const [value, cells] of positions.entries()) {
      if (cells.length === 1) {
        return { ...cells[0], value };
      }
    }
  }

  // Columns
  for (let col = 0; col < GRID_SIZE; col += 1) {
    const positions = new Map();
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const candidates = candidatesMap[row][col];
      if (!candidates) continue;
      for (const candidate of candidates) {
        if (!positions.has(candidate)) {
          positions.set(candidate, []);
        }
        positions.get(candidate).push({ row, col });
      }
    }
    for (const [value, cells] of positions.entries()) {
      if (cells.length === 1) {
        return { ...cells[0], value };
      }
    }
  }

  // Boxes
  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += SUBGRID_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += SUBGRID_SIZE) {
      const positions = new Map();
      for (let r = 0; r < SUBGRID_SIZE; r += 1) {
      for (let c = 0; c < SUBGRID_SIZE; c += 1) {
        const row = boxRow + r;
        const col = boxCol + c;
          const candidates = candidatesMap[row][col];
          if (!candidates) continue;
          for (const candidate of candidates) {
            if (!positions.has(candidate)) {
              positions.set(candidate, []);
            }
            positions.get(candidate).push({ row, col });
          }
      }
    }
      for (const [value, cells] of positions.entries()) {
        if (cells.length === 1) {
          return { ...cells[0], value };
        }
      }
    }
  }

  return null;
}

function eliminateCandidate(candidatesMap, row, col, value) {
  const candidates = candidatesMap[row][col];
  if (!candidates) {
    return { changed: false, contradiction: false };
  }
  if (!candidates.has(value)) {
    return { changed: false, contradiction: false };
  }
  candidates.delete(value);
  if (candidates.size === 0) {
    return { changed: true, contradiction: true };
  }
  return { changed: true, contradiction: false };
}

function placeValue(board, candidatesMap, row, col, value) {
  board[row][col] = value;
  candidatesMap[row][col] = null;

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== col) {
      const resultRow = eliminateCandidate(candidatesMap, row, i, value);
      if (resultRow.contradiction) {
        return false;
      }
    }
    if (i !== row) {
      const resultCol = eliminateCandidate(candidatesMap, i, col, value);
      if (resultCol.contradiction) {
        return false;
      }
    }
  }

  const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;

  for (let r = startRow; r < startRow + SUBGRID_SIZE; r += 1) {
    for (let c = startCol; c < startCol + SUBGRID_SIZE; c += 1) {
      if (r === row && c === col) continue;
      const resultBox = eliminateCandidate(candidatesMap, r, c, value);
      if (resultBox.contradiction) {
        return false;
      }
    }
  }

  return true;
}

function applyAdvancedReductions(candidatesMap) {
  let progress = false;
  let contradiction = false;

  const attemptElimination = (row, col, digit) => {
    const result = eliminateCandidate(candidatesMap, row, col, digit);
    if (result.changed) {
      progress = true;
    }
    if (result.contradiction) {
      contradiction = true;
    }
    return result.changed;
  };

  const runNakedPairsUnit = (cells) => {
    let unitChanged = false;
    const pairMap = new Map();

    cells.forEach(({ row, col }) => {
      const candidates = candidatesMap[row][col];
      if (!candidates || candidates.size !== 2) return;
      const key = Array.from(candidates)
        .sort((a, b) => a - b)
        .join(',');
      if (!pairMap.has(key)) {
        pairMap.set(key, []);
      }
      pairMap.get(key).push({ row, col });
    });

    for (const [key, cellsWithPair] of pairMap.entries()) {
      if (cellsWithPair.length !== 2) continue;
      const digits = key.split(',').map((value) => Number(value));
      cells.forEach(({ row, col }) => {
        const isPairCell = cellsWithPair.some((cell) => cell.row === row && cell.col === col);
        if (isPairCell) return;
        digits.forEach((digit) => {
          if (attemptElimination(row, col, digit)) {
            unitChanged = true;
          }
        });
      });
    }

    return unitChanged;
  };

  const applyNakedPairs = () => {
    let changed = false;
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const cells = Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col }));
      if (runNakedPairsUnit(cells)) {
        changed = true;
      }
    }
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cells = Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col }));
      if (runNakedPairsUnit(cells)) {
        changed = true;
      }
    }
    for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += SUBGRID_SIZE) {
      for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += SUBGRID_SIZE) {
        const cells = [];
        for (let r = 0; r < SUBGRID_SIZE; r += 1) {
          for (let c = 0; c < SUBGRID_SIZE; c += 1) {
            cells.push({ row: boxRow + r, col: boxCol + c });
          }
        }
        if (runNakedPairsUnit(cells)) {
          changed = true;
        }
      }
    }
    return changed;
  };

  const applyLockedCandidates = () => {
    let changed = false;
    for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += SUBGRID_SIZE) {
      for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += SUBGRID_SIZE) {
        const digitPositions = new Map();
        for (let r = 0; r < SUBGRID_SIZE; r += 1) {
          for (let c = 0; c < SUBGRID_SIZE; c += 1) {
            const row = boxRow + r;
            const col = boxCol + c;
            const candidates = candidatesMap[row][col];
            if (!candidates) continue;
            for (const digit of candidates) {
              if (!digitPositions.has(digit)) {
                digitPositions.set(digit, []);
              }
              digitPositions.get(digit).push({ row, col });
            }
          }
        }

        for (const [digit, cells] of digitPositions.entries()) {
          if (cells.length <= 1) continue;
          const baseRow = cells[0].row;
          const baseCol = cells[0].col;
          const sameRow = cells.every((cell) => cell.row === baseRow);
          const sameCol = cells.every((cell) => cell.col === baseCol);

          if (sameRow) {
            for (let col = 0; col < GRID_SIZE; col += 1) {
              if (col >= boxCol && col < boxCol + SUBGRID_SIZE) continue;
              if (attemptElimination(baseRow, col, digit)) {
                changed = true;
              }
            }
          }

          if (sameCol) {
            for (let row = 0; row < GRID_SIZE; row += 1) {
              if (row >= boxRow && row < boxRow + SUBGRID_SIZE) continue;
              if (attemptElimination(row, baseCol, digit)) {
                changed = true;
              }
            }
          }
        }
      }
    }
    return changed;
  };

  let changed;
  do {
    changed = false;
    if (applyNakedPairs()) {
      changed = true;
    }
    if (contradiction) break;
    if (applyLockedCandidates()) {
      changed = true;
    }
  } while (changed && !contradiction);

  return { progress, contradiction };
}

async function applyDeterministic(board) {
  const modifications = [];

  let candidatesMap = computeCandidatesMap(board);

  while (true) {
    let progress = false;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const candidates = candidatesMap[row][col];
        if (!candidates) continue;
        if (candidates.size === 0) {
          return { success: false, modifications, candidatesMap };
        }
        if (candidates.size === 1) {
          const [value] = candidates;
          const ok = placeValue(board, candidatesMap, row, col, value);
          if (!ok) {
            return { success: false, modifications, candidatesMap };
          }
          modifications.push({ row, col });
          updateSingleCell(row, col, value, true);
          await sleep(DETERMINISTIC_DELAY);
          progress = true;
          break;
        }
      }
      if (progress) break;
    }

    if (progress) {
      continue;
    }

    const hiddenSingle = findHiddenSingle(candidatesMap);
    if (hiddenSingle) {
      const { row, col, value } = hiddenSingle;
      const ok = placeValue(board, candidatesMap, row, col, Number(value));
      if (!ok) {
        return { success: false, modifications, candidatesMap };
      }
      modifications.push({ row, col });
      updateSingleCell(row, col, value, true);
      await sleep(DETERMINISTIC_DELAY);
      continue;
    }

    const advancedResult = applyAdvancedReductions(candidatesMap);
    if (advancedResult.contradiction) {
      return { success: false, modifications, candidatesMap };
    }

    if (advancedResult.progress) {
      continue;
    }

    return { success: true, modifications, candidatesMap };
  }
}

async function revertModifications(board, modifications) {
  if (modifications.length === 0) return;
  for (let i = modifications.length - 1; i >= 0; i -= 1) {
    const { row, col } = modifications[i];
    board[row][col] = 0;
    updateSingleCell(row, col, '', false);
    await sleep(BACKTRACK_DELAY);
  }
}

function isSolved(board) {
  return board.every((row) => row.every((value) => value !== 0));
}

function selectNextCell(board, candidatesMap) {
  let best = null;
  let bestCandidates = null;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0) continue;
      let candidates;
      if (candidatesMap) {
        const candidateSet = candidatesMap[row][col];
        if (!candidateSet) {
          return null;
        }
        candidates = Array.from(candidateSet);
      } else {
        candidates = getCandidates(board, row, col);
      }
      if (!candidates || candidates.length === 0) {
        return null;
      }
      if (!best || candidates.length < bestCandidates.length) {
        best = { row, col };
        bestCandidates = candidates;
        if (candidates.length <= 2) {
          return { ...best, candidates: bestCandidates };
        }
      }
    }
  }

  return best ? { ...best, candidates: bestCandidates } : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function solveRecursive(board) {
  const { success, modifications, candidatesMap } = await applyDeterministic(board);

  if (!success) {
    await revertModifications(board, modifications);
    return false;
  }

  if (isSolved(board)) {
    return true;
  }

  const nextCell = selectNextCell(board, candidatesMap);
  if (!nextCell) {
    await revertModifications(board, modifications);
    return false;
  }

  const { row, col, candidates } = nextCell;

  for (const candidate of candidates) {
    board[row][col] = Number(candidate);
    updateSingleCell(row, col, candidate, true);
    await sleep(SEARCH_DELAY);

    if (await solveRecursive(board)) {
      return true;
    }

    board[row][col] = 0;
    updateSingleCell(row, col, '', false);
    await sleep(BACKTRACK_DELAY);
  }

  await revertModifications(board, modifications);
  return false;
}

function disableControls() {
  isSolving = true;
  if (solveButton) solveButton.disabled = true;
  if (clearButton) clearButton.disabled = true;
  if (exampleButton) exampleButton.disabled = true;
  if (challengeButton) challengeButton.disabled = true;
}

function enableControls() {
  isSolving = false;
  if (solveButton) solveButton.disabled = false;
  if (clearButton) clearButton.disabled = false;
  if (exampleButton) exampleButton.disabled = false;
  if (challengeButton) challengeButton.disabled = false;
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
    setStatus('未能求解当前棋盘，请检查题目是否存在矛盾或多解。', 'error');
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

function loadPuzzleFromString(puzzle) {
  if (!puzzle || puzzle.length !== GRID_SIZE * GRID_SIZE) return;
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
}

function handleLoadExample() {
  if (isSolving) return;
  const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
  loadPuzzleFromString(puzzle);
  setStatus('已加载经典示例题目，蓝色数字为原题面。', 'info');
}

function handleLoadChallenge() {
  if (isSolving) return;
  const puzzle = '000700080700080004002000000600200000150000020000006007000000300500060009010009000';
  loadPuzzleFromString(puzzle);
  setStatus('已加载高难度挑战题，试试看算法的极限！', 'info');
}

function setupEventListeners() {
  if (solveButton) solveButton.addEventListener('click', handleSolve);
  if (clearButton) clearButton.addEventListener('click', handleClear);
  if (exampleButton) exampleButton.addEventListener('click', handleLoadExample);
  if (challengeButton) challengeButton.addEventListener('click', handleLoadChallenge);
}

function updateThemeToggle(icon, text, label) {
  if (themeToggleIcon) {
    themeToggleIcon.textContent = icon;
  }
  if (themeToggleText) {
    themeToggleText.textContent = text;
  }
  if (themeToggleButton) {
    themeToggleButton.setAttribute('aria-label', label);
  }
}

function applyTheme(mode) {
  themeMode = mode;
  if (!document.body) return;

  if (mode === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    updateThemeToggle('🌙', '暗色', '当前为暗色模式，点击切换为浅色模式');
  } else if (mode === 'light') {
    document.body.setAttribute('data-theme', 'light');
    updateThemeToggle('☀️', '浅色', '当前为浅色模式，点击切换为系统默认');
  } else {
    document.body.removeAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateThemeToggle(prefersDark ? '🌙' : '☀️', '系统', `跟随系统主题（当前${prefersDark ? '暗色' : '浅色'}），点击切换为暗色模式`);
  }

  if (themeToggleButton) {
    themeToggleButton.dataset.mode = mode;
  }
}

function initThemeToggle() {
  themeToggleButton = document.getElementById('toggle-theme');
  if (!themeToggleButton) return;
  themeToggleIcon = themeToggleButton.querySelector('.toggle-icon');
  themeToggleText = themeToggleButton.querySelector('.toggle-text');

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
  } else {
    applyTheme('system');
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    if (themeMode === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else {
    mediaQuery.addListener(handleMediaChange);
  }

  themeToggleButton.addEventListener('click', () => {
    let nextMode;
    switch (themeMode) {
      case 'system':
        nextMode = 'dark';
        break;
      case 'dark':
        nextMode = 'light';
        break;
      default:
        nextMode = 'system';
        break;
    }
    applyTheme(nextMode);
    if (nextMode === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    }
  });
}

function init() {
  boardElement = document.querySelector('.sudoku-board tbody');
  statusElement = document.getElementById('status');
  solveButton = document.getElementById('solve-board');
  clearButton = document.getElementById('clear-board');
  exampleButton = document.getElementById('load-example');
  challengeButton = document.getElementById('load-challenge');

  createGrid();
  setupEventListeners();
  initThemeToggle();
  setStatus('请在棋盘中输入数字或加载示例题目。', 'info');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
