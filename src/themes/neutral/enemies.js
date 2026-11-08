import { ruleOf } from "../../engine/encounters.js";

// The neutral theme's enemies. Each slot has the same stats, patterns and rules as the Avatar
// slot it replaces, so a neutral run is exactly as hard; only the names and texts are new.
export var NEUTRAL_ROSTERS = {
  1: [
    { id: "n_bandit", name: "Road Bandit", armor: 0, trait: null, pattern: ["strike"] },
    { id: "n_boar_rider", name: "Boar Rider", armor: 4, trait: null, pattern: ["strike", "fortify"] },
    { id: "n_cutthroat", name: "Cutthroat", armor: 0, trait: "enrage", pattern: ["strike", "charge"] },
    { id: "n_militia", name: "Militia Sergeant", armor: 0, trait: null, pattern: ["strike", "strike", "charge"] },
    { id: "n_ghoul", name: "Hungry Ghoul", armor: 0, trait: "heal", pattern: ["strike"] },
    { id: "n_cave_spider", name: "Cave Spider", armor: 0, trait: null, pattern: ["charge", "strike"] }
  ],
  2: [
    { id: "n_hexer", name: "Hedge Hexer", armor: 0, trait: null, pattern: ["strike", "hex"] },
    { id: "n_dune_raider", name: "Dune Raider", armor: 6, trait: null, pattern: ["flurry:2", "fortify"] },
    { id: "n_pit_fighter", name: "Pit Fighter", armor: 0, trait: null, pattern: ["charge", "strike"] },
    { id: "n_wasp_swarm", name: "Wasp Swarm", armor: 0, trait: null, pattern: ["flurry:3"] },
    { id: "n_gate_warden", name: "Gate Warden", armor: 0, trait: null, pattern: ["fortify", "strike"] },
    { id: "n_mole", name: "Burrowing Mole", armor: 0, trait: null, pattern: ["strike", "charge"] }
  ],
  3: [
    { id: "n_royal_guard", name: "Royal Guard", armor: 0, trait: null, pattern: ["strike", "fortify", "charge"] },
    { id: "n_jailer", name: "Jailer", armor: 0, trait: null, pattern: ["flurry:2", "strike"] },
    { id: "n_battle_mage", name: "Battle Mage", armor: 0, trait: null, pattern: ["charge", "flurry:2"] },
    { id: "n_shade", name: "Shade", armor: 0, trait: null, pattern: ["hex", "strike"] },
    { id: "n_siege_kite", name: "Siege Kite", armor: 0, trait: null, pattern: ["charge"] },
    { id: "n_iron_golem", name: "Iron Golem", armor: 10, trait: null, pattern: ["strike", "fortify"] }
  ]
};
export var NEUTRAL_ELITES = {
  1: [
    { id: "n_war_wagon", name: "War Wagon", armor: 0, trait: null, rule: ruleOf("half_fire_block", "Red cards give half Block"), pattern: ["strike", "charge"] },
    { id: "n_river_serpent", name: "River Serpent", armor: 0, trait: null, pattern: ["charge", "strike", "strike"] },
    { id: "n_crossbow", name: "Crossbow Squad", armor: 0, trait: null, pattern: ["flurry:3", "fortify", "strike"] }
  ],
  2: [
    { id: "n_hermit", name: "Mountain Hermit", armor: 0, trait: null, rule: ruleOf("earth_cost_up", "Green cards cost +1"), pattern: ["charge", "strike"] },
    { id: "n_spymaster", name: "The Spymaster", armor: 0, trait: null, rule: ruleOf("first_card_no_score", "First card each turn: pay costs; keep play/chain/keyword Flow and tracking, but no damage, Block, other effects, Power or card-triggered Charm bonuses"), pattern: ["hex", "strike", "flurry:2"] },
    { id: "n_archivist", name: "The Archivist", armor: 0, trait: null, rule: ruleOf("draw_hp", "Each card drawn beyond 5 in a turn costs 2 HP"), pattern: ["strike", "charge"] }
  ],
  3: [
    { id: "n_bombardier", name: "The Bombardier", armor: 0, trait: null, pattern: ["charge", "charge", "strike"] },
    { id: "n_eclipse_knight", name: "Eclipse Knight", armor: 0, trait: null, rule: ruleOf("fire_half", "Red cards deal half damage"), pattern: ["flurry:3", "fortify", "strike"] },
    { id: "n_twin_blades", name: "Twin Blades", armor: 0, trait: null, pattern: ["hex", "flurry:3"] }
  ]
};
export var NEUTRAL_BOSSES = {
  1: {
    id: "n_toll_knight",
    name: "The Toll Knight",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "fortify"],
    phases: [{ atHpPct: 0.5, rule: ruleOf("water_needs_spirit", "The bridge is sealed: Blue cards deal no damage until you play a Black card") }]
  },
  2: {
    id: "n_mirror_witch",
    name: "The Mirror Witch",
    armor: 0,
    trait: null,
    pattern: ["strike", "fortify", "lightning"],
    copyJoker: true,
    rule: ruleOf("azula_copy", "The witch mirrors you: her next attack gains +1 damage per 2 peak Flow this turn. Lightning ignores half your Block")
  },
  3: {
    id: "n_ashen_king",
    name: "The Ashen King",
    armor: 0,
    trait: null,
    pattern: ["strike", "charge", "flurry:2"],
    phases: [{ atHpPct: 0.5, rule: ruleOf("comet", "The ash falls: enemy hits \xD71.25, and your most-played colour costs +1"), pattern: ["charge", "flurry:3", "strike"] }]
  }
};
