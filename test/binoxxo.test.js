import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  N, EMPTY, O, X, VALID_LINES, ROWS, COLS, DIFFICULTIES,
  ruleViolations, isSolved, logicSolve, deducibleCells,
  countSolutions, findSolutions, randomSolution, generatePuzzle, makeRandom, explainCell,
} from '../js/binoxxo.js';

const parse = (s) => s.replace(/\s+/g, '').split('').map((c) => (c === 'O' ? O : c === 'X' ? X : EMPTY));

// Eine gültige, vollständige Lösung.
const SOLVED = parse(`
  XOXOXOOXXO
  OXXOXXOXOO
  XOOXOXXOOX
  OXXOXOOXXO
  XOOXOXOOXX
  XXOXOOXXOO
  OXXOXOXOOX
  XOOXOXOXXO
  OXOXXOXOOX
  OOXOOXXOXX
`);

function assertValidSolution(grid) {
  assert.equal(grid.length, N * N);
  assert.ok(grid.every((v) => v === O || v === X), 'alle Felder gefüllt');
  for (const lines of [ROWS, COLS]) {
    const keys = new Set();
    for (const cells of lines) {
      const vals = cells.map((i) => grid[i]);
      assert.equal(vals.filter((v) => v === O).length, N / 2, 'gleich viele O und X');
      for (let k = 0; k + 2 < N; k++) {
        assert.ok(!(vals[k] === vals[k + 1] && vals[k] === vals[k + 2]), 'keine drei gleichen');
      }
      keys.add(vals.join(''));
    }
    assert.equal(keys.size, N, 'keine zwei gleichen Linien');
  }
}

test('gültige Linien: 84 Stück, alle regelkonform', () => {
  assert.equal(VALID_LINES.length, 84);
  for (const l of VALID_LINES) {
    assert.equal(l.filter((v) => v === O).length, 5);
    assert.ok(!/111|222/.test(l.join('')));
  }
});

test('Regelprüfung erkennt eine korrekte Lösung', () => {
  assertValidSolution(SOLVED);
  assert.ok(isSolved(SOLVED));
  assert.equal(ruleViolations(SOLVED).size, 0);
});

test('Regelprüfung findet drei gleiche, Überzahl und doppelte Linien', () => {
  const g = new Array(N * N).fill(EMPTY);
  g[0] = g[1] = g[2] = X;
  assert.deepEqual([...ruleViolations(g)].sort((a, b) => a - b), [0, 1, 2]);

  const h = new Array(N * N).fill(EMPTY);
  [0, 3, 6, 9, 4, 7].forEach((c) => (h[c] = O)); // 6 O in Zeile 0
  assert.equal(ruleViolations(h).size, 6);

  const dup = SOLVED.slice();
  for (let c = 0; c < N; c++) dup[N + c] = dup[c]; // Zeile 1 = Zeile 0
  assert.ok(ruleViolations(dup).size > 0);
  assert.ok(!isSolved(dup));
});

test('einfache Schlüsse: Zweier, Lücke, Zählen', () => {
  const g = new Array(N * N).fill(EMPTY);
  g[1] = g[2] = X;           // XX -> O links und rechts
  g[10 + 3] = g[10 + 5] = O; // O_O -> X in der Mitte (Zeile 1)
  const d = deducibleCells(g, 1);
  assert.equal(d.get(0), O);
  assert.equal(d.get(3), O);
  assert.equal(d.get(14), X);

  const c = new Array(N * N).fill(EMPTY);
  [0, 2, 4, 6, 8].forEach((k) => (c[20 + k] = X)); // 5 X in Zeile 2
  const d2 = deducibleCells(c, 1);
  for (const k of [1, 3, 5, 7, 9]) assert.equal(d2.get(20 + k), O);
});

test('Hinweis-Funktion meldet Widerspruch statt Hinweisen', () => {
  const g = new Array(N * N).fill(EMPTY);
  g[0] = g[1] = g[2] = O;
  assert.equal(deducibleCells(g), null);
});

test('Lösungszähler: volle Lösung = 1, leeres Gitter > 1', () => {
  assert.equal(countSolutions(SOLVED), 1);
  assert.equal(countSolutions(new Array(N * N).fill(EMPTY)), 2);
  const broken = SOLVED.slice();
  broken[0] = broken[0] === X ? O : X;
  assert.equal(countSolutions(broken), 0);
});

test('logischer Löser löst ein Rätsel mit nur einer leeren Stelle', () => {
  const g = SOLVED.slice();
  g[55] = EMPTY;
  const r = logicSolve(g);
  assert.ok(r.solved);
  assert.deepEqual(r.grid, SOLVED);
});

