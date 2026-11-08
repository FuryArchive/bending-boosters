import { registerMechanic } from "./engine/mechanics.js";
import { registerSet } from "./engine/sets.js";
import { TLA_MECHANICS } from "./sets/tla/mechanics.js";
import { TLA_SET } from "./sets/tla/set.js";

// The sets, mechanics and themes this build ships. This is the only module that registers
// content; the content modules themselves export plain data.
registerSet(TLA_SET);
for (const m of TLA_MECHANICS) registerMechanic(m);
export var CONTENT = { sets: [TLA_SET], mechanics: TLA_MECHANICS };
