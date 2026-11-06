// Binoxxo: Regeln, logischer Löser, Lösungszähler und Rätsel-Generator.
// Läuft im Browser und in Node (für die Tests), ohne Abhängigkeiten.
//
// Ein Gitter ist ein Array mit N*N Zahlen: 0 = leer, 1 = O, 2 = X.

export const N = 10;
export const HALF = N / 2;
export const EMPTY = 0;
export const O = 1;
export const X = 2;

const other = (v) => 3 - v;

// ---------------------------------------------------------------------------
// Alle gültigen Zeilen (gleich viele O und X, nie drei gleiche nebeneinander)

function buildValidLines() {
  const lines = [];
  const line = new Array(N);
  (function rec(i, o, x) {
    if (i === N) { lines.push(line.slice()); return; }
    for (const v of [O, X]) {
      if (v === O ? o === HALF : x === HALF) continue;
      if (i >= 2 && line[i - 1] === v && line[i - 2] === v) continue;
      line[i] = v;
      rec(i + 1, o + (v === O), x + (v === X));
    }
  })(0, 0, 0);
  return lines;
}

export const VALID_LINES = buildValidLines();

// ---------------------------------------------------------------------------
// Zeilen/Spalten als Index-Listen

export const ROWS = [];
export const COLS = [];
for (let i = 0; i < N; i++) {
  ROWS.push(Array.from({ length: N }, (_, j) => i * N + j));
  COLS.push(Array.from({ length: N }, (_, j) => j * N + i));
}
// Jede "Linie" mit ihrer Gruppe (Zeilen werden nur mit Zeilen verglichen usw.)
const LINES = [...ROWS.map((c) => ({ cells: c, group: ROWS })), ...COLS.map((c) => ({ cells: c, group: COLS }))];

const read = (grid, cells) => cells.map((i) => grid[i]);
const isFull = (vals) => vals.every((v) => v !== EMPTY);
const sameLine = (a, b) => a.every((v, i) => v === b[i]);

// ---------------------------------------------------------------------------
// Regelprüfung

/** Findet Felder, die gegen eine Regel verstoßen (unabhängig von der Lösung). */
export function ruleViolations(grid) {
  const bad = new Set();
  for (const { cells, group } of LINES) {
    const vals = read(grid, cells);
    for (let k = 0; k + 2 < N; k++) {
      if (vals[k] && vals[k] === vals[k + 1] && vals[k] === vals[k + 2]) {
        bad.add(cells[k]); bad.add(cells[k + 1]); bad.add(cells[k + 2]);
      }
    }
    for (const v of [O, X]) {
      if (vals.filter((x) => x === v).length > HALF) cells.forEach((c, k) => vals[k] === v && bad.add(c));
    }
    if (isFull(vals)) {
      for (const otherCells of group) {
        if (otherCells === cells) continue;
        if (sameLine(vals, read(grid, otherCells))) cells.forEach((c) => bad.add(c));
      }
    }
  }
  return bad;
}

/** Ist das Gitter vollständig und regelkonform? */
export function isSolved(grid) {
  return grid.every((v) => v !== EMPTY) && ruleViolations(grid).size === 0;
}

// ---------------------------------------------------------------------------
// Logische Schlussregeln für eine einzelne Linie
//
// Stufe 1 (einfach): Zweier-Regel (XX -> O daneben), Lücken-Regel (X_X -> O),
//   Zähl-Regel (5 X vorhanden -> Rest O). Prüft für jedes leere Feld, ob ein
//   Zeichen sofort eine Regel bricht.
// Stufe 2 (fortgeschritten): Alle noch möglichen gültigen Belegungen der Linie
//   werden betrachtet, inkl. "keine zwei gleichen Linien". Felder, die in
//   allen Möglichkeiten gleich sind, stehen fest. Das ist reine Logik
//   innerhalb einer Linie, aber für Menschen deutlich anspruchsvoller.

function basicLine(vals) {
  const out = [];
  const count = { [O]: 0, [X]: 0 };
  for (const v of vals) if (v) count[v]++;
  for (let i = 0; i < N; i++) {
    if (vals[i]) continue;
    const ok = [O, X].filter((v) => {
      if (count[v] >= HALF) return false;
      if (i >= 2 && vals[i - 1] === v && vals[i - 2] === v) return false;
      if (i + 2 < N && vals[i + 1] === v && vals[i + 2] === v) return false;
      if (i >= 1 && i + 1 < N && vals[i - 1] === v && vals[i + 1] === v) return false;
      return true;
    });
    if (ok.length === 0) return null; // Widerspruch
    if (ok.length === 1) out.push([i, ok[0]]);
  }
  return out;
}

