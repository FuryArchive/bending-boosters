import { registerCharms } from "./data/jokers.js";
import { registerMechanic } from "./engine/mechanics.js";
import { registerSet } from "./engine/sets.js";
import { registerTheme } from "./engine/themes.js";
import { AVATAR_LEGENDS } from "./sets/tla/legends.js";
import { TLA_MECHANICS } from "./sets/tla/mechanics.js";
import { TLA_SET } from "./sets/tla/set.js";
import { AVATAR_THEME } from "./sets/tla/theme.js";
import { NEUTRAL_THEME } from "./themes/neutral/theme.js";

// The sets, mechanics and themes this build ships. This is the only module that registers
// content; the content modules themselves export plain data.
registerSet(TLA_SET);
for (const m of TLA_MECHANICS) registerMechanic(m);
registerCharms(AVATAR_LEGENDS);
registerTheme(AVATAR_THEME);
registerTheme(NEUTRAL_THEME);
export var CONTENT = { sets: [TLA_SET], mechanics: TLA_MECHANICS, themes: [AVATAR_THEME, NEUTRAL_THEME], charms: AVATAR_LEGENDS };
