import { BOOK_BOSSES, BOOK_ROSTERS, BOSS_NAMES, ELITES } from "./enemies.js";
import { EVENTS } from "./events.js";

// The Avatar theme: what a TLA-only run looks like and meets.
var avatarBook = (b, info) => ({ ...info, bossName: BOSS_NAMES[b], roster: BOOK_ROSTERS[b], elites: ELITES[b], boss: BOOK_BOSSES[b] });
export var AVATAR_THEME = {
  id: "avatar",
  name: "Avatar",
  colours: {
    Air: { name: "Air Nomads", short: "Air", hex: "#f2c46d" },
    Water: { name: "Water Tribe", short: "Water", hex: "#5aa7e0" },
    Spirit: { name: "Spirit", short: "Spirit", hex: "#9a7bd1" },
    Fire: { name: "Fire Nation", short: "Fire", hex: "#e8543a" },
    Earth: { name: "Earth Kingdom", short: "Earth", hex: "#6fa356" },
    Neutral: { name: "Neutral", short: "Neutral", hex: "#b9ab95" }
  },
  books: {
    1: avatarBook(1, {
      kicker: "Book One", title: "Water", el: "Water", places: "Southern Water Tribe, Kyoshi Island, Northern Water Tribe",
      hue: ["#8fd0ff", "#123a5c", "#06121e"],
      backdrop: { sky: "#10202e", horizon: "#2d4d59", far: "#253e4c", near: "#152b38", moon: "#b8d2cf", mote: "#bcd9de", drift: 1 }
    }),
    2: avatarBook(2, {
      kicker: "Book Two", title: "Earth", el: "Earth", places: "Omashu, the Si Wong Desert, Ba Sing Se",
      hue: ["#b8e08a", "#2a4418", "#0a1206"],
      backdrop: { sky: "#172821", horizon: "#425442", far: "#30483a", near: "#1c342b", moon: "#cdd0a1", mote: "#c8d3a6", drift: 1 }
    }),
    3: avatarBook(3, {
      kicker: "Book Three", title: "Fire", el: "Fire", places: "The Fire Nation islands, the Boiling Rock, Sozin's Comet",
      hue: ["#ffb07a", "#6a1a0c", "#1a0604"],
      backdrop: { sky: "#291f25", horizon: "#66473b", far: "#49383a", near: "#302b32", moon: "#e8c291", mote: "#e6a66f", drift: 2 }
    })
  },
  events: EVENTS,
  enemyArt: {
    fn_soldier: "soldier", navy_marine: "soldier", elite_guard: "soldier", warden: "soldier", omashu_guard: "soldier", dai_li: "soldier", long_feng: "soldier",
    lieutenant: "bender", pirate: "bender", rumble_brawler: "bender", king_bumi: "bender", ty_lee_mai: "bender", combustion_man: "bender", eclipse_azula: "bender",
    kemurikage: "spirit", hungry_spirit: "spirit", wan_shi_tong: "spirit",
    komodo_rider: "beast", canyon_crawler: "beast", unagi: "beast", buzzard_wasp: "beast", tunnel_badger: "beast",
    zuko_ship: "machine", war_balloon: "machine", mecha_tank: "machine",
    yuyan: "archer", sand_raider: "archer",
    zhao: "boss", azula_catacombs: "boss", ozai: "boss"
  },
  text: { book: "Book", books: "Books", element: "element", surge: "Avatar State", surgeHint: "All four bending elements in one turn", victory: "The Phoenix King falls" },
  names: { charm: {}, offering: {}, tag: { team: "Team Avatar" } }
};