/**
 * Erklärt in Worten, warum ein leeres Feld mit den Grundregeln feststeht.
 * Gibt { value, text } zurück oder null, wenn die Grundregeln nicht reichen.
 */
export function explainCell(grid, idx) {
  const r = Math.floor(idx / N), c = idx % N;
  const sym = (v) => (v === O ? 'O' : 'X');
  const lines = [
    { cells: ROWS[r], k: c, name: `Zeile ${r + 1}`, before: 'Links', after: 'rechts', side: 'daneben' },
    { cells: COLS[c], k: r, name: `Spalte ${c + 1}`, before: 'Darüber', after: 'darunter', side: 'darüber oder darunter' },
  ];
  for (const { cells, k, name, before, after, side } of lines) {
    const v = read(grid, cells);
    if (v[k] !== EMPTY) return null;
    for (const s of [O, X]) {
      const res = `→ hier ${sym(other(s))}.`;
      if ((k >= 2 && v[k - 1] === s && v[k - 2] === s) || (k + 2 < N && v[k + 1] === s && v[k + 2] === s)) {
        return { value: other(s), text: `${name}: ${side} schon zwei ${sym(s)} ${res}` };
      }
      if (k >= 1 && k + 1 < N && v[k - 1] === s && v[k + 1] === s) {
        return { value: other(s), text: `${name}: ${before} und ${after} ${sym(s)} ${res}` };
      }
      if (v.filter((x) => x === s).length === HALF) {
        return { value: other(s), text: `${name} hat schon fünf ${sym(s)} → Rest ${sym(other(s))}.` };
      }
    }
  }
  return null;
}

function advancedLine(vals, fullOthers) {
  let common = null;
  for (const cand of VALID_LINES) {
    let match = true;
    for (let i = 0; i < N; i++) if (vals[i] && vals[i] !== cand[i]) { match = false; break; }
    if (!match) continue;
    if (fullOthers.some((o) => sameLine(o, cand))) continue;
    if (common === null) common = cand.slice();
    else for (let i = 0; i < N; i++) if (common[i] !== cand[i]) common[i] = EMPTY;
  }
  if (common === null) return null; // Widerspruch
  const out = [];
  for (let i = 0; i < N; i++) if (!vals[i] && common[i]) out.push([i, common[i]]);
  return out;
}

function deduceLine(grid, { cells, group }, level) {
  const vals = read(grid, cells);
  if (level === 1) return basicLine(vals);
  const fullOthers = [];
  for (const oc of group) {
    if (oc === cells) continue;
    const ov = read(grid, oc);
    if (isFull(ov)) fullOthers.push(ov);
  }
  return advancedLine(vals, fullOthers);
}

/**
 * Alle Felder, die im aktuellen Zustand in einem Schritt logisch eindeutig
 * bestimmbar sind. Liefert Map(index -> Wert) oder null bei Widerspruch.
 */
export function deducibleCells(grid, level = 2) {
  const found = new Map();
  for (const line of LINES) {
    const res = deduceLine(grid, line, level);
    if (res === null) return null;
    for (const [k, v] of res) {
      const idx = line.cells[k];
      if (found.has(idx) && found.get(idx) !== v) return null;
      found.set(idx, v);
    }
  }
  return found;
}

/**
 * Löst rein logisch (ohne Raten). maxLevel 1 = nur einfache Regeln,
 * 2 = auch fortgeschrittene. Gibt zurück, ob gelöst wurde und welche Stufe
 * nötig war.
 */
export function logicSolve(start, maxLevel = 2, { minParallel = 1 } = {}) {
  const grid = start.slice();
  let levelUsed = 0;
  let steps = 0;
  // narrow = es gab eine Runde, in der weniger als minParallel Felder
  // gleichzeitig bestimmbar waren ("Nadel im Heuhaufen")
  let narrow = false;
  for (;;) {
    const empty = grid.filter((v) => v === EMPTY).length;
    if (empty === 0) {
      return { grid, solved: ruleViolations(grid).size === 0, contradiction: false, levelUsed, steps, narrow };
    }
    let progressed = false;
    for (let level = 1; level <= maxLevel && !progressed; level++) {
      const found = deducibleCells(grid, level);
      if (found === null) return { grid, solved: false, contradiction: true, levelUsed, steps, narrow };
      if (found.size > 0) {
        if (found.size < Math.min(minParallel, empty)) narrow = true;
        for (const [i, v] of found) grid[i] = v;
        levelUsed = Math.max(levelUsed, level);
        steps++;
        progressed = true;
      }
    }
    if (!progressed) return { grid, solved: false, contradiction: false, levelUsed, steps, narrow };
  }
}