test('Zufallslösungen sind gültig und verschieden', () => {
  const rnd = makeRandom(42);
  const a = randomSolution(rnd);
  const b = randomSolution(rnd);
  assertValidSolution(a);
  assertValidSolution(b);
  assert.notDeepEqual(a, b);
});

for (const difficulty of Object.keys(DIFFICULTIES)) {
  test(`Generator (${DIFFICULTIES[difficulty].label}): eindeutig, logisch lösbar, passt zur Lösung`, () => {
    const rnd = makeRandom(1234);
    for (let i = 0; i < 15; i++) {
      const { puzzle, solution, givens } = generatePuzzle(difficulty, rnd);
      assertValidSolution(solution);
      assert.equal(puzzle.filter((v) => v !== EMPTY).length, givens);
      // Vorgaben stimmen mit der Lösung überein
      puzzle.forEach((v, i2) => v && assert.equal(v, solution[i2]));
      // genau eine Lösung (Backtracking, unabhängig vom logischen Löser)
      const sols = findSolutions(puzzle, 2);
      assert.equal(sols.length, 1);
      assert.deepEqual(sols[0], solution);
      // rein logisch lösbar, ohne Raten
      const maxLevel = DIFFICULTIES[difficulty].maxLevel;
      const r = logicSolve(puzzle, maxLevel);
      assert.ok(r.solved, 'logisch lösbar');
      assert.deepEqual(r.grid, solution);
      if (difficulty === 'hard') assert.ok(!logicSolve(puzzle, 1).solved, 'schwer braucht mehr als einfache Regeln');
    }
  });
}

test('Schwierigkeitsstufen unterscheiden sich in der Zahl der Vorgaben', () => {
  const rnd = makeRandom(7);
  const avg = (d) => {
    let s = 0;
    for (let i = 0; i < 8; i++) s += generatePuzzle(d, rnd).givens;
    return s / 8;
  };
  const e = avg('easy'), m = avg('medium'), h = avg('hard');
  assert.ok(e > m && m > h, `leicht ${e} > mittel ${m} > schwer ${h}`);
});

test('Mittel hat wenige Vorgaben wie in der Zeitung (ca. 27)', () => {
  const rnd = makeRandom(11);
  let sum = 0;
  for (let i = 0; i < 20; i++) sum += generatePuzzle('medium', rnd).givens;
  const avg = sum / 20;
  assert.ok(avg >= 21 && avg <= 30, `Durchschnitt ${avg}`);
});

test('Mittel: in jeder Runde sind mindestens 3 Felder mit Grundregeln bestimmbar', () => {
  const rnd = makeRandom(21);
  for (let i = 0; i < 15; i++) {
    const { puzzle } = generatePuzzle('medium', rnd);
    const r = logicSolve(puzzle, 1, { minParallel: 3 });
    assert.ok(r.solved && !r.narrow);
  }
});

test('Hinweis mit Grundregeln findet von jedem richtigen Zwischenstand aus ein Feld', () => {
  const rnd = makeRandom(5);
  const { puzzle, solution } = generatePuzzle('medium', rnd);
  const g = puzzle.slice();
  // zufällige richtige Felder eintragen, dann muss es immer einen Hinweis geben
  for (let k = 0; k < 40; k++) {
    const empty = g.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) break;
    const found = deducibleCells(g, 1);
    assert.ok(found && found.size > 0);
    for (const [i, v] of found) assert.equal(v, solution[i]);
    const pick = empty[Math.floor(rnd() * empty.length)];
    g[pick] = solution[pick];
  }
});

test('Erklärung: jedes Grundregel-Feld bekommt eine passende Begründung', () => {
  const rnd = makeRandom(8);
  for (let n = 0; n < 10; n++) {
    const { puzzle } = generatePuzzle('medium', rnd);
    const found = deducibleCells(puzzle, 1);
    for (const [i, v] of found) {
      const e = explainCell(puzzle, i);
      assert.ok(e, 'Begründung vorhanden');
      assert.equal(e.value, v);
      assert.match(e.text, /^(Zeile|Spalte) \d+/);
    }
  }
  const g = new Array(N * N).fill(EMPTY);
  g[1] = g[2] = X;
  assert.equal(explainCell(g, 0).text, 'Zeile 1: daneben schon zwei X → hier O.');
  g[20] = g[40] = O;
  assert.equal(explainCell(g, 30).text, 'Spalte 1: Darüber und darunter O → hier X.');
});

test('Generator ist mit Seed reproduzierbar', () => {
  const a = generatePuzzle('medium', makeRandom(99));
  const b = generatePuzzle('medium', makeRandom(99));
  assert.deepEqual(a.puzzle, b.puzzle);
});
