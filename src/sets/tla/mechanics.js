import { OVERRIDES } from "../../data/overrides.js";

// TLA's own rules: Firebending, Earthbend, Lessons, the curated card overrides and Avatar State.
var tlaAmount = (e) => typeof e[1] === "number" ? e[1] : 1;
export var TLA_MECHANICS = [
  {
    id: "firebending",
    set: "TLA",
    keyword(word, keywords) {
      const fb = word.match(/^Firebending (\d+)/);
      if (fb) keywords.firebending = +fb[1];
      else if (word === "Firebending") keywords.firebending = 1;
      else return false;
      return true;
    },
    keywordFlow: (c) => c.keywords.firebending || 0,
    text: (rc) => rc.keywords.firebending ? [`Firebending ${rc.keywords.firebending}`] : []
  },
  {
    id: "earthbend",
    set: "TLA",
    act: (e, on) => e[0] === "earth" ? { k: "block", n: 3 + 2 * tlaAmount(e), on, stone: true } : null
  },
  {
    id: "lessons",
    set: "TLA",
    prepare(card, rc) {
      rc.isLesson = /Lesson/.test(card.type || "");
    }
  },
  {
    id: "curation",
    set: "TLA",
    finish(card, rc) {
      const ov = OVERRIDES[card.name];
      if (ov) Object.assign(rc, structuredClone(ov), { keywords: { ...rc.keywords, ...ov.keywords || {} } });
    }
  },
  { id: "avatar-state", set: "TLA", surge: { els: ["Air", "Water", "Earth", "Fire"], name: "Avatar State" } }
];