// ---------------------------------------------------------------------------
// Lösungszähler / Zufallslösung per Backtracking (Zeile für Zeile)

function searchRows(givens, { limit = 2, random = null } = {}) {
  const candidates = ROWS.map((cells) => {
    const vals = read(givens, cells);
    const list = VALID_LINES.filter((l) => l.every((v, i) => !vals[i] || vals[i] === v));
    return random ? shuffle(list.slice(), random) : list;
  });
  const rows = [];
  const solutions = [];
  const colO = new Array(N).fill(0);
  const colX = new Array(N).fill(0);

  function fits(line, r) {
    for (let c = 0; c < N; c++) {
      const v = line[c];
      if (v === O ? colO[c] >= HALF : colX[c] >= HALF) return false;
      if (r >= 2 && rows[r - 1][c] === v && rows[r - 2][c] === v) return false;
    }
    return !rows.some((prev) => prev === line);
  }

  function colsDistinct() {
    const seen = new Set();
    for (let c = 0; c < N; c++) {
      let key = '';
      for (let r = 0; r < N; r++) key += rows[r][c];
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  (function rec(r) {
    if (solutions.length >= limit) return;
    if (r === N) {
      if (colsDistinct()) solutions.push(rows.flat());
      return;
    }
    for (const line of candidates[r]) {
      if (!fits(line, r)) continue;
      rows.push(line);
      for (let c = 0; c < N; c++) line[c] === O ? colO[c]++ : colX[c]++;
      rec(r + 1);
      for (let c = 0; c < N; c++) line[c] === O ? colO[c]-- : colX[c]--;
      rows.pop();
      if (solutions.length >= limit) return;
    }
  })(0);
  return solutions;
}

/** Zählt Lösungen (bis höchstens limit). */
export function countSolutions(givens, limit = 2) {
  return searchRows(givens, { limit }).length;
}

/** Alle Lösungen bis limit (für Tests nützlich). */
export function findSolutions(givens, limit = 2) {
  return searchRows(givens, { limit });
}

// ---------------------------------------------------------------------------
// Zufall (mit optionalem Seed für reproduzierbare Tests)

export function makeRandom(seed = Date.now() ^ (Math.random() * 2 ** 32)) {
  let s = seed >>> 0;
  return () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomSolution(random = makeRandom()) {
  return searchRows(new Array(N * N).fill(EMPTY), { limit: 1, random })[0];
}

// ---------------------------------------------------------------------------
// Generator

export const DIFFICULTIES = {
  easy:   { label: 'Leicht', maxLevel: 1, minGivens: 46, minParallel: 1, requireAdvanced: false },
  medium: { label: 'Mittel', maxLevel: 1, minGivens: 0,  minParallel: 3, requireAdvanced: false },
  hard:   { label: 'Schwer', maxLevel: 2, minGivens: 0,  minParallel: 1, requireAdvanced: true },
};

/**
 * Erzeugt ein Rätsel mit genau einer Lösung, das rein logisch lösbar ist.
 *  - leicht: nur einfache Regeln nötig, viele Vorgaben
 *  - mittel: nur einfache Regeln nötig, wenige Vorgaben (wie in der Zeitung,
 *    ca. 27). Zu jedem Zeitpunkt sind mindestens 3 Felder mit den einfachen
 *    Regeln bestimmbar, man muss also nie das eine einzige Feld suchen.
 *  - schwer: braucht fortgeschrittene Schlüsse, möglichst wenige Vorgaben
 */
export function generatePuzzle(difficulty = 'medium', random = makeRandom()) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error('Unbekannte Schwierigkeit: ' + difficulty);

  for (let attempt = 0; attempt < 50; attempt++) {
    const solution = randomSolution(random);
    const puzzle = solution.slice();
    let givens = N * N;
    const order = shuffle([...puzzle.keys()], random);

    for (const idx of order) {
      if (givens <= cfg.minGivens) break;
      puzzle[idx] = EMPTY;
      const r = logicSolve(puzzle, cfg.maxLevel, { minParallel: cfg.minParallel });
      if (r.solved && !r.narrow) givens--;
      else puzzle[idx] = solution[idx];
    }

    if (cfg.requireAdvanced && logicSolve(puzzle, 1).solved) continue;
    // Absicherung: Eindeutigkeit unabhängig vom logischen Löser prüfen.
    if (countSolutions(puzzle, 2) !== 1) continue;

    return { puzzle, solution, difficulty, givens };
  }
  throw new Error('Kein Rätsel gefunden');
}
