import { ruleOf } from "../../engine/encounters.js";

// The Avatar theme's enemies: Book rosters, elites and bosses.
export var BOOK_ROSTERS = {
  1: [
    { id: "fn_soldier", name: "Fire Nation Soldier", armor: 0, trait: null, pattern: ["strike"] },
    { id: "komodo_rider", name: "Komodo Rhino Rider", armor: 4, trait: null, pattern: ["strike", "fortify"] },
    { id: "pirate", name: "Waterbender Pirate", armor: 0, trait: "enrage", pattern: ["strike", "charge"] },
    { id: "navy_marine", name: "Fire Navy Marine", armor: 0, trait: null, pattern: ["strike", "strike", "charge"] },
    { id: "hungry_spirit", name: "Hungry Spirit", armor: 0, trait: "heal", pattern: ["strike"] },
    { id: "canyon_crawler", name: "Canyon Crawler", armor: 0, trait: null, pattern: ["charge", "strike"] }
  ],
  2: [
    { id: "dai_li", name: "Dai Li Agent", armor: 0, trait: null, pattern: ["strike", "hex"] },
    { id: "sand_raider", name: "Sandbender Raider", armor: 6, trait: null, pattern: ["flurry:2", "fortify"] },
    { id: "rumble_brawler", name: "Earth Rumble Brawler", armor: 0, trait: null, pattern: ["charge", "strike"] },
    { id: "buzzard_wasp", name: "Buzzard-Wasp", armor: 0, trait: null, pattern: ["flurry:3"] },
    { id: "omashu_guard", name: "Omashu Guard", armor: 0, trait: null, pattern: ["fortify", "strike"] },
    { id: "tunnel_badger", name: "Tunnel Badger", armor: 0, trait: null, pattern: ["strike", "charge"] }
  ],
  3: [
    { id: "elite_guard", name: "Fire Nation Elite Guard", armor: 0, trait: null, pattern: ["strike", "fortify", "charge"] },
    { id: "warden", name: "Boiling Rock Warden", armor: 0, trait: null, pattern: ["flurry:2", "strike"] },
    { id: "lieutenant", name: "Firebender Lieutenant", armor: 0, trait: null, pattern: ["charge", "flurry:2"] },
    { id: "kemurikage", name: "Kemurikage", armor: 0, trait: null, pattern: ["hex", "strike"] },
    { id: "war_balloon", name: "War Balloon", armor: 0, trait: null, pattern: ["charge"] },
    { id: "mecha_tank", name: "Mecha Tank", armor: 10, trait: null, pattern: ["strike", "fortify"] }
  ]
};
export var ELITES = {
  1: [
    { id: "zuko_ship", name: "Prince Zuko's Warship", armor: 0, trait: null, rule: ruleOf("half_fire_block", "Fire cards give half Block"), pattern: ["strike", "charge"] },
    { id: "unagi", name: "The Unagi", armor: 0, trait: null, pattern: ["charge", "strike", "strike"] },
    { id: "yuyan", name: "Yuyan Archers", armor: 0, trait: null, pattern: ["flurry:3", "fortify", "strike"] }
  ],
  2: [
    { id: "king_bumi", name: "King Bumi", armor: 0, trait: null, rule: ruleOf("earth_cost_up", "Earth cards cost +1"), pattern: ["charge", "strike"] },
    { id: "long_feng", name: "Long Feng", armor: 0, trait: null, rule: ruleOf("first_card_no_score", "First card each turn: pay costs; keep play/chain/keyword Flow and tracking, but no damage, Block, other effects, Power or card-triggered Joker bonuses"), pattern: ["hex", "strike", "flurry:2"] },
    { id: "wan_shi_tong", name: "Wan Shi Tong", armor: 0, trait: null, rule: ruleOf("draw_hp", "Each card drawn beyond 5 in a turn costs 2 HP"), pattern: ["strike", "charge"] }
  ],
  3: [
    { id: "combustion_man", name: "Combustion Man", armor: 0, trait: null, pattern: ["charge", "charge", "strike"] },
    { id: "eclipse_azula", name: "Solar Eclipse Azula", armor: 0, trait: null, rule: ruleOf("fire_half", "Fire cards deal half damage"), pattern: ["flurry:3", "fortify", "strike"] },
    { id: "ty_lee_mai", name: "Ty Lee & Mai", armor: 0, trait: null, pattern: ["hex", "flurry:3"] }
  ]
};
export var BOOK_BOSSES = {
  1: {
    id: "zhao",
    name: "Admiral Zhao",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "fortify"],
    phases: [{ atHpPct: 0.5, rule: ruleOf("water_needs_spirit", "The Moon Spirit is threatened: Water cards deal no damage until you play a Spirit card") }]
  },
  2: {
    id: "azula_catacombs",
    name: "Azula (Crystal Catacombs)",
    armor: 0,
    trait: null,
    pattern: ["strike", "fortify", "lightning"],
    copyJoker: true,
    rule: ruleOf("azula_copy", "Azula mirrors you: her next attack gains +1 damage per 2 peak Flow this turn. Lightning ignores half your Block")
  },
  3: {
    id: "ozai",
    name: "Phoenix King Ozai",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "flurry:2"],
    phases: [{ atHpPct: 0.5, rule: ruleOf("comet", "Sozin's Comet: enemy hits \xD71.25, and your most-played element costs +1"), pattern: ["charge", "flurry:3", "strike"] }]
  }
};
export var BOSS_NAMES = { 1: "Admiral Zhao", 2: "Azula", 3: "Phoenix King Ozai" };
