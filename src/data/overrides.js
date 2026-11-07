export var OVERRIDES = {
  // Water: Ebb (freeze the enemy)
  "Otter-Penguin": { tags: ["ebb"], acts: [{ k: "delay", n: 1, on: "strike" }] },
  "Giant Koi": { tags: ["ebb"], acts: [{ k: "delay", n: 1, on: "play" }] },
  // Earth: Ramp (bank energy, big creatures)
  "Saber-Tooth Moose-Lion": { tags: ["ramp"] },
  "Rebellious Captives": { tags: ["ramp"], acts: [{ k: "energy", n: 1, on: "guard" }] },
  // Fire: Blaze (Firebending and Prowess)
  "Fire Nation Cadets": { tags: ["blaze"], keywords: { firebending: 1 } },
  "Boar-q-pine": { tags: ["blaze"], keywords: { prowess: true } },
  // Air: Gust (make Gusts)
  "Avatar Enthusiasts": { tags: ["gust"], acts: [{ k: "gust", n: 1, on: "play" }] },
  "Yip Yip!": { tags: ["gust"], acts: [{ k: "gust", n: 2, on: "play" }] },
  // Spirit: Drain (lifesteal and healing)
  "Hog-Monkey": { tags: ["drain"], keywords: { lifelink: true } },
  "Merchant of Many Hats": { tags: ["drain"], acts: [{ k: "heal", n: 3, on: "strike" }] }
};
