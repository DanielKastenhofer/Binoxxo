import { N, EMPTY, O, X, DIFFICULTIES, generatePuzzle, deducibleCells, isSolved } from './binoxxo.js';

const STORAGE_KEY = 'binoxxo-state-v1';

const SVG = {
  [O]: '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38"/></svg>',
  [X]: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M16 16 84 84M84 16 16 84"/></svg>',
};
const NAME = { [EMPTY]: 'leer', [O]: 'O', [X]: 'X' };

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const statusEl = $('status');
const levelEl = $('level');
const timerEl = $('timer');

// --- Spielstand -------------------------------------------------------------
// state = { difficulty, puzzle[], solution[], grid[], history[[idx, vorher]], solved, elapsed (ms) }
let state = load();
let marks = { hint: new Set(), error: new Set() };

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && s.puzzle?.length === N * N && s.grid?.length === N * N && s.solution?.length === N * N) return s;
  } catch { /* ignorieren */ }
  return null;
}

function save() {
  commitClock();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* voll/privat */ }
}

function newGame(difficulty) {
  const { puzzle, solution } = generatePuzzle(difficulty);
  state = { difficulty, puzzle, solution, grid: puzzle.slice(), history: [], solved: false, elapsed: 0 };
  runStart = null;
  startClock();
  clearMarks();
  save();
  render();
  setStatus('');
}

// --- Timer -----------------------------------------------------------------
// Läuft nur, solange die App sichtbar ist und das Rätsel nicht gelöst ist.
let runStart = null;

const now = () => Date.now();
function elapsedNow() {
  return (state?.elapsed || 0) + (runStart ? now() - runStart : 0);
}
function commitClock() {
  if (!state) return;
  if (runStart) { const t = now(); state.elapsed = (state.elapsed || 0) + (t - runStart); runStart = t; }
}
function startClock() {
  if (state && !state.solved && !runStart && document.visibilityState === 'visible') runStart = now();
  renderTimer();
}
function stopClock() {
  commitClock();
  runStart = null;
  renderTimer();
}
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
function renderTimer() {
  if (!state) return;
  timerEl.textContent = formatTime(elapsedNow());
  timerEl.classList.toggle('done', !!state.solved);
}
setInterval(renderTimer, 500);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startClock();
  else { stopClock(); save(); }
});
window.addEventListener('pagehide', () => save());

// --- Farbschema ---------------------------------------------------------------
const THEME_KEY = 'binoxxo-theme';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('btn-theme').textContent = theme === 'light' ? '🌙' : '☀️';
  $('btn-theme').setAttribute('aria-label', theme === 'light' ? 'Dunkel einschalten' : 'Hell einschalten');
  $('meta-theme').setAttribute('content', theme === 'light' ? '#eef1f6' : '#12161f');
}
$('btn-theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(THEME_KEY, next); } catch { /* egal */ }
  applyTheme(next);
});
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

// --- Darstellung ------------------------------------------------------------
const cells = [];
function buildBoard() {
  for (let i = 0; i < N * N; i++) {
    const el = document.createElement('div');
    const r = Math.floor(i / N), c = i % N;
    el.className = `cell r${r} c${c}`;
    el.dataset.idx = i;
    el.setAttribute('role', 'gridcell');
    boardEl.appendChild(el);
    cells.push(el);
  }
}

function render() {
  const { puzzle, grid, solved } = state;
  for (let i = 0; i < N * N; i++) {
    const el = cells[i];
    const v = grid[i];
    if (el._v !== v) { el.innerHTML = v ? SVG[v] : ''; el._v = v; }
    el.classList.toggle('given', puzzle[i] !== EMPTY);
    el.classList.toggle('hint', marks.hint.has(i));
    el.classList.toggle('error', marks.error.has(i));
    el.setAttribute('aria-label', `Zeile ${Math.floor(i / N) + 1}, Spalte ${(i % N) + 1}: ${NAME[v]}`);
  }
  boardEl.classList.toggle('solved', solved);
  levelEl.textContent = DIFFICULTIES[state.difficulty]?.label ?? '';
  $('btn-undo').disabled = state.history.length === 0;
  $('btn-hint').disabled = solved;
  $('btn-check').disabled = solved;
}

let statusTimer;
function setStatus(text, kind = '', ms = 0) {
  clearTimeout(statusTimer);
  statusEl.textContent = text;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
  if (ms) statusTimer = setTimeout(() => setStatus(''), ms);
}

function clearMarks() {
  marks = { hint: new Set(), error: new Set() };
}

// --- Spielzüge --------------------------------------------------------------
function tap(idx) {
  if (state.solved || state.puzzle[idx] !== EMPTY) return;
  const prev = state.grid[idx];
  const next = (prev + 1) % 3; // leer -> O -> X -> leer
  state.grid[idx] = next;
  state.history.push([idx, prev]);
  afterChange();
}

function undo() {
  const step = state.history.pop();
  if (!step) return;
  state.grid[step[0]] = step[1];
  afterChange();
}

function reset() {
  state.grid = state.puzzle.slice();
  state.history = [];
  afterChange();
  setStatus('Rätsel ist wieder im Startzustand.', 'info', 3000);
}

