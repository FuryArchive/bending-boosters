var FLOORS = 15;
var WIDTH = 4;
var FIXED = { 1: "fight", 8: "treasure", 14: "rest", 15: "boss" };
var WEIGHTS = [["fight", 45], ["event", 20], ["elite", 15], ["rest", 13], ["shop", 8], ["treasure", 5]];
var idOf = (book, floor, col) => `b${book}f${floor}n${col}`;
function carve(rng, walks) {
  const cells = Array.from({ length: FLOORS - 1 }, () => /* @__PURE__ */ new Set()), edges = /* @__PURE__ */ new Set();
  for (let w = 0; w < walks; w++) {
    let c = rng.int(WIDTH);
    cells[0].add(c);
    for (let f = 0; f < FLOORS - 2; f++) {
      const offs = rng.shuffle([-1, 0, 1]);
      let moved = false;
      for (const o of offs) {
        const n = c + o;
        if (n < 0 || n >= WIDTH) continue;
        if (o !== 0 && edges.has(`${f}:${n}>${c}`)) continue;
        edges.add(`${f}:${c}>${n}`);
        c = n;
        cells[f + 1].add(c);
        moved = true;
        break;
      }
      if (!moved) {
        edges.add(`${f}:${c}>${c}`);
        cells[f + 1].add(c);
      }
    }
  }
  return { cells, edges };
}
export function generateBook(book, rng) {
  let g, walks = 6;
  for (; ; ) {
    g = carve(rng, walks);
    if (g.cells.slice(1).every((s) => s.size >= 3) || walks > 30) break;
    walks++;
  }
  const floors = g.cells.map((s, f) => [...s].sort((a, b) => a - b).map((col) => ({ id: idOf(book, f + 1, col), floor: f + 1, col, type: null, next: [] })));
  for (const e of g.edges) {
    const [, f, c, n] = e.match(/^(\d+):(\d+)>(\d+)$/).map(Number);
    const node = floors[f].find((x) => x.col === c), id = idOf(book, f + 2, n);
    if (!node.next.includes(id)) node.next.push(id);
  }
  const boss = { id: idOf(book, FLOORS, 0), floor: FLOORS, col: 0, type: "boss", next: [] };
  floors.push([boss]);
  for (const n of floors[FLOORS - 2]) n.next = [boss.id];
  for (const fl of floors) for (const n of fl) n.next.sort();
  const parents = {};
  for (const fl of floors) for (const n of fl) for (const id of n.next) (parents[id] || (parents[id] = [])).push(n);
  const allowed = (n, t) => {
    if (t === "elite" && n.floor < 5) return false;
    if (t === "rest" && (n.floor === FLOORS - 2 || (parents[n.id] || []).some((p) => p.type === "rest"))) return false;
    return true;
  };
  const roll = () => {
    let r = rng.next() * WEIGHTS.reduce((s, w) => s + w[1], 0);
    for (const [t, w] of WEIGHTS) {
      if ((r -= w) < 0) return t;
    }
    return "fight";
  };
  for (const fl of floors) for (const n of fl) {
    if (FIXED[n.floor]) {
      n.type = FIXED[n.floor];
      continue;
    }
    let t = "fight";
    for (let i = 0; i < 10; i++) {
      const c = roll();
      if (allowed(n, c)) {
        t = c;
        break;
      }
    }
    n.type = t;
  }
  const mid = floors.flat().filter((n) => n.floor >= 5 && n.floor <= 13);
  let shops = floors.flat().filter((n) => n.type === "shop");
  while (shops.length > 3) {
    shops.pop().type = "fight";
  }
  if (!shops.length) {
    const fights = mid.filter((n) => n.type === "fight");
    (fights.length ? fights[rng.int(fights.length)] : mid[rng.int(mid.length)]).type = "shop";
  }
  return { book, floors };
}
export function nodeById(map, id) {
  for (const fl of map.floors) for (const n of fl) if (n.id === id) return n;
  return null;
}
export function startNodes(map) {
  return map.floors[0].map((n) => n.id);
}
