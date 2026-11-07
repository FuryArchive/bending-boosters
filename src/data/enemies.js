var HP_BASE = 135;
var ATK_BASE = 9;
var FLOOR_G = 1.05;
var FLOOR_A = 1.0205;
var BOSS_HP_BOOK = { 1: 2.5, 2: 2, 3: 1.8 };
var ELITE_HP = 1.35;
var ELITE_ATK = 1.15;
var BOSS_ATK = 1.25;
var BOSS_CD = 1;
var NORMAL_CD = 1;
var R = (id, text) => ({ id, text });
var BOOK_ROSTERS = {
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
var ELITES = {
  1: [
    { id: "zuko_ship", name: "Prince Zuko's Warship", armor: 0, trait: null, rule: R("half_fire_block", "Fire cards give half Block"), pattern: ["strike", "charge"] },
    { id: "unagi", name: "The Unagi", armor: 0, trait: null, pattern: ["charge", "strike", "strike"] },
    { id: "yuyan", name: "Yuyan Archers", armor: 0, trait: null, pattern: ["flurry:3", "fortify", "strike"] }
  ],
  2: [
    { id: "king_bumi", name: "King Bumi", armor: 0, trait: null, rule: R("earth_cost_up", "Earth cards cost +1"), pattern: ["charge", "strike"] },
    { id: "long_feng", name: "Long Feng", armor: 0, trait: null, rule: R("first_card_no_score", "First card each turn: pay costs; keep play/chain/keyword Flow and tracking, but no damage, Block, other effects, Power or card-triggered Joker bonuses"), pattern: ["hex", "strike", "flurry:2"] },
    { id: "wan_shi_tong", name: "Wan Shi Tong", armor: 0, trait: null, rule: R("draw_hp", "Each card drawn beyond 5 in a turn costs 2 HP"), pattern: ["strike", "charge"] }
  ],
  3: [
    { id: "combustion_man", name: "Combustion Man", armor: 0, trait: null, pattern: ["charge", "charge", "strike"] },
    { id: "eclipse_azula", name: "Solar Eclipse Azula", armor: 0, trait: null, rule: R("fire_half", "Fire cards deal half damage"), pattern: ["flurry:3", "fortify", "strike"] },
    { id: "ty_lee_mai", name: "Ty Lee & Mai", armor: 0, trait: null, pattern: ["hex", "flurry:3"] }
  ]
};
var BOOK_BOSSES = {
  1: {
    id: "zhao",
    name: "Admiral Zhao",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "fortify"],
    phases: [{ atHpPct: 0.5, rule: R("water_needs_spirit", "The Moon Spirit is threatened: Water cards deal no damage until you play a Spirit card") }]
  },
  2: {
    id: "azula_catacombs",
    name: "Azula (Crystal Catacombs)",
    armor: 0,
    trait: null,
    pattern: ["strike", "fortify", "lightning"],
    copyJoker: true,
    rule: R("azula_copy", "Azula mirrors you: her next attack gains +1 damage per 2 peak Flow this turn. Lightning ignores half your Block")
  },
  3: {
    id: "ozai",
    name: "Phoenix King Ozai",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "flurry:2"],
    phases: [{ atHpPct: 0.5, rule: R("comet", "Sozin's Comet: enemy hits \xD71.25, and your most-played element costs +1"), pattern: ["charge", "flurry:3", "strike"] }]
  }
};
var BOSS_NAMES = { 1: "Admiral Zhao", 2: "Azula", 3: "Phoenix King Ozai" };
var runFloor = (book, floor) => (book - 1) * 15 + floor;
var normalHp = (n) => Math.round(HP_BASE * FLOOR_G ** (n - 1));
var normalAtk = (n) => Math.round(ATK_BASE * FLOOR_A ** (n - 1));
export function enemyForNode(run, node, rng) {
  const book = Math.min(3, Math.max(1, run.book)), n = runFloor(book, node.floor);
  const hp = normalHp(n), atk = normalAtk(n);
  if (node.type === "boss") {
    const b = BOOK_BOSSES[book];
    return { ...structuredClone(b), hp: Math.round(hp * BOSS_HP_BOOK[book]), atk: Math.round(atk * BOSS_ATK), countdown: BOSS_CD, boss: true, elite: false, bossName: BOSS_NAMES[book] };
  }
  if (node.type === "elite") {
    return { ...structuredClone(rng.pick(ELITES[book])), hp: Math.round(hp * ELITE_HP), atk: Math.round(atk * ELITE_ATK), countdown: NORMAL_CD, boss: false, elite: true };
  }
  return { ...structuredClone(rng.pick(BOOK_ROSTERS[book])), hp, atk, countdown: NORMAL_CD, boss: false, elite: false };
}
