// A theme is the look and content of a run: names, Books, enemies, events and flavour text.
// { id, name,
//   colours: { Air|Water|Spirit|Fire|Earth|Neutral: { name, short, hex } },
//   books: { 1|2|3: { kicker, title, el, places, bossName, hue: [hi, mid, lo],
//                     backdrop: { sky, horizon, far, near, moon, mote, drift },
//                     roster: enemy[], elites: enemy[], boss: enemy } },
//   events: { [id]: event },        // key order = the order events are drawn from
//   enemyArt: { [enemyId]: "soldier" | "beast" | "spirit" | "machine" | "archer" | "bender" | "boss" },
//   text: { book, books, element, surge, surgeHint, victory },
//   names: { charm: {}, offering: {}, tag: {} } }   // display renames; missing ids keep their own name
export var LEGACY_THEME = "avatar"; // every run saved before v3 is an Avatar run
export var FALLBACK_THEME = "neutral";
var THEME_LIST = [];
export function registerTheme(t) {
  if (THEME_LIST.some((x) => x.id === t.id)) throw new Error("Theme already registered: " + t.id);
  for (const b of [1, 2, 3]) if (!t.books || !t.books[b]) throw new Error(`Theme ${t.id} needs Book ${b}`);
  THEME_LIST.push(t);
  return t;
}
export var themeById = (id) => THEME_LIST.find((t) => t.id === id) || null;
export var themeIds = () => THEME_LIST.map((t) => t.id);
export function themeOf(run) {
  if (!run || !run.theme) return themeById(LEGACY_THEME);
  return themeById(run.theme) || themeById(FALLBACK_THEME) || themeById(LEGACY_THEME);
}
// Fill {Air}…{Neutral} with the theme's short colour names and {element}/{book}/{books} with its words.
var TOKEN_ELEMENTS = ["Air", "Water", "Spirit", "Fire", "Earth", "Neutral"];
export function themeText(theme, s) {
  return String(s).replace(/\{([A-Za-z]+)\}/g, (m, k) => {
    if (TOKEN_ELEMENTS.includes(k)) return theme.colours[k] ? theme.colours[k].short : k;
    if (k === "element" || k === "book" || k === "books") return theme.text[k] ?? m;
    return m;
  });
}
// "Book 2" / "Act 2": built from theme data and a clamped number, never from save strings.
export function bookLabel(run) {
  const b = Math.min(3, Math.max(1, Math.floor(+run.book) || 1));
  return `${themeOf(run).text.book} ${b}`;
}