function afterChange() {
  clearMarks();
  setStatus('');
  const wasSolved = state.solved;
  state.solved = isSolved(state.grid);
  if (state.solved && !wasSolved) stopClock();
  if (!state.solved && wasSolved) startClock();
  save();
  render();
  renderTimer();
  if (state.solved && !wasSolved) celebrate();
}

function wrongCells() {
  const wrong = new Set();
  state.grid.forEach((v, i) => { if (v !== EMPTY && v !== state.solution[i]) wrong.add(i); });
  return wrong;
}

function check() {
  clearMarks();
  const wrong = wrongCells();
  if (wrong.size === 0) {
    const open = state.grid.filter((v) => v === EMPTY).length;
    setStatus(`Kein Fehler. Noch ${open} Felder frei.`, 'ok', 4000);
  } else {
    marks.error = wrong;
    setStatus(wrong.size === 1 ? '1 Feld ist falsch (rot markiert).' : `${wrong.size} Felder sind falsch (rot markiert).`, 'bad');
  }
  render();
}

function hint() {
  clearMarks();
  if (wrongCells().size > 0) {
    render();
    setStatus('Es ist schon ein Fehler im Gitter. Drück auf „Prüfen“, um ihn zu finden.', 'bad');
    return;
  }
  const found = deducibleCells(state.grid, 2);
  if (!found || found.size === 0) {
    render();
    setStatus('Gerade lässt sich kein Feld sicher bestimmen.', 'info', 4000);
    return;
  }
  marks.hint = new Set(found.keys());
  render();
  setStatus(found.size === 1 ? 'Das leuchtende Feld lässt sich jetzt sicher bestimmen.' : `Die ${found.size} leuchtenden Felder lassen sich jetzt sicher bestimmen.`, 'info');
}

function celebrate() {
  const label = DIFFICULTIES[state.difficulty]?.label ?? '';
  $('solved-text').textContent = `Du hast das Rätsel (${label}) in ${formatTime(state.elapsed || 0)} gelöst.`;
  openDialog('dlg-solved');
}

// --- Dialoge ----------------------------------------------------------------
function openDialog(id) {
  const dlg = $(id);
  dlg.hidden = false;
  if (id === 'dlg-new') {
    dlg.querySelectorAll('[data-difficulty]').forEach((b) =>
      b.classList.toggle('current', b.dataset.difficulty === state?.difficulty));
  }
}
function closeDialogs() {
  document.querySelectorAll('.overlay').forEach((d) => (d.hidden = true));
}

document.querySelectorAll('.overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-close]')) closeDialogs();
  });
});

document.querySelectorAll('[data-difficulty]').forEach((b) =>
  b.addEventListener('click', () => {
    closeDialogs();
    setStatus('Neues Rätsel wird erstellt …', 'info');
    // kurz warten, damit der Dialog sichtbar schließt
    setTimeout(() => newGame(b.dataset.difficulty), 30);
  }));

$('btn-hint').addEventListener('click', hint);
$('btn-check').addEventListener('click', check);
$('btn-undo').addEventListener('click', undo);
$('btn-reset').addEventListener('click', () => openDialog('dlg-reset'));
$('btn-reset-ok').addEventListener('click', () => { closeDialogs(); reset(); });
$('btn-new').addEventListener('click', () => openDialog('dlg-new'));
$('btn-solved-new').addEventListener('click', () => { closeDialogs(); openDialog('dlg-new'); });

// --- Eingabe aufs Spielfeld ---------------------------------------------------
// Touch wird direkt verarbeitet (preventDefault): jeder einzelne Tipp zählt
// sofort, iOS kann keinen Doppeltipp-Zoom auslösen.
let touch = null;
boardEl.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) { touch = null; return; }
  const t = e.changedTouches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('.cell');
  touch = el ? { el, x: t.clientX, y: t.clientY } : null;
  if (el && !el.classList.contains('given')) el.classList.add('pressed');
}, { passive: true });

boardEl.addEventListener('touchmove', (e) => {
  if (!touch) return;
  const t = e.changedTouches[0];
  if (Math.hypot(t.clientX - touch.x, t.clientY - touch.y) > 20) {
    touch.el.classList.remove('pressed');
    touch = null;
  }
}, { passive: true });

boardEl.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!touch) return;
  touch.el.classList.remove('pressed');
  tap(Number(touch.el.dataset.idx));
  touch = null;
}, { passive: false });

boardEl.addEventListener('touchcancel', () => {
  touch?.el.classList.remove('pressed');
  touch = null;
});

// Maus (Computer)
boardEl.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (el) tap(Number(el.dataset.idx));
});

// Sicherheitsnetz gegen Zoom-Gesten in iOS
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

// --- Start ------------------------------------------------------------------
buildBoard();
if (state) {
  render();
  startClock();
} else {
  newGame('easy');
  setStatus('Tippe ein Feld an: leer → O → X → leer.', 'info', 6000);
}

// Offline-Betrieb und Updates: Bei jedem Öffnen wird nach einer neuen Version
// gesucht. Ist eine da, lädt die App sich einmal neu (Spielstand bleibt).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    save();
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
