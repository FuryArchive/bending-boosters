import { registerSet } from "./engine/sets.js";
import { TLA_SET } from "./sets/tla/set.js";

// The sets, mechanics and themes this build ships. This is the only module that registers
// content; the content modules themselves export plain data.
registerSet(TLA_SET);
export var CONTENT = { sets: [TLA_SET] };
