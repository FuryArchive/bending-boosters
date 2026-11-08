import { NEUTRAL_BOSSES, NEUTRAL_ELITES, NEUTRAL_ROSTERS } from "./enemies.js";
import { NEUTRAL_EVENTS } from "./events.js";

// The neutral theme: mixed-set runs (and any run whose theme this build doesn't know).
var neutralAct = (b, info) => ({ el: "Neutral", ...info, roster: NEUTRAL_ROSTERS[b], elites: NEUTRAL_ELITES[b], boss: NEUTRAL_BOSSES[b] });
export var NEUTRAL_THEME = {
  id: "neutral",
  name: "Neutral",
  colours: {
    Air: { name: "White", short: "White", hex: "#f2c46d" },
    Water: { name: "Blue", short: "Blue", hex: "#5aa7e0" },
    Spirit: { name: "Black", short: "Black", hex: "#9a7bd1" },
    Fire: { name: "Red", short: "Red", hex: "#e8543a" },
    Earth: { name: "Green", short: "Green", hex: "#6fa356" },
    Neutral: { name: "Colourless", short: "Colourless", hex: "#b9ab95" }
  },
  books: {
    1: neutralAct(1, {
      kicker: "Act I", title: "The Road", places: "Crossroads, Mill Town, the Old Bridge", bossName: "The Toll Knight",
      hue: ["#c9c4d8", "#34364a", "#0c0d14"],
      backdrop: { sky: "#1b1e2a", horizon: "#3d4052", far: "#2c3040", near: "#1a1d29", moon: "#d6d0c0", mote: "#d8d3c4", drift: 1 }
    }),
    2: neutralAct(2, {
      kicker: "Act II", title: "The Wilds", places: "Thornwood, the Sunken Fen, the High Pass", bossName: "The Mirror Witch",
      hue: ["#a9d0b8", "#21402f", "#08130d"],
      backdrop: { sky: "#14211f", horizon: "#34463f", far: "#26372f", near: "#15241f", moon: "#c9d3b5", mote: "#c2d0b0", drift: 1 }
    }),
    3: neutralAct(3, {
      kicker: "Act III", title: "The Citadel", places: "The Outer Wall, the Undercroft, the Throne of Ash", bossName: "The Ashen King",
      hue: ["#f0b39a", "#5a2420", "#170708"],
      backdrop: { sky: "#24171a", horizon: "#53373a", far: "#3c282c", near: "#26181c", moon: "#e2c3a0", mote: "#e0b28c", drift: 2 }
    })
  },
  events: NEUTRAL_EVENTS,
  enemyArt: {
    n_bandit: "soldier", n_boar_rider: "beast", n_cutthroat: "bender", n_militia: "soldier", n_ghoul: "spirit", n_cave_spider: "beast",
    n_war_wagon: "machine", n_river_serpent: "beast", n_crossbow: "archer", n_toll_knight: "boss",
    n_hexer: "soldier", n_dune_raider: "archer", n_pit_fighter: "bender", n_wasp_swarm: "beast", n_gate_warden: "soldier", n_mole: "beast",
    n_hermit: "bender", n_spymaster: "soldier", n_archivist: "spirit", n_mirror_witch: "boss",
    n_royal_guard: "soldier", n_jailer: "soldier", n_battle_mage: "bender", n_shade: "spirit", n_siege_kite: "machine", n_iron_golem: "machine",
    n_bombardier: "bender", n_eclipse_knight: "bender", n_twin_blades: "bender", n_ashen_king: "boss"
  },
  text: { book: "Act", books: "Acts", element: "colour", surge: "Convergence", surgeHint: "White, Blue, Red and Green in one turn" },
  names: {
    charm: { pai_sho_pro: "Practice Dummy", cabbage_cart: "Merchant's Cart", glider_staff: "Wind Staff", cosmic_fire: "Comet Shard" },
    offering: { mend: "Healing Draught", purify: "Cleansing Rite", tide_turn: "Turning Ink", focus: "Focus Stone" },
    tag: { team: "Teamwork" }
  }
};
