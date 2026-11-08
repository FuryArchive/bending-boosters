import { DECK_TYPES, strikeValue, toRunCard } from "../engine/cards.js";
import { hexText, intentHit, pendingCopyBonus } from "../engine/enemy.js";
import { canPlayCard, incomingDamage, modesFor, previewCard } from "../engine/flow.js";
import { cardByKey, isRunCard, setCatalog } from "../engine/catalog.js";
import { createRng } from "../engine/rng.js";
import { generateBook, nodeById } from "../engine/map.js";
import { runColours, runSets } from "../engine/pools.js";
import { COLOUR_ELEMENT, PAIRS } from "../engine/colours.js";
import { mechanicsFor } from "../engine/mechanics.js";
import { journeySets, setByCode, themeForSets } from "../engine/sets.js";
import { setupSets } from "../engine/ownership.js";
import { themeById, themeIds, themeOf, themeText } from "../engine/themes.js";
import { jokerById, jokerProgress } from "../data/jokers.js";
import { itemById } from "../data/items.js";
import { eventById } from "../engine/event-kit.js";
import {
  MIN_DECK,
  applyEvent,
  buy,
  buyUpgrade,
  eventChoices,
  removeCard,
  reroll,
  resolveSelect,
  resolveSwap,
  rest,
  sellJoker,
  takeCard,
  takeJoker,
  useOffering,
} from "../engine/nodes.js";
import {
  abandonRun,
  availableNodes,
  createRun,
  currentMap,
  deserialize,
  enterNode,
  leaveNode,
  payout,
  runEndTurn,
  runPlayCard,
  serialize,
  takeStartCharm,
} from "../engine/run.js";
import { effectLines, journeyCardHTML, tagName } from "./cardview.js";
import { fmtNum, shakeFor } from "./anim.js";
import { setSoundGate, sfx } from "./sfx.js";
import {
  banner,
  coinBurst,
  confetti,
  countUp,
  createBackdrop,
  flash,
  flyTo,
  impact,
  prefersReduced,
  shards,
  slash,
  titleCard,
  wipe,
} from "./fx.js";
import { RUN_KEY, backupLegacyRun } from "./run-store.js";
import { showTip } from "./tips.js";

var GLYPH = {
  Air: '<path d="M4 9c3-4 9-4 11 0-2-2-6-2-7 1s3 4 5 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  Water: '<path d="M10 2C7 7 5 9.5 5 12.5a5 5 0 0 0 10 0C15 9.5 13 7 10 2z" fill="currentColor"/>',
  Fire: '<path d="M10 2c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" fill="currentColor"/>',
  Earth: '<path d="M2 16 8 6l3 5 2-3 5 8z" fill="currentColor"/>',
  Spirit: '<path d="M13 3a7 7 0 1 0 4 12A6 6 0 0 1 13 3z" fill="currentColor"/>',
  Neutral: '<path d="M10 3l6 7-6 7-6-7z" fill="currentColor"/>'
};
var NODE_DESC = {
  fight: "An enemy. Win gold and pick a card.",
  elite: "A tougher enemy. Win more gold, +5 max HP, a Legend or Charm and a card.",
  shop: "Spend gold on Legends, Charms, Offerings, card packs, upgrades or card removal.",
  rest: "Heal 30% of your max HP, upgrade a card or train it.",
  event: "A story moment with a choice to make.",
  treasure: "Open a booster and keep 1 of 3 cards.",
  boss: "The {book}'s boss, with its own rules. Win to move on."
};
var COIN = '<i class="jx-coinico" aria-hidden="true"></i>';
var NODE_ICON = { fight: "\u2694", elite: "\u{1F480}", shop: "\u{1F6D2}", rest: "\u{1F525}", event: "\u2753", treasure: "\u{1F4E6}", boss: "\u{1F451}" };
var NODE_NAME = { fight: "Fight", elite: "Elite", shop: "Shop", rest: "Rest site", event: "Event", treasure: "Treasure", boss: "{book} boss" };
var TIER_COLOR = { common: "#b9ab95", uncommon: "#9cc6e8", rare: "#e8c25a", mythic: "#f07a3a" };
export function mountJourney(root, legacy) {
  const L = legacy;
  const S = L.S;
  const DEBUG = !!L.debug;
  setSoundGate(() => S.settings.sound !== false);
  setCatalog(L.BASE);
  const byKey = {};
  L.BASE.forEach((c) => {
    byKey[c.set + ":" + c.num] = c;
  });
  const st = { screen: "start", setup: null, run: null, f: null, focus: null, busy: false, speed: S.settings.jspeed || 1, introSeen: null };
  // Everything the player reads comes from the run's theme (before a run: the theme a new run gets).
  const journeyCodes = () => journeySets().map((x) => x.code);
  const startTheme = () => themeById(st.setup && st.setup.theme || themeForSets(st.setup ? st.setup.sets : journeyCodes()));
  const T = () => st.run ? themeOf(st.run) : startTheme();
  const tt = (text) => themeText(T(), text);
  const elHex = (e) => (T().colours[e] || T().colours.Neutral).hex;
  const glyph = (e, s = 18) => `<svg class="jg" viewBox="0 0 20 20" width="${s}" height="${s}" style="color:${elHex(e)}">${GLYPH[e] || GLYPH.Neutral}</svg>`;
  const bookOf = (b) => T().books[Math.min(3, Math.max(1, +b || 1))];
  const charmOf = (id) => {
    const j = jokerById(id);
    return j && { ...j, name: T().names.charm[j.id] || j.name, text: tt(j.text) };
  };
  const itemOf = (id) => {
    const it = itemById(id);
    return it && { ...it, name: T().names.offering[it.id] || it.name, text: tt(it.text) };
  };
  const runSurge = () => {
    const m = mechanicsFor(st.run ? runSets(st.run) : void 0).find((x) => x.surge);
    return m ? m.surge : null;
  };
  const flowHint = () => {
    const sg = runSurge(), t = T().text;
    return `Every card resolves at the current Flow, then raises it: +1 per card, +1 for the same ${t.element} as the last card, +1 for a rank one higher.` + (sg ? ` ${t.surgeHint}: ${t.surge}, Flow \xD72.` : "");
  };
  const tokenName = (rc) => rc.key === "TOKEN:ally" ? (T().colours[rc.elements[0]] || T().colours.Neutral).short + " Ally" : rc.name;
  root.classList.add("jx");
  const $ = (s) => root.querySelector(s);
  const setIdle = (v) => {
    root.dataset.animIdle = v ? "1" : "0";
  };
  setIdle(true);
  const bd = createBackdrop(() => !!root.offsetParent, () => prefersReduced(S));
  document.addEventListener("pointerdown", (ev) => {
    st.px = ev.clientX;
    st.py = ev.clientY;
  }, true);
  const ownership = (sets) => L.ownership ? L.ownership(sets) : { ownedKeys: [], ownedStars: {} };
  const colourNames = (run) => runColours(run).map((c) => themeOf(run).colours[COLOUR_ELEMENT[c]].name).join(" & ");
  // Run setup: sets (only when there are 2+ to choose from), then a colour pair, then a start charm.
  function setup() {
    if (!st.setup) {
      const su = setupSets({ journey: journeyCodes(), owned: L.ownedSets ? L.ownedSets() : [] });
      st.setup = { choices: su.choices, showStep: su.showStep, sets: su.selected, pair: null, theme: null };
    }
    return st.setup;
  }
  function persist() {
    if (!st.run) return false;
    if (!st.run.id) st.run.id = window.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (st.run.epoch === undefined) st.run.epoch = S.runEpoch || null;
    try {
      localStorage.setItem(RUN_KEY, serialize(st.run));
      return true;
    } catch (e) {
      return false;
    }
  }
  function loadSave() {
    try {
      const s = localStorage.getItem(RUN_KEY);
      if (s) backupLegacyRun(s);
      const run = s ? deserialize(s) : null;
      if (run && (run.epoch || null) !== (S.runEpoch || null)) {
        clearSave(); // An earlier reset already invalidated this stale second key.
        return null;
      }
      return run;
    } catch (e) {
      return null;
    }
  }
  function clearSave() {
    try {
      localStorage.removeItem(RUN_KEY);
    } catch (e) {
    }
  }
  function go() {
    const r = st.run;
    root.dataset.book = r && r.status !== "won" && r.status !== "lost" ? r.book : "";
    bd.setTheme(root.dataset.book ? T().id + ":" + root.dataset.book : "none", root.dataset.book ? bookOf(root.dataset.book).backdrop : null);
    bd.setHeat(0);
    st.screenWas = st.screen;
    if (!r) {
      renderStart();
      return enter();
    }
    persist();
    if (r.status === "won" || r.status === "lost") {
      renderSummary();
      return enter();
    }
    if (st.bookShown !== r.book && r.pending?.kind !== "start") {
      st.bookShown = r.book;
      st.cardDue = r.book;
    }
    if (r.status === "fight") {
      st.f = r.fight;
      st.focus = null;
      if (r.fight.enemy.def.boss && st.introSeen !== r.nodeId && r.fight.turn <= 1) {
        st.introSeen = r.nodeId;
        renderBossIntro(r.fight.enemy.def);
        return enter();
      }
      renderFight(true);
      return enter();
    }
    if (r.pending && r.pending.kind === "start") renderStartCharm();
    else if (r.status === "node") renderNode();
    else renderMap();
    enter();
  }
  function enter() {
    const el = root.firstElementChild;
    if (el && !prefersReduced(S)) {
      el.classList.remove("jx-enter");
      void el.offsetWidth;
      el.classList.add("jx-enter");
    }
    if (st.screenWas !== st.screen) {
      const rr = root.getBoundingClientRect();
      wipe(root, (st.px ?? rr.left + rr.width / 2) - rr.left, (st.py ?? rr.top + 200) - rr.top, S);
    }
    const r = st.run, g = $("#jxGold");
    if (r && g && st.lastGold != null && st.lastGold !== r.gold) {
      countUp(g, st.lastGold, r.gold, 600);
      if (r.gold > st.lastGold) {
        coinBurst(g, Math.min(10, 3 + Math.round((r.gold - st.lastGold) / 6)), S);
        sfx.coin();
      }
    }
    if (r && $("#jxHudHp") && st.lastHp != null && st.lastHp !== r.hp) {
      const h = $("#jxHudHp");
      h.classList.add(r.hp < st.lastHp ? "hurt" : "heal");
    }
    if (st.bumpDeck && $("#jxDeck")) {
      $("#jxDeck").classList.add("bump");
      st.bumpDeck = false;
    }
    st.lastGold = r ? r.gold : null;
    st.lastHp = r ? r.hp : null;
    if (st.cardDue) {
      bookCard(st.cardDue);
      st.cardDue = null;
    }
  }
  function bookCard(book) {
    const b = bookOf(book);
    titleCard(root, { kicker: b.kicker, title: b.title, sub: `${L.esc(b.places)}<br><span class="dim">Boss: ${L.esc(b.bossName)}</span>`, art: glyph(b.el, 72) }, S);
    sfx.page();
  }
  function renderStart() {
    showTip("journey-start");
    st.screen = "start";
    const saved = loadSave();
    if (saved && (saved.status === "lost" || saved.status === "won")) {
      st.run = saved;
      renderSummary();
      return;
    }
    root.innerHTML = `<div class="jx-start">
    <div class="jx-hero">
      <div class="jx-herotext"><h2>The Journey</h2>
        <p class="jx-lede">${tt("Three {books}, fifteen floors each. Start with a small deck in your two colours, add cards on the way, and beat each {book}'s boss.")}</p>
        <ul class="jx-how">
          <li><b>Play cards one at a time.</b> Creatures can Strike or Guard. Spells do what they say.</li>
          <li><b>Build Flow.</b> Each card resolves at the current Flow, then raises it. ${tt("Matching {element}s")} and rising ranks raise it faster, so save your best card for last.</li>
          <li><b>Read the intent.</b> The enemy attacks when you end your turn. Split your hand between Strike and Guard.</li>
        </ul></div>
      <ol class="jx-route">${[1, 2, 3].map((b) => `<li style="--bc:${elHex(bookOf(b).el)}">${glyph(bookOf(b).el, 30)}<div><b>${bookOf(b).kicker}: ${bookOf(b).title}</b><span>${L.esc(bookOf(b).places)}</span><span class="dim">Boss: ${L.esc(bookOf(b).bossName)}</span></div></li>`).join("")}</ol>
    </div>
    ${saved && (saved.status === "map" || saved.status === "node" || saved.status === "fight") ? `<div class="jx-resume" style="--bc:${elHex(themeOf(saved).books[saved.book].el)}">${glyph(themeOf(saved).books[saved.book].el, 34)}<div class="grow"><b>Run in progress</b><div class="note">${L.esc(colourNames(saved))} \xB7 ${themeOf(saved).books[saved.book].kicker}, floor ${saved.floor} of 15. ${saved.hp}/${saved.maxHp} HP, ${saved.gold} gold, ${saved.deck.length} cards.</div></div><button class="btn primary jx-big" id="jxResume">Resume run</button><button class="btn" id="jxAbandon">Abandon run</button></div>` : ""}
    ${setupHTML()}
  </div>`;
    const su = setup();
    root.querySelectorAll("[data-set]").forEach((b) => b.onclick = () => {
      const code = b.dataset.set;
      if (code === "*") su.sets = su.choices.slice();
      else if (!su.sets.includes(code)) su.sets = su.choices.filter((c) => c === code || su.sets.includes(c));
      else if (su.sets.length > 1) su.sets = su.sets.filter((c) => c !== code);
      sfx.select();
      renderStart();
    });
    root.querySelectorAll("[data-pair]").forEach((b) => b.onclick = () => {
      su.pair = b.dataset.pair;
      sfx.select();
      renderStart();
    });
    if ($("#jxTheme")) $("#jxTheme").onchange = (ev) => {
      su.theme = ev.target.value || null;
      renderStart();
    };
    $("#jxStart").onclick = () => {
      if (su.pair) startRun();
    };
    if ($("#jxResume")) {
      $("#jxResume").onclick = () => resumeSaved(saved);
      let abandonArmed = false;
      $("#jxAbandon").onclick = () => {
        const b = $("#jxAbandon");
        if (!abandonArmed) {
          abandonArmed = true;
          const label = b.textContent;
          b.textContent = `Click again to abandon (pays $${payout(saved).toFixed(2)})`;
          setTimeout(() => {
            if (abandonArmed && b.isConnected) {
              abandonArmed = false;
              b.textContent = label;
            }
          }, 3e3);
          return;
        }
        abandonArmed = false;
        st.run = abandonRun(saved);
          renderSummary();
      };
    }
  }
  function setupHTML() {
    const su = setup(), t = T(), pool = L.BASE.filter((c) => isRunCard(c) && su.sets.includes(c.set)).length;
    const arch = su.sets.length === 1 && L.pairNames && L.pairNames[su.sets[0]] || {};
    const pairName = (p) => p.split("").map((c) => t.colours[COLOUR_ELEMENT[c]].name).join(" &amp; ");
    const sets = su.showStep ? `<h3 class="jx-h">Choose your cards</h3><div class="row jx-setchips">${su.choices.map((code) => `<button class="chip${su.sets.includes(code) ? " on" : ""}" data-set="${code}">${L.esc(setByCode(code).name)}</button>`).join("")}<button class="chip${su.sets.length === su.choices.length ? " on" : ""}" data-set="*">All my sets</button></div>` : `<p class="note jx-setline">Cards from ${L.esc(setByCode(su.sets[0]).name)}</p>`;
    const pairs = PAIRS.map((p) => {
      const [a, b] = p.split("").map((c) => COLOUR_ELEMENT[c]);
      return `<button class="jx-starter jx-pair${su.pair === p ? " on" : ""}" data-pair="${p}" style="--ec:${elHex(a)};--eb:${elHex(b)}"><span class="jx-pairglyphs">${glyph(a, 34)}${glyph(b, 34)}</span><b>${L.esc(t.colours[a].name)} &amp; ${L.esc(t.colours[b].name)}</b>${arch[p] ? `<span>${L.esc(arch[p])}</span>` : ""}<span class="dim">${[...DECK_TYPES[a], ...DECK_TYPES[b]].map((x) => tagName(x, t)).join(" \xB7 ")}</span></button>`;
    }).join("");
    const theme = DEBUG ? `<label class="note jx-themesel">Theme <select id="jxTheme"><option value="">Set theme</option>${themeIds().map((id) => `<option value="${id}"${su.theme === id ? " selected" : ""}>${L.esc(themeById(id).name)}</option>`).join("")}</select></label>` : "";
    return `${sets}
    <h3 class="jx-h">Choose two colours</h3>
    <div class="jx-starters jx-pairs">${pairs}</div>
    <div class="row jx-startrow"><button class="btn primary jx-big" id="jxStart" ${su.pair ? "" : "disabled"}>${su.pair ? "Begin: " + pairName(su.pair) : "Pick two colours to begin"}</button>${theme}<span class="note">You start with 4 Strikes, 4 Defends and 2 commons of each colour. Commons are always offered. Uncommons and better appear once you own them: ${ownership(su.sets).ownedKeys.length} of ${pool} so far.</span></div>`;
  }
  function resumeSaved(saved) {
    st.run = saved;
    st.bookShown = null;
    st.lastGold = st.lastHp = null;
    go();
  }
  function startRun(seed) {
    seed = seed || (S.settings.jseedNext || Math.random().toString(36).slice(2, 8).toUpperCase());
    S.settings.jseedNext = null;
    const su = setup(), o = st.newRunOpts || { colours: su.pair.split(""), sets: su.sets, theme: su.theme || void 0 };
    st.newRunOpts = null;
    st.run = createRun({ seed, ...o, ...ownership(o.sets || runSets({})) });
    st.introSeen = null;
    st.bookShown = null;
    st.lastGold = st.lastHp = null;
    go();
  }
  const TIER_NAME = { common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic" };
  function jokerTile(id, extra = "", o = {}) {
    const j = charmOf(id), prog = o.state ? jokerProgress(j, o.state) : null;
    return `<div class="jx-joker ${o.cls || ""} t-${j.tier}" data-jid="${id}" ${extra} style="--tc:${TIER_COLOR[j.tier]}" title="${L.esc(j.text)}"><span class="jk-kind"><i class="jk-dot"></i>${TIER_NAME[j.tier]} ${j.kind === "legend" ? "legend" : "charm"}${o.stars > 1 ? " " + "\u2605".repeat(o.stars) : ""}</span><b>${L.esc(j.name)}</b><span class="jk-text">${L.esc(j.text)}</span>${prog ? `<span class="jk-prog"><b>+${prog.value}</b><i class="jk-bar"><i style="width:${prog.progress / prog.every * 100}%"></i></i>${prog.progress}/${prog.every}</span>` : ""}${o.price != null ? `<span class="jk-price${o.poor ? " poor" : ""}">${COIN} ${o.price}</span>` : ""}</div>`;
  }
  function jokerRow(r, sell, empties = true) {
    const tiles = r.jokers.map((j, i) => jokerTile(j.id, sell ? `data-sell="${i}"` : "", { cls: "slot" + (sell ? " pick sellable" : ""), state: r.jstate, stars: j.stars }));
    if (empties) for (let i = r.jokers.length; i < 5; i++) tiles.push('<div class="jx-joker emptyslot">Empty charm slot</div>');
    else if (!tiles.length) tiles.push('<div class="note">No Legends or Charms yet.</div>');
    return tiles.join("");
  }
  function renderStartCharm() {
    st.screen = "startcharm";
    const p = st.run.pending;
    root.innerHTML = `<div class="jx-between"><h2>Choose your first Charm</h2><p class="note">It sets an early direction. Legends come later, from elites, bosses and shops.</p>
    <div class="jx-offer">${p.charms.map((id, i) => jokerTile(id, `data-ci="${i}"`, { cls: "pick big" })).join("")}</div></div>`;
    root.querySelectorAll("[data-ci]").forEach((b) => b.onclick = () => {
      takeStartCharm(st.run, +b.dataset.ci);
      sfx.bell();
      go();
    });
  }
  function hud(opts = {}) {
    const r = st.run, low = r.hp / r.maxHp <= 0.3;
    return `<div class="jx-hud">
    <div class="jx-hudhp${low ? " low" : ""}" id="jxHudHp" title="Health carries over between fights"><span class="ico">\u2665</span><b>${r.hp}<small>/${r.maxHp}</small></b><div class="jx-phpbar"><i style="width:${r.hp / r.maxHp * 100}%"></i></div></div>
    <div class="jx-hudgold" title="Gold for shops this run">${COIN} <b id="jxGold">${r.gold}</b></div>
    <div class="jx-hudbook">${glyph(bookOf(r.book).el, 18)}<span>${bookOf(r.book).kicker}</span><span class="dim">Floor ${r.floor} of 15</span></div>
    <div class="jx-hudoff">${[0, 1].map((i) => r.offerings[i] ? `<button class="chip on" data-off="${i}" title="${L.esc(itemOf(r.offerings[i]).text)}. Click to use.">${L.esc(itemOf(r.offerings[i]).name)}</button>` : '<span class="chip empty" title="Offerings come from shops, treasure and events">No Offering</span>').join("")}</div>
    <button class="btn jx-deckbtn" id="jxDeck" title="See your run deck">Deck <b>${r.deck.length}</b></button>
    <span class="note jx-seed" title="The same seed gives the same maps and offers">Seed ${L.esc(r.seed)}</span>
  </div>
  <div class="jx-jokers hudrow">${jokerRow(r, opts.sell)}</div>`;
  }
  function wireHud() {
    root.querySelectorAll("[data-off]").forEach((b) => b.onclick = () => useOff(+b.dataset.off));
    const d = $("#jxDeck");
    if (d) d.onclick = () => deckModal({ title: "Your run deck" });
  }
  function useOff(slot) {
    if (st.busy) return;
    const r = st.run, id = r.offerings[slot], it = itemOf(id);
    const after = (res) => {
      if (!res.ok) {
        L.toast && L.toast(res.reason);
        return;
      }
      sfx.bell();
      persist();
      if (st.screen === "fight") {
        st.f.player.hp = r.hp;
        updatePlayer();
        renderFight(false);
      } else go();
    };
    if (!it.needs) return after(useOffering(r, slot));
    if (r.fight && id !== "focus") {
      L.toast && L.toast("Use this outside a fight");
      return;
    }
    deckModal({ title: it.name + ": " + it.text, pick: it.needs.cards, element: it.needs.element, onPick: (cards, element) => after(useOffering(r, slot, { cards, element })) });
  }
  function deckModal({ title, pick = 0, element = false, onPick, minPick = 1 }) {
    const r = st.run, o = document.createElement("div");
    o.className = "jx-modal";
    const chosen = /* @__PURE__ */ new Set();
    let el = null;
    const draw = () => {
      o.innerHTML = `<div class="jx-modalbox wide"><button class="x" aria-label="Close">\xD7</button><h2>${L.esc(title)}</h2>
      ${pick ? `<p class="note">Choose ${pick > 1 ? "up to " + pick + " cards" : "a card"}.</p>` : ""}
      ${element ? `<div class="row">${["Air", "Water", "Earth", "Fire", "Spirit"].map((e) => `<button class="chip${el === e ? " on" : ""}" data-el="${e}">${glyph(e, 14)} ${T().colours[e].short}</button>`).join("")}</div>` : ""}
      <div class="jx-deckgrid">${r.deck.map((c, i) => `<div class="jx-dcard${chosen.has(i) ? " sel" : ""}" data-di="${i}">${cardFace(c)}</div>`).join("")}</div>
      ${pick ? `<div class="row"><button class="btn primary" id="jxPickOk" ${chosen.size >= minPick && (!element || el) ? "" : "disabled"}>Confirm</button></div>` : ""}</div>`;
      o.querySelector(".x").onclick = () => o.remove();
      if (pick) {
        o.querySelectorAll("[data-di]").forEach((d) => d.onclick = () => {
          const i = +d.dataset.di;
          if (chosen.has(i)) chosen.delete(i);
          else if (chosen.size < pick) chosen.add(i);
          else if (pick === 1) {
            chosen.clear();
            chosen.add(i);
          }
          sfx.select();
          draw();
        });
        o.querySelectorAll("[data-el]").forEach((b) => b.onclick = () => {
          el = b.dataset.el;
          draw();
        });
        o.querySelector("#jxPickOk").onclick = () => {
          o.remove();
          onPick([...chosen], el);
        };
      }
    };
    o.onclick = (e) => {
      if (e.target === o) o.remove();
    };
    draw();
    root.appendChild(o);
  }
  function renderMap() {
    showTip("map");
    st.screen = "map";
    const r = st.run, map = currentMap(r), availList = availableNodes(r), avail = new Set(availList.map((n) => n.id)), path = new Set(r.path);
    const W = 540, RH = 76, H2 = 15 * RH + 70, X = (c) => 90 + c * 125, Y = (f) => H2 - 56 - (f - 1) * RH;
    const nodes = map.floors.flat(), pos = (n) => n.type === "boss" ? [W / 2 + 25, Y(15)] : [X(n.col), Y(n.floor)];
    const here = r.nodeId ? nodeById(map, r.nodeId) : null, [hx, hy] = here ? pos(here) : [W / 2 + 25, H2 - 12];
    let edges = "";
    for (const n of nodes) for (const id of n.next) {
      const m = nodeById(map, id), [x1, y1] = pos(n), [x2, y2] = pos(m);
      const cls = path.has(n.id) && path.has(id) ? "on" : n.id === r.nodeId && avail.has(id) ? "next" : n.floor <= r.floor ? "past" : "";
      const d = `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
      edges += `<path d="${d}" class="ink ${cls}"/><path d="${d}" class="${cls}"/>`;
    }
    if (!here) for (const n of availList) {
      const [x, y] = pos(n);
      edges += `<path d="M${hx} ${hy} L${x} ${y}" class="next"/>`;
    }
    const dots = nodes.map((n) => {
      const [x, y] = pos(n), big = n.type === "boss";
      const cls = [n.type, avail.has(n.id) ? "avail" : "", path.has(n.id) ? "taken" : "", n.id === r.nodeId ? "here" : "", !avail.has(n.id) && !path.has(n.id) && n.floor <= r.floor ? "gone" : ""].join(" ");
      const k = avail.has(n.id) ? availList.findIndex((a) => a.id === n.id) : 0;
      return `<g class="jx-node ${cls}" data-node="${n.id}" transform="translate(${x} ${y})"><g class="pop" style="--k:${k}">${big ? `<g class="rays">${Array.from({ length: 12 }, (_, i) => `<path d="M0 -44 L5 -60 L-5 -60Z" transform="rotate(${i * 30})"/>`).join("")}</g><text class="bossname" y="-70" text-anchor="middle">${L.esc(bookOf(r.book).bossName)}</text>` : ""}<circle class="seal" r="${big ? 38 : 24}"/><circle class="ring" r="${big ? 31 : 19}"/><text y="${big ? 11 : 7}" font-size="${big ? 30 : 20}" text-anchor="middle">${NODE_ICON[n.type]}</text></g></g>`;
    }).join("");
    const floors = Array.from({ length: 15 }, (_, i) => `<text class="fl${i + 1 === r.floor + 1 ? " now" : ""}" x="22" y="${Y(i + 1) + 5}">${i + 1}</text>`).join("");
    const lotus = `<g class="jx-lotus" id="jxLotus" style="transform:translate(${hx}px,${hy}px)"><circle r="13" class="halo"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse rx="4" ry="9" transform="rotate(${a}) translate(0 -7)"/>`).join("")}<circle r="4" class="core"/></g>`;
    const fogY = Y(Math.min(15, r.floor + 4)), fog = r.floor + 4 >= 15 ? "" : `<defs><linearGradient id="jxFog" x1="0" y1="0" x2="0" y2="${fogY}" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--bk2);stop-opacity:.82"/><stop offset=".75" style="stop-color:var(--bk2);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--bk2);stop-opacity:0"/></linearGradient></defs><rect class="jx-fog" x="0" y="0" width="${W}" height="${fogY}" fill="url(#jxFog)"/>`;
    const nextList = availList.map((n, i) => `<button class="jx-next" data-go="${n.id}"><span class="ico">${NODE_ICON[n.type]}</span><span><b>${n.type === "boss" ? L.esc(bookOf(r.book).bossName) : tt(NODE_NAME[n.type])}</b><span class="note">${tt(NODE_DESC[n.type])}</span></span><kbd>${i + 1}</kbd></button>`).join("");
    root.innerHTML = `<div class="jx-runwrap">${hud()}
    <div class="jx-mapgrid">
      <div class="jx-mapscroll" id="jxMapScroll"><svg class="jx-map" viewBox="0 0 ${W} ${H2}" width="${W}" height="${H2}">${mapPattern(r.book, W, H2)}${floors}${edges}${dots}${lotus}${fog}</svg></div>
      <aside class="jx-mapside">
        <h2>${glyph(bookOf(r.book).el, 26)} ${bookOf(r.book).kicker}: ${bookOf(r.book).title}</h2>
        <p class="note">${L.esc(bookOf(r.book).places)}. ${15 - r.floor} floors to ${L.esc(bookOf(r.book).bossName)}.</p>
        <h3 class="jx-h">Where next</h3>
        <div class="jx-nextlist">${nextList || '<p class="bad">No path forward.</p>'}</div>
        <div class="jx-nodeinfo note" id="jxNodeInfo">Hover a stop on the map to see what it holds.</div>
      </aside>
    </div></div>`;
    wireHud();
    const travel = (id) => {
      if (st.busy || st.run !== r) return;
      const n = nodeById(map, id), [x, y] = pos(n), lot = $("#jxLotus");
      sfx.step();
      st.busy = true;
      setIdle(false);
      root.querySelectorAll(".jx-node.avail, .jx-next").forEach((e) => e.classList.add("chosen-off"));
      root.querySelector(`.jx-node[data-node="${id}"]`)?.classList.add("chosen");
      if (lot && !prefersReduced(S)) {
        lot.style.transform = `translate(${x}px,${y}px)`;
        lot.classList.add("moving");
      }
      const sealEl = root.querySelector(`.jx-node[data-node="${id}"] .seal`);
      if (sealEl) setTimeout(() => { if(st.run === r) impact(sealEl, getComputedStyle(root).getPropertyValue("--bk").trim() || "#fff", false, S); }, 300);
      setTimeout(() => {
        if (st.run !== r) return;
        st.busy = false;
        setIdle(true);
        enterNode(r, id);
        go();
      }, prefersReduced(S) ? 0 : 360);
    };
    root.querySelectorAll(".jx-node.avail").forEach((g) => g.onclick = () => travel(g.dataset.node));
    root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => travel(b.dataset.go));
    const info = $("#jxNodeInfo");
    root.querySelectorAll(".jx-node, .jx-next").forEach((g) => {
      g.onmouseenter = () => {
        const n = nodeById(map, g.dataset.node || g.dataset.go);
        info.innerHTML = `<b>${NODE_ICON[n.type]} ${n.type === "boss" ? L.esc(bookOf(r.book).bossName) : tt(NODE_NAME[n.type])}</b> \xB7 floor ${n.floor}<br>${tt(NODE_DESC[n.type])}${avail.has(n.id) ? "" : '<br><span class="dim">Not reachable from where you are.</span>'}`;
        root.querySelector(`.jx-node[data-node="${n.id}"]`)?.classList.add("hl");
      };
      g.onmouseleave = () => root.querySelectorAll(".jx-node.hl").forEach((e) => e.classList.remove("hl"));
    });
    const sc = $("#jxMapScroll");
    if (sc) requestAnimationFrame(() => {
      const scale = sc.querySelector("svg").getBoundingClientRect().height / H2;
      sc.scrollTop = Math.max(0, hy * scale - sc.clientHeight * 0.62);
    });
  }
  function mapPattern(book, W, H2) {
    const motif = { 1: '<path d="M0 20 q10 -10 20 0 t20 0 t20 0" fill="none" stroke-width="2"/>', 2: '<path d="M4 34 l14 -22 l10 14 l6 -8 l12 16" fill="none" stroke-width="2"/>', 3: '<path d="M30 36 c-10 -4 -8 -16 0 -24 c2 8 10 10 8 18 c-1 4 -4 6 -8 6z" fill="none" stroke-width="2"/>' }[book];
    return `<defs><pattern id="jxPat${book}" width="60" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><g class="motif">${motif}</g></pattern></defs><rect width="${W}" height="${H2}" fill="url(#jxPat${book})" class="jx-mappat"/>`;
  }
  const cardPick = (keys, attr = "data-pick") => `<div class="jx-offer cards">${keys.map((k, i) => {
    const rc = toRunCard(cardByKey(k));
    return `<div class="jx-dcard pick" ${attr}="${i}">${cardFace(rc)}</div>`;
  }).join("")}</div>`;
  function renderNode() {
    if (st.run && st.run.pending && ["shop", "rest", "event"].includes(st.run.pending.kind)) showTip(st.run.pending.kind);
    const r = st.run, p = r.pending;
    if (!p) {
      leaveNode(r);
      return go();
    }
    st.screen = "node:" + p.kind;
    const body = { reward: nodeReward, treasure: nodeReward, pack: nodePack, shop: nodeShop, rest: nodeRest, event: nodeEvent, swap: nodeSwap, select: nodeSelect }[p.kind];
    if (!body) {
      leaveNode(r);
      return go();
    }
    root.innerHTML = `<div class="jx-runwrap">${hud({ sell: p.kind === "shop" })}<div class="jx-nodebody" data-kind="${p.kind}">${body.html(p)}</div></div>`;
    wireHud();
    body.wire(p);
  }
  const continueBtn = (label = "Continue") => `<div class="row center" style="margin-top:16px"><button class="btn primary jx-big" id="jxCont">${label}</button></div>`;
  function cont() {
    const r = st.run, p = r.pending;
    if (p && p.kind === "select") return;
    if (p && p.cards && !p.cardTaken) takeCard(r, null);
    if (r.pending && r.pending.jokers && !r.pending.jokerTaken) takeJoker(r, null);
    if (r.pending === p || !r.pending || r.pending.kind !== "swap" && r.pending.kind !== "select" && r.pending.kind !== "reward") {
      if (r.pending && r.pending.kind === "swap") return go();
      if (r.pending && r.pending.back) {
        r.pending = r.pending.back;
        return go();
      }
      if (r.status === "node") leaveNode(r);
    }
    go();
  }
  const nodeReward = {
    html: (p) => `${p.kind === "treasure" ? sceneArt("treasure") : '<div class="jx-rays"></div>'}<h2>${p.kind === "treasure" ? "Treasure" : p.gold >= 60 ? "The boss is beaten" : "Victory"}</h2>
    <div class="jx-gains">${p.gold ? `<span class="jx-goldup">${COIN} +${p.gold} gold</span>` : ""}${p.maxHpUp ? `<span class="jx-hpup">\u2665 +${p.maxHpUp} max HP</span>` : ""}${p.offering ? `<span class="jx-offup">${st.run.offerings.includes(p.offering) ? "Found" : "Left behind (slots full)"}: ${L.esc(itemOf(p.offering).name)}</span>` : ""}</div>
    ${p.cards && !p.cardTaken ? `<h3 class="jx-h">Add a card to your deck</h3>${cardPick(p.cards)}<div class="row center"><button class="btn quiet" id="jxSkipCard">Skip the card</button></div>` : p.cards ? '<p class="note">Card added to your deck.</p>' : ""}
    ${p.jokers && !p.jokerTaken ? `<h3 class="jx-h">Choose a Legend or Charm</h3><div class="jx-offer">${p.jokers.map((id, i) => jokerTile(id, `data-jk="${i}"`, { cls: "pick big" })).join("")}</div><div class="row center"><button class="btn quiet" id="jxSkipJoker">Skip it</button></div>` : ""}
    ${continueBtn()}`,
    wire(p) {
      root.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => {
        flyTo(b, $("#jxDeck"), S);
        st.bumpDeck = true;
        takeCard(st.run, +b.dataset.pick);
        sfx.deal();
        afterPick(p);
      });
      root.querySelectorAll("[data-jk]").forEach((b) => b.onclick = () => {
        flyTo(b, root.querySelector(".hudrow"), S);
        takeJoker(st.run, +b.dataset.jk);
        sfx.bell();
        afterPick(p);
      });
      const sc = $("#jxSkipCard");
      if (sc) sc.onclick = () => {
        takeCard(st.run, null);
        afterPick(p);
      };
      const sj = $("#jxSkipJoker");
      if (sj) sj.onclick = () => {
        takeJoker(st.run, null);
        afterPick(p);
      };
      $("#jxCont").onclick = cont;
    }
  };
  function afterPick(p) {
    const r = st.run;
    persist();
    if (r.pending !== p) return go();
    if ((!p.cards || p.cardTaken) && (!p.jokers || p.jokerTaken)) return cont();
    renderNode();
    enter();
  }
  const nodePack = {
    html: (p) => `<h2>${p.cards.length > 3 ? "Premium pack" : "Card pack"}</h2><p class="note">Pick one card for your run deck.</p>${cardPick(p.cards)}${continueBtn("Skip the pack")}`,
    wire(p) {
      root.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => {
        flyTo(b, $("#jxDeck"), S);
        st.bumpDeck = true;
        takeCard(st.run, +b.dataset.pick);
        sfx.deal();
        go();
      });
      $("#jxCont").onclick = () => {
        takeCard(st.run, null);
        go();
      };
    }
  };
  const price = (n, g) => `<span class="jx-price${g < n ? " poor" : ""}">${COIN} ${n}</span>`;
  const nodeShop = {
    html: (p) => {
      const r = st.run, g = r.gold;
      const item = (it, i) => {
        const d = itemOf(it.id);
        return `<div class="jx-item${it.sold ? " sold" : ""}"><b>${L.esc(d.name)}</b><span class="note">${L.esc(d.text)}</span><button class="btn" data-buy="item:${i}" ${it.sold ? "disabled" : ""}>${it.sold ? "Sold" : price(it.price, g)}</button></div>`;
      };
      return `<div class="jx-nodeheading">${sceneArt("shop")}<div><h2>Shop</h2><p class="note">${p.interest ? `You earned ${p.interest} gold interest on the way in. ` : ""}You have ${g} gold. Click a Legend or Charm in your row to sell it for half its price.</p></div></div>
      <section class="jx-shopsection"><h3 class="jx-h">Legends and Charms</h3><div class="jx-offer">${p.jokers.map((j, i) => j.sold ? '<div class="jx-joker sold"><span class="stamp">Sold</span></div>' : `<div class="jx-shopj">${jokerTile(j.id, "", { price: j.price, poor: g < j.price, cls: "big" })}<button class="btn${g >= j.price ? " primary" : ""}" data-buy="joker:${i}">${g >= j.price ? "Buy" : "Need " + (j.price - g) + " more"}</button></div>`).join("")}</div></section>
      <section class="jx-shopsection"><h3 class="jx-h">Offerings</h3><div class="jx-offer">${p.items.map(item).join("")}</div></section>
      <section class="jx-shopsection services"><h3 class="jx-h">Packs and services</h3><div class="jx-offer">
        ${p.packs.map((k, i) => `<div class="jx-item${k.sold ? " sold" : ""}"><b>${k.kind === "premium" ? "Premium pack" : "Card pack"}</b><span class="note">Pick 1 of ${k.kind === "premium" ? 5 : 3} cards for your run deck</span><button class="btn" data-buy="pack:${i}" ${k.sold ? "disabled" : ""}>${k.sold ? "Sold" : price(k.price, g)}</button></div>`).join("")}
        <div class="jx-item"><b>Upgrade a card</b><span class="note">+30% to its numbers, or a cheaper utility card</span><button class="btn" id="jxUpgrade">${price(p.upgradePrice, g)}</button></div>
        <div class="jx-item"><b>Remove a card</b><span class="note">Thin your deck. It can't go below ${MIN_DECK} cards.</span><button class="btn" id="jxRemove">${price(p.removalPrice, g)}</button></div>
        <div class="jx-item"><b>Reroll</b><span class="note">New Legends, Charms and items</span><button class="btn" id="jxReroll">${price(p.rerollPrice, g)}</button></div></div></section>
      <div class="jx-shopmsg" id="jxShopMsg" role="status"></div>${continueBtn("Leave the shop")}`;
    },
    wire(p) {
      const msg = (res, from) => {
        if (!res.ok) {
          const m = $("#jxShopMsg");
          m.innerHTML = `<span class="bad">${L.esc(res.reason)}</span>`;
          m.classList.remove("shake");
          void m.offsetWidth;
          m.classList.add("shake");
          sfx.deselect();
          return false;
        }
        if (from) flyTo(from, from.dataset.buy?.startsWith("joker") ? root.querySelector(".hudrow") : from.dataset.buy?.startsWith("pack") ? $("#jxDeck") : root.querySelector(".jx-hud"), S);
        sfx.buy();
        persist();
        go();
        return true;
      };
      root.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => {
        const [k, i] = b.dataset.buy.split(":");
        const tile2 = b.closest(".jx-shopj, .jx-item");
        if (tile2) tile2.dataset.buy = b.dataset.buy;
        msg(buy(st.run, k, +i), tile2);
      });
      $("#jxReroll").onclick = () => {
        const ok = msg(reroll(st.run));
        if (ok) sfx.page();
      };
      $("#jxUpgrade").onclick = () => {
        if (st.run.gold < p.upgradePrice) return msg({ ok: false, reason: `Not enough gold: an upgrade costs ${p.upgradePrice}` });
        deckModal({ title: "Upgrade a card", pick: 1, onPick: ([i]) => msg(buyUpgrade(st.run, i)) });
      };
      $("#jxRemove").onclick = () => {
        if (st.run.gold < p.removalPrice) return msg({ ok: false, reason: `Not enough gold: removal costs ${p.removalPrice}` });
        deckModal({ title: "Remove a card", pick: 1, onPick: ([i]) => msg(removeCard(st.run, i)) });
      };
      root.querySelectorAll("[data-sell]").forEach((b) => b.onclick = () => {
        const j = charmOf(st.run.jokers[+b.dataset.sell].id);
        if (confirm(`Sell ${j.name} for ${Math.floor(j.price / 2)} gold?`)) msg(sellJoker(st.run, +b.dataset.sell));
      });
      $("#jxCont").onclick = () => {
        leaveNode(st.run);
        go();
      };
    }
  };
  const nodeRest = {
    html: (p) => {
      const r = st.run, canUpgrade = r.deck.some((c) => !c.upgraded), canTrain = r.deck.some((c) => c.stars < 5);
      return `${sceneArt("rest")}<h2>Rest site</h2>` + (p.done ? `<p class="note">${{ heal: "You rest by the fire and recover.", train: "Your card is stronger for the rest of this run.", upgrade: "Your card is upgraded." }[p.done]}</p>${continueBtn()}` : `<p class="note">Choose one, or leave without resting.</p><div class="jx-offer">
      <button class="jx-item pick rest" data-rest="heal" ${r.hp >= r.maxHp ? "disabled" : ""}><span class="ico">\u2665</span><b>Heal</b><span class="note">${r.hp >= r.maxHp ? "You are at full HP" : `Recover ${Math.min(Math.floor(r.maxHp * 0.3), r.maxHp - r.hp)} HP (${r.hp}/${r.maxHp} now)`}</span></button>
      <button class="jx-item pick rest" data-rest="upgrade" ${canUpgrade ? "" : "disabled"}><span class="ico">\u2B06</span><b>Upgrade</b><span class="note">${canUpgrade ? "+30% to a card's numbers" : "No cards available to upgrade"}</span></button>
      <button class="jx-item pick rest" data-rest="train" ${canTrain ? "" : "disabled"}><span class="ico">\u2605</span><b>Train</b><span class="note">${canTrain ? "+1\u2605 to a card for this run (+25%), up to 5\u2605" : "No cards below 5\u2605"}</span></button></div>${continueBtn("Leave without resting")}`);
    },
    wire(p) {
      const done2 = (res) => {
        if (!res.ok) {
          L.toast && L.toast(res.reason);
          return;
        }
        sfx.bell();
        persist();
        go();
      };
      root.querySelectorAll("[data-rest]").forEach((b) => b.onclick = () => {
        const c2 = b.dataset.rest;
        if (c2 === "heal") {
          flash(root, "heal", S);
          done2(rest(st.run, "heal"));
        } else if (c2 === "train") deckModal({ title: "Train a card", pick: 1, onPick: ([i]) => done2(rest(st.run, "train", i)) });
        else deckModal({ title: "Upgrade a card", pick: 1, onPick: ([i]) => done2(rest(st.run, "upgrade", i)) });
      });
      const c = $("#jxCont");
      if (c) c.onclick = cont;
    }
  };
  const nodeEvent = {
    html: (p) => {
      const ev = eventById(st.run, p.id);
      return `${sceneArt(p.id)}<h2>${L.esc(ev.name)}</h2><p class="jx-evtext">${L.esc(ev.text)}</p>
    ${p.result ? `<p class="jx-evresult">${L.esc(p.result)}</p>${continueBtn()}` : `<div class="jx-choices">${eventChoices(st.run).map((c, i) => `<button class="btn jx-choice" data-ch="${i}" ${c.ok ? "" : "disabled"}><kbd>${i + 1}</kbd><span>${L.esc(c.label)}${c.ok ? "" : `<span class="why">${L.esc(c.why)}</span>`}</span></button>`).join("")}</div>`}`;
    },
    wire(p) {
      root.querySelectorAll("[data-ch]").forEach((b) => b.onclick = () => {
        applyEvent(st.run, +b.dataset.ch);
        sfx.bell();
        go();
      });
      const c = $("#jxCont");
      if (c) c.onclick = cont;
    }
  };
  function sceneArt(id) {
    const A = {
      treasure: '<g class="chest"><rect x="35" y="58" width="70" height="40" rx="4"/><path d="M35 72h70M70 72v12"/><g class="lid"><path d="M35 58c0-18 70-18 70 0z"/></g><g class="glow"><path d="M60 52l-8-18M70 50v-22M80 52l8-18"/></g></g>',
      rest: '<g class="fire"><path d="M40 100l60-14M40 86l60 14"/><path class="fl f1" d="M70 88c-14-8-10-24 0-40 2 10 14 16 10 30-2 6-5 10-10 10z"/><path class="fl f2" d="M60 90c-8-6-6-16 0-24 2 6 8 10 5 18z"/><path class="fl f3" d="M82 90c6-6 5-14 0-22-2 6-7 10-4 17z"/></g>',
      shop: '<g class="lanterns"><path d="M10 26 q60 18 120 0"/><g class="ln l1"><path d="M40 33v8"/><rect x="32" y="41" width="16" height="22" rx="7"/></g><g class="ln l2"><path d="M70 38v8"/><rect x="61" y="46" width="18" height="26" rx="8"/></g><g class="ln l3"><path d="M100 33v8"/><rect x="92" y="41" width="16" height="22" rx="7"/></g></g>',
      library: '<path d="M30 96h80M36 96V60h14v36M52 96V50h14v46M68 96V64h12v32M82 96l8-38 12 3-8 35"/>',
      cabbage: '<circle cx="70" cy="72" r="26"/><path d="M70 46c-10 12-10 40 0 52M70 46c10 12 10 40 0 52M46 66c14 4 34 4 48 0"/>',
      divide: '<path d="M10 100V40l30 10 14 50M130 100V36l-26 12-16 52M58 100h24"/>',
      fortune: '<path d="M30 70a14 14 0 0 1 20-14 18 18 0 0 1 34 0 14 14 0 0 1 22 14z"/><circle cx="70" cy="92" r="6"/>',
      dojo: '<path d="M70 92L40 52a40 40 0 0 1 30-10zM70 92l30-40a40 40 0 0 0-30-10"/><path d="M70 92v6"/>',
      swamp: '<path d="M70 100V58M70 70c-14-8-24-24-24-34M70 64c14-8 26-22 26-32M70 80c-10 0-20 6-26 14M70 78c10 0 22 6 28 16M20 100h100"/>',
      jasmine: '<path d="M44 66h52v8a26 26 0 0 1-52 0zM96 70c12 0 12 16 0 16"/><path class="steam" d="M60 56c-6-8 6-12 0-20M74 56c-6-8 6-12 0-20"/>',
      oasis: '<circle cx="70" cy="70" r="32"/><path d="M70 38a16 16 0 0 1 0 32 16 16 0 0 0 0 32"/><circle cx="70" cy="54" r="3"/><circle cx="70" cy="86" r="3"/>',
      fire_days: '<g class="fw"><path d="M50 50l-12-12M50 50l14-10M50 50l-4 16M50 50l12 10M50 50l-16 4"/><path d="M92 40l-10-12M92 40l12-8M92 40l-2 14M92 40l10 8M92 40l-14 2"/></g><path d="M50 100V66M92 100V56"/>',
      tunnel: '<path d="M10 100L50 40l20 18 18-24 42 66z"/><path d="M58 100v-14a12 12 0 0 1 24 0v14"/>'
    }[id];
    return A ? `<svg class="jx-scene" viewBox="0 0 140 110" aria-hidden="true">${A}</svg>` : "";
  }
  const nodeSwap = {
    html: (p) => `<h2>Your Joker row is full</h2><p class="note">Replace one of your five with <b>${L.esc(charmOf(p.incoming).name)}</b>, or leave it behind.</p>
    <div class="jx-offer">${jokerTile(p.incoming, "", { cls: "incoming" })}</div><h3>Replace\u2026</h3>
    <div class="jx-offer">${st.run.jokers.map((j, i) => jokerTile(j.id, `data-sw="${i}"`, { cls: "pick", state: st.run.jstate, stars: j.stars })).join("")}</div>${continueBtn("Leave it")}`,
    wire() {
      root.querySelectorAll("[data-sw]").forEach((b) => b.onclick = () => {
        resolveSwap(st.run, +b.dataset.sw);
        sfx.bell();
        go();
      });
      $("#jxCont").onclick = () => {
        resolveSwap(st.run, null);
        go();
      };
    }
  };
  const nodeSelect = {
    html: (p) => `<h2>${{ train: "Train cards", remove: "Let go of cards", upgrade: "Upgrade cards" }[p.action]}</h2><p class="note">Choose up to ${p.n} card${p.n > 1 ? "s" : ""}.</p>
    <div class="row" style="justify-content:center"><button class="btn primary jx-big" id="jxSelect">Choose</button></div>`,
    wire(p) {
      const fin = (arg) => {
        resolveSelect(st.run, arg);
        sfx.bell();
        go();
      };
      $("#jxSelect").onclick = () => deckModal({ title: { train: "Train (+1\u2605 each)", remove: "Remove cards", upgrade: "Upgrade cards" }[p.action], pick: p.n, minPick: 0, onPick: fin });
    }
  };
  function renderSummary() {
    st.screen = "end";
    st.busy = false;
    setIdle(true);
    const r = st.run, won2 = r.status === "won", pay = payout(r);
    const settled = !!r.paid || (persist() && !!L.settleRun && L.settleRun(r.id, pay, {
      won: won2, floor: (r.book - 1) * 15 + r.floor, bestHit: r.stats.bestHit, avatar: r.stats.avatar
    }));
    if (settled) {
      r.paid = true;
      clearSave();
    }
    if (won2) sfx.fanfare();
    else sfx.lose();
    const fl = (r.book - 1) * 15 + r.floor;
    root.innerHTML = `<div class="jx-between jx-summary ${won2 ? "won" : "lost"}">
    <h2>${won2 ? L.esc(T().text.victory) : r.abandoned ? "Run abandoned" : "Your journey ends here"}</h2>
    <p class="note">${won2 ? tt("All three {books} cleared.") : `Defeated in ${bookOf(r.book).kicker}, floor ${r.floor}.`} Seed ${L.esc(r.seed)} \xB7 ${L.esc(colourNames(r))}.</p>
    <div class="jx-payout"><span>${settled ? 'Paid to your wallet' : 'Payout pending — browser storage could not save it'}</span><b id="jxPayout">+$${pay.toFixed(2)}</b></div>
    ${settled ? '' : '<p class="note">Your run has not been cleared. Free browser storage, then retry before starting another run.</p><button class="btn primary" id="jxRetryPayout">Retry payout</button>'}
    <div class="jx-runbar" title="How far you got: ${fl} of 45 floors">${[1, 2, 3].map((b) => `<span class="seg b${b}" style="--bc:${elHex(bookOf(b).el)}"><i style="width:${Math.max(0, Math.min(15, fl - (b - 1) * 15)) / 15 * 100}%"></i></span>`).join("")}</div>
    <div class="sumTiles" style="max-width:900px">${tile("Fights won", r.stats.fights + r.stats.elites + r.stats.bosses, `${r.stats.elites} elite${r.stats.elites === 1 ? "" : "s"}, ${r.stats.bosses} boss${r.stats.bosses === 1 ? "" : "es"}`)}${tile("Best hit", fmtNum(r.stats.bestHit))}${tile("Highest Flow", "\xD7" + (r.stats.peakFlow || 1))}${tile(T().text.surge + "s", r.stats.avatar)}${tile("Deck", r.deck.length + " cards")}</div>
    <div class="jx-offer">${r.jokers.map((j) => jokerTile(j.id, "", { state: r.jstate, stars: j.stars })).join("")}</div>
    <div class="row center"><button class="btn" id="jxCopySeed">Copy seed</button><button class="btn primary jx-big" id="jxAgain" ${settled ? '' : 'disabled'}>Start a new journey</button></div></div>`;
    if ($("#jxRetryPayout")) $("#jxRetryPayout").onclick = renderSummary;
    if (settled && !prefersReduced(S)) countUp($("#jxPayout"), 0, Math.round(pay * 100), 900, (v) => "+$" + (v / 100).toFixed(2));
    if (won2) setTimeout(() => { if(st.run === r) confetti(root, ["#5aa7e0", "#6fa356", "#e8543a", "#f2c46d", "#e8b85a"], S); }, 200);
    $("#jxAgain").onclick = () => {
      st.run = null;
      renderStart();
      enter();
    };
    $("#jxCopySeed").onclick = async () => {
      try {
        await navigator.clipboard.writeText(r.seed);
        L.toast && L.toast("Seed copied");
      } catch (e) {
        L.toast && L.toast("Seed: " + r.seed);
      }
    };
  }
  function tile(k, v, s = "") {
    return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  }
  function renderBossIntro(enemy) {
    st.screen = "bossintro";
    const phases = (enemy.phases || []).map((ph) => `<div class="jx-rule">Below ${Math.round(ph.atHpPct * 100)}% HP: ${L.esc(tt(ph.rule.text))}</div>`).join("");
    root.innerHTML = `<div class="jx-bossintro"><div class="jx-bosscard"><div class="jx-bosslabel">BOSS</div><div class="jx-enemyart big">${enemyArt(enemy)}</div>
    <h2>${L.esc(enemy.name)}</h2>${enemy.rule ? `<div class="jx-rule">${L.esc(tt(enemy.rule.text))}</div>` : ""}${phases}
    <div class="note">${fmtNum(enemy.hp)} HP \xB7 attack ${enemy.atk} \xB7 grows 15% stronger after every attack</div>
    <button class="btn primary jx-big" id="jxFightBoss">Fight</button></div></div>`;
    sfx.stinger();
    $("#jxFightBoss").onclick = () => renderFight(true);
  }
  const gear = (() => {
    let d = "";
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283, r = i % 2 ? 34 : 42;
      d += (i ? "L" : "M") + (60 + Math.cos(a) * r).toFixed(1) + " " + (60 + Math.sin(a) * r).toFixed(1) + " ";
    }
    return d + "Z";
  })();
  const SIL = {
    soldier: '<path d="M24 104c8-18 64-18 72 0z"/><path d="M32 72c0-30 12-46 28-48 16 2 28 18 28 48h-8v-8c-12-8-28-8-40 0v8z"/><path class="glow" d="M42 66h36v6H42z"/><path d="M57 10h6v16h-6z"/>',
    beast: '<path d="M34 46L16 20l26 16zM86 46l18-26-26 16z"/><path d="M30 52c6-22 54-22 60 0 6 26-12 44-30 46-18-2-36-20-30-46z"/><circle class="glow" cx="47" cy="60" r="5"/><circle class="glow" cx="73" cy="60" r="5"/><path class="glow" d="M50 82l4 9 4-9zM62 82l4 9 4-9z"/>',
    spirit: '<path d="M60 16c28 12 32 52 18 82-6-10-12-8-18 6-6-14-12-16-18-6-14-30-10-70 18-82z"/><path class="glow" d="M44 54l12 6-12 4zM76 54l-12 6 12 4z"/>',
    machine: `<path d="${gear}"/><circle class="glow" cx="60" cy="60" r="12"/><circle cx="60" cy="60" r="6"/>`,
    archer: '<path d="M42 18c40 22 40 62 0 84" fill="none" stroke-width="7" class="line"/><path d="M42 18v84" class="line thin"/><path d="M30 60h66" class="line thin"/><path d="M96 60l-12-7v14z"/>',
    bender: '<path d="M60 60m-34 0a34 34 0 1 1 34 34 22 22 0 1 1-22-22 11 11 0 1 1 11 11" fill="none" stroke-width="9" class="line"/><circle class="glow" cx="60" cy="60" r="5"/>',
    boss: '<path d="M26 54l14 22 20-38 20 38 14-22-4 38H30z"/><circle class="glow" cx="60" cy="34" r="5"/><circle class="glow" cx="26" cy="52" r="4"/><circle class="glow" cx="94" cy="52" r="4"/><path class="glow" d="M38 84h44v5H38z"/>'
  };
  function enemyArt(e) {
    const [hi, mid, lo] = bookOf(st.run && st.run.book || 1).hue, arch = T().enemyArt[e.id] || "soldier", id = "eg" + e.id;
    const ring = e.boss ? "#f0c56a" : e.elite ? "#e05a4a" : hi;
    return `<svg viewBox="0 0 120 120" class="arch-${arch}"><defs><radialGradient id="${id}" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>
    <circle cx="60" cy="60" r="57" fill="url(#${id})" stroke="${ring}" stroke-width="${e.boss ? 4 : 3}"/>
    ${e.elite || e.boss ? `<circle cx="60" cy="60" r="51" fill="none" stroke="${ring}" stroke-width="1.5" stroke-dasharray="3 5" opacity=".8"/>` : ""}
    <g class="sil" style="--glow:${hi}">${SIL[arch]}</g>
    ${e.armor ? `<g transform="translate(92 92)"><path d="M0-14 12-8v8c0 8-6 13-12 16C-6 13-12 8-12 0v-8z" fill="#c9c2b6" stroke="#333"/><text y="5" text-anchor="middle" font-size="12" font-weight="900" fill="#222">${e.armor}</text></g>` : ""}</svg>`;
  }
  function renderFight(dealIn) {
    showTip("fight");
    st.screen = "fight";
    st.busy = false;
    st.focus = null;
    setIdle(true);
    const f = st.f, r = st.run, e = f.enemy;
    root.innerHTML = `<div class="jx-fight" id="jxFight">
    <div class="jx-top">
      <div class="jx-enemy${e.def.boss ? " boss" : e.def.elite ? " elite" : ""}" id="jxEnemy">
        <div class="jx-portrait"><i class="aura"></i><i class="aura two"></i><div class="jx-enemyart">${enemyArt(e.def)}</div><i class="ground"></i></div>
        <div class="jx-enemyinfo">
          <div class="row" style="gap:8px"><b class="jx-ename">${L.esc(e.def.name)}</b>${e.def.boss ? '<span class="jx-bosschip">Boss</span>' : ""}${e.def.elite ? '<span class="jx-bosschip elite">Elite</span>' : ""}${e.def.trait === "enrage" ? '<span class="jx-chip">Enrage: +2 attack each hit</span>' : ""}${e.def.trait === "heal" ? '<span class="jx-chip">Heals 6% each turn</span>' : ""}</div>
          ${f.rule ? `<div class="jx-rule small">${L.esc(tt(f.rule.text))}</div>` : ""}<div id="jxHex"></div>
          <div class="jx-hpbar"><i class="lag" id="jxHpLag"></i><i class="cur" id="jxHpCur"></i><span id="jxHpTxt"></span></div>
          <div class="jx-badges" id="jxEBadges"></div>
        </div>
        <div class="jx-intent" id="jxIntent"></div>
      </div>
      <div class="jx-progress"><span class="now">${glyph(bookOf(r.book).el, 14)} ${bookOf(r.book).kicker}, floor ${r.floor}</span><span>${COIN} ${r.gold}</span>${r.offerings.length ? `<i>\xB7</i><span>${r.offerings.map((o, i) => `<button class="chip" data-off="${i}" title="${L.esc(itemOf(o).text)}">${L.esc(itemOf(o).name)}</button>`).join(" ")}</span>` : ""}</div>
    </div>
    <div class="jx-mid">
      <div class="jx-jokers" id="jxJokers">${jokerRow(r, false, false)}</div>
      <div class="jx-flow" id="jxFlow" title="${L.esc(flowHint())}">
        <div class="jx-flowlbl">Flow</div>
        <div class="jx-flownum"><span class="x">\xD7</span><b id="jxFlowN">${f.flow}</b></div>
        <div class="jx-chain" id="jxChain"></div>
        <div class="jx-flownext" id="jxFlowNext"></div>
      </div>
      <div class="jx-powers" id="jxPowers"></div>
      <div class="jx-stage" id="jxStage"></div>
    </div>
    <div class="jx-bottom">
      <div class="jx-stats">
        <div class="jx-php" title="Your HP carries over between fights"><span class="heart">\u2665</span><div class="jx-phpbar"><i id="jxPhpBar"></i><b id="jxPhp"></b></div></div>
        <div class="jx-block" id="jxBlock" title="Block lasts until the enemy's next attack, which uses it up. Stone Block keeps half."><b>0</b><small>Block</small></div>
        <div class="jx-badges" id="jxPBadges"></div>
        <div class="jx-energy" id="jxEnergy" title="4 energy each turn. Up to 2 unspent carry over."></div>
        <div class="jx-turn" id="jxTurn"></div>
      </div>
      <div class="jx-handrow"><div class="jx-pile draw" id="jxDrawPile" title="Cards left to draw. Your discard pile is shuffled back in when it runs out."><i></i><i></i><i></i><b>0</b><span>Draw</span></div>
        <div class="jx-hand" id="jxHand"></div>
        <div class="jx-pile disc" id="jxDiscPile" title="Played cards and the rest of your hand at end of turn"><i></i><i></i><i></i><b>0</b><span>Discard</span></div></div>
      <div class="jx-controls">
        <div class="jx-seg" role="group" aria-label="Sort hand"><span class="seg-l">Sort</span><button class="seg" id="jxSortE">Element</button><button class="seg" id="jxSortC">Rank</button></div>
        <div class="jx-actions"><button class="btn jx-endturn" id="jxEnd"><span class="bl">End turn</span><span class="bv" id="jxEndSub"></span></button></div>
        <div class="jx-seg jx-speed" role="group" aria-label="Animation speed"><span class="seg-l">Speed</span>${[1, 2, 4].map((s) => `<button class="seg${st.speed === s ? " on" : ""}" data-speed="${s}" title="Animation speed">${s}\xD7</button>`).join("")}</div>
      </div>
      <div class="jx-keys note">Click the top of a card to Strike, the bottom to Guard, or drag it up or down. Keys: <kbd>1</kbd>\u2013<kbd>0</kbd> pick a card, <kbd>S</kbd> Strike, <kbd>G</kbd> Guard, <kbd>Enter</kbd> play, <kbd>E</kbd> end turn</div>
    </div>
  </div>`;
    root.querySelectorAll("[data-speed]").forEach((b) => b.onclick = () => {
      st.speed = +b.dataset.speed;
      S.settings.jspeed = st.speed;
      L.save && L.save();
      root.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("on", x === b));
    });
    $("#jxSortE").onclick = () => sortHand("el");
    $("#jxSortC").onclick = () => sortHand("rank");
    $("#jxEnd").onclick = onEndTurn;
    root.querySelectorAll("[data-off]").forEach((b) => b.onclick = () => useOff(+b.dataset.off));
    updateEnemy(true);
    updatePlayer();
    renderChain();
    renderHand(dealIn ? "all" : null);
    updateFlow();
    if (dealIn) {
      const top = root.getBoundingClientRect().top + window.scrollY - 8;
      if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: prefersReduced(S) ? "auto" : "smooth" });
    }
  }
  function updateEnemyHp(instant) {
    const e = st.f.enemy, pct = Math.max(0, e.hp / e.maxHp * 100);
    $("#jxHpCur").style.width = pct + "%";
    const lag = $("#jxHpLag");
    if (instant) lag.style.width = pct + "%";
    else setTimeout(() => {
      lag && (lag.style.width = pct + "%");
    }, 450 / st.speed);
    $("#jxHpTxt").textContent = `${fmtNum(Math.max(0, e.hp))} / ${fmtNum(e.maxHp)}`;
    const b = [];
    if (e.armor) b.push(`<span class="jx-badge armor" title="Armor: each hit deals this much less. Flying ignores it.">\u{1F6E1} ${e.armor}</span>`);
    if (e.burn) b.push(`<span class="jx-badge burn" title="Burn: takes this much at the start of its turn, then 1 less">\u{1F525} ${e.burn}</span>`);
    if (e.haunt) b.push(`<span class="jx-badge haunt" title="Haunt: your Strikes deal +25% for this many turns">\u{1F47B} ${e.haunt}</span>`);
    const eb = $("#jxEBadges");
    if (eb) eb.innerHTML = b.join("");
  }
  function updateEnemy(instant) {
    updateEnemyHp(instant);
    const f = st.f, e = f.enemy, it = e.intent || { kind: "strike", dmg: e.atk, hits: 1 };
    const when = e.countdown <= 1 ? "when you end your turn" : `in <b>${e.countdown}</b> turns`;
    const hit = intentHit(f), copyBonus = pendingCopyBonus(f), cancel = e.cancelNext && it.hits ? '<div class="jx-canceled">next attack canceled</div>' : "";
    const ICON = { strike: "\u2694", charge: "\u26A1", lightning: "\u{1F329}", flurry: "\u{1F3F9}", fortify: "\u{1F6E1}", hex: "\u{1F300}" };
    const main = it.kind === "fortify" ? `+${it.armor} armor` : it.kind === "hex" ? L.esc(tt(hexText(it.hex))) : it.kind === "flurry" ? `<b>${hit}</b> \xD7${it.hits}` : `<b>${hit}</b>`;
    const sub = { charge: `${e.countdown <= 1 ? "unleashes" : "charging"} ${when}`, lightning: `lightning ${when}: ignores half your Block`, fortify: `fortifies ${when}`, hex: `hex ${when}` }[it.kind] || when;
    $("#jxIntent").innerHTML = `<div class="jx-sword ${it.kind}">${ICON[it.kind] || "\u2694"} ${main}</div><div class="note">${sub}</div>${cancel}${copyBonus ? `<div class="jx-esc">+${copyBonus} mirrored from your Flow</div>` : ""}<div class="jx-esc">+15% after each attack</div>`;
    $("#jxIntent").classList.toggle("danger", e.countdown <= 1 && hit > 0);
    $("#jxIntent").classList.toggle("charging", it.kind === "charge" || it.kind === "lightning");
    $("#jxIntent").title = "Enemies grow 15% stronger after every attack. Long fights get dangerous.";
    bd.setHeat(e.countdown <= 1 && hit > 0 ? Math.min(1, 0.35 + hit / Math.max(1, f.player.hp)) : 0.05);
    const hx = $("#jxHex");
    if (hx) hx.innerHTML = (f.hex ? `<div class="jx-rule small hex">\u{1F300} This turn: ${L.esc(tt(hexText(f.hex)))}</div>` : "") + (f.taxed ? `<div class="jx-rule small hex">${L.esc(tt("{" + f.taxed + "} cards cost +1"))}</div>` : "");
  }
  function updatePlayer() {
    const f = st.f, p = f.player;
    $("#jxPhp").textContent = `${p.hp} / ${p.maxHp}`;
    $("#jxPhpBar").style.width = p.hp / p.maxHp * 100 + "%";
    const bl = $("#jxBlock");
    bl.querySelector("b").textContent = p.block;
    bl.classList.toggle("has", p.block > 0);
    bl.style.setProperty("--stone", p.block ? Math.min(1, (p.stone || 0) / p.block) : 0);
    bl.classList.toggle("stone", (p.stone || 0) > 0);
    const b = [];
    if (p.dodge) b.push(`<span class="jx-badge dodge" title="Dodge: cancels the next ${p.dodge} enemy hit${p.dodge > 1 ? "s" : ""}">\u{1F4A8} ${p.dodge}</span>`);
    if (p.stone) b.push(`<span class="jx-badge stone" title="Stone Block: half of it stays after the enemy attacks">\u26F0 ${p.stone}</span>`);
    if (f.nextEnergy) b.push(`<span class="jx-badge energy" title="Extra energy next turn">+${f.nextEnergy}\u26A1 next turn</span>`);
    $("#jxPBadges").innerHTML = b.join("");
    $("#jxTurn").textContent = `Turn ${f.turn}`;
    const dp = $("#jxDrawPile b"), xp = $("#jxDiscPile b");
    if (dp) {
      dp.textContent = f.drawPile.length;
      xp.textContent = f.discardPile.length;
    }
    $("#jxFight")?.classList.toggle("lowhp", p.hp > 0 && p.hp / p.maxHp <= 0.25);
    renderEnergy(0);
    renderPowers();
    updateEndTurn();
  }
  function renderEnergy(spend) {
    const f = st.f, base = Math.min(f.energy, 4), extra = Math.max(0, f.energy - 4);
    const gems = Array.from({ length: f.energy }, (_, k) => `<i class="gem${k >= base ? " carry" : ""}${k >= f.energy - spend ? " spend" : ""}"></i>`).join("");
    $("#jxEnergy").innerHTML = `<span class="lbl">Energy</span><span class="gems">${gems || '<i class="gem empty"></i>'}</span><b class="jx-en${spend > f.energy ? " bad" : ""}">${Math.max(0, f.energy - spend)}</b>${extra ? `<small class="dim">+${extra} carried</small>` : ""}`;
  }
  function renderPowers() {
    const el = $("#jxPowers");
    if (!el) return;
    el.innerHTML = st.f.powers.length ? `<span class="lbl">Powers</span>${st.f.powers.map((c) => `<span class="jx-power" title="${L.esc(c.name)}: ${L.esc(effectLines(c).join(", "))}" style="--ec:${elHex(c.elements[0])}">${glyph(c.elements[0], 14)}${L.esc(c.name.split(",")[0])}</span>`).join("")}` : "";
  }
  function updateEndTurn() {
    const f = st.f, d = incomingDamage(f), sub = $("#jxEndSub"), b = $("#jxEnd");
    if (!b) return;
    sub.innerHTML = f.enemy.countdown > 1 ? "No attack yet" : d ? `Take ${d}` : "Safe";
    b.classList.toggle("danger", d > 0);
    b.classList.toggle("safe", !d);
    b.disabled = st.busy;
    b.title = d ? `The enemy attacks when you end your turn: you take ${d} after Block` : "Ending your turn is safe right now";
  }
  function renderChain() {
    const f = st.f, ch = $("#jxChain");
    if (!ch) return;
    ch.innerHTML = f.chain.map((c, k) => `<span class="lnk${c.mode === "guard" ? " g" : ""}" style="--ec:${elHex(c.el.find((x) => x !== "Neutral") || "Neutral")}" title="${c.mode === "guard" ? "Guard" : c.mode === "strike" ? "Strike" : "Play"}">${glyph(c.el.find((x) => x !== "Neutral") || "Neutral", 13)}</span>`).join("") || '<span class="dim">Play cards to build Flow</span>';
  }
  function updateFlow(ghost) {
    const f = st.f, n = $("#jxFlowN");
    if (!n) return;
    n.textContent = f.flow;
    const heat = Math.min(1, (f.flow - 1) / 11);
    $("#jxFlow").style.setProperty("--flowheat", heat.toFixed(2));
    const nx = $("#jxFlowNext");
    if (!ghost) {
      nx.innerHTML = "";
      nx.classList.remove("on");
      return;
    }
    const r = ghost.res, what = r.mode === "strike" ? `${fmtNum(r.dmg)} damage` : r.mode === "guard" ? `+${fmtNum(r.block)} Block` : [r.dmg && `${fmtNum(r.dmg)} damage`, r.block && `+${fmtNum(r.block)} Block`, r.burn && `Burn ${r.burn}`, r.draw && `Draw ${r.draw}`].filter(Boolean).join(", ") || "its effect";
    nx.innerHTML = `<span class="gain">+${fmtNum(r.flowAfter - r.flowBefore)}</span> \u2192 \xD7${fmtNum(r.flowAfter)}${r.avatar ? ` <b class="av">${L.esc(T().text.surge)}</b>` : ""}<div class="what">${what}${r.kills ? ' \xB7 <span class="good">defeats the enemy</span>' : ""}</div>`;
    nx.classList.add("on");
    renderEnergy(r.cost);
  }
  const RAR = { C: "#1b1b1b", U: "#b8c7d3", R: "#e8c25a", M: "#f07a3a" };
  function typeLine(cj, rc) {
    if (rc.role === "basic") return "Basic";
    if (rc.token) return "Token";
    const main = { creature: "Creature", instant: "Instant", sorcery: "Sorcery", power: "Power" }[rc.role] || "Card";
    return `${rc.isLegendary ? "Legendary " : ""}${main}${rc.isAlly ? " \xB7 Ally" : ""}`;
  }
  // Original vector insignia distinguish the two basics at a glance, even offline.
  function basicArt(rc, element) {
    const color = elHex(element), guard = !strikeValue(rc);
    const shield = '<path d="M100 16 143 31 137 66Q127 92 100 104 73 92 63 66L57 31Z" fill="currentColor" opacity=".18"/><path d="M100 16 143 31 137 66Q127 92 100 104 73 92 63 66L57 31Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M100 24 134 36 129 65Q121 84 100 95 79 84 71 65L66 36Z" fill="none" stroke="#dfedcf" stroke-opacity=".55"/><path d="M26 64Q40 23 66 18M174 64Q160 23 134 18M36 89 46 92M164 89 154 92" fill="none" stroke="currentColor" stroke-opacity=".5"/>';
    const strike = '<path d="M27 97Q93 94 160 21L133 60 157 49Q120 95 27 97Z" fill="currentColor" opacity=".27"/><path d="M30 94Q100 80 160 21L144 52 169 38Q124 93 30 94Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M51 83Q102 69 160 21" fill="none" stroke="#e8f2d8" stroke-width="2"/><path d="M148 11 144 22M176 28 165 32M170 12 162 20M44 101 35 104" stroke="currentColor" stroke-width="2"/>';
    const motif = GLYPH[element] || GLYPH.Neutral;
    return `<div class="jc-basicart" style="--ec:${color}"><svg viewBox="0 0 200 120" aria-hidden="true"><path d="M0 104Q55 97 100 107T200 102M0 113Q70 106 120 115T200 112" stroke="currentColor" opacity=".12" fill="none"/><circle cx="100" cy="60" r="47" fill="none" stroke="currentColor" opacity=".12"/>${guard ? shield : strike}<g transform="translate(${guard ? "84 42" : "72 31"}) scale(${guard ? "1.6" : "1.25"})" style="color:#e4edce">${motif}</g></svg></div>`;
  }
  function cardFace(rc, live) {
    const cj = byKey[rc.key];
    const src = cj && L.artCrop ? L.artCrop(cj) : null;
    const element = rc.token ? rc.elements[0] : st.run ? COLOUR_ELEMENT[runColours(st.run)[0]] || "Neutral" : "Neutral";
    const art = rc.role === "basic" ? basicArt(rc, element) : rc.token ? `<div class="jc-emblem" style="--ec:${elHex(element)}">${glyph(element, 64)}</div>` : (cj && L.artSVG ? L.artSVG(cj) : "") + (src ? `<img src="${src}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="this.remove()">` : "");
    return journeyCardHTML(rc, { art, name: L.esc(cj ? (cj.flavor || cj.name).split(",")[0] : tokenName(rc)), typeLine: typeLine(cj, rc), rarityColor: RAR[cj?.r] || "#1b1b1b", rarity: cj?.r || "C", glyph, live, theme: T() });
  }
  let peekT = null;
  function peek(rc, show) {
    clearTimeout(peekT);
    let el = root.querySelector(".jx-peek");
    if (!show) {
      el && el.remove();
      return;
    }
    const run = st.run;
    peekT = setTimeout(() => {
      if (st.run !== run) return;
      const cj = byKey[rc.key];
      if (!cj) return;
      if (!el) {
        el = document.createElement("div");
        el.className = "jx-peek";
        root.appendChild(el);
      }
      el.innerHTML = `<div class="note">Original card</div>${L.cardHTML(cj, false, "front", "normal", true)}`;
    }, 900);
  }
  function cardLive(i) {
    const f = st.f, c = f.hand[i], live = {}, modes = modesFor(c);
    let why = null;
    for (const m of modes) {
      const chk = canPlayCard(f, i, m);
      if (!chk.ok) {
        why = chk.reason;
        continue;
      }
      const r = previewCard(f, i, m);
      if (m === "strike") live.strike = r.dmg;
      else if (m === "guard") live.guard = r.block;
    }
    return { live, modes, why: Object.keys(live).length || modes[0] === "play" && canPlayCard(f, i, "play").ok ? null : why };
  }
  function renderHand(dealFrom) {
    const f = st.f;
    const h = $("#jxHand");
    if (!h) return;
    const mid = (f.hand.length - 1) / 2, known = st.handUids || /* @__PURE__ */ new Set();
    h.innerHTML = f.hand.map((rc, i) => {
      const { live, modes, why } = cardLive(i), isNew = dealFrom === "all" || dealFrom === "new" && !known.has(rc.uid);
      const halves = why ? "" : modes[0] === "play" ? `<button class="half p" data-mode="play" tabindex="-1">Play</button>` : modes.map((m) => `<button class="half ${m === "strike" ? "s" : "g"}${modes.length === 1 ? " full" : ""}" data-mode="${m}" tabindex="-1">${m === "strike" ? "Strike" : "Guard"} <b>${fmtNum(m === "strike" ? live.strike : live.guard)}</b></button>`).join("");
      return `<div class="jx-hcard${why ? " cant" : ""}${st.focus === i ? " focus" : ""}${isNew ? " deal" : ""}" data-i="${i}" title="${why ? L.esc(why) : ""}" style="--d:${i * 55}ms;--fd:${(-i * 0.43).toFixed(2)}s;--fan:${((i - mid) * 3.2).toFixed(1)}deg;--lift:${(Math.abs(i - mid) ** 1.6 * 3.4).toFixed(1)}px"><kbd class="hk">${(i + 1) % 10}</kbd>${cardFace(rc, live)}<div class="jx-halves">${halves}</div>${why ? `<div class="jx-why">${L.esc(why)}</div>` : ""}</div>`;
    }).join("");
    st.handUids = new Set(f.hand.map((c) => c.uid));
    if (dealFrom) {
      const pile = $("#jxDrawPile");
      if (pile) {
        const pr = pile.getBoundingClientRect();
        h.querySelectorAll(".jx-hcard.deal").forEach((el) => {
          const cr = el.getBoundingClientRect();
          el.style.setProperty("--dx", pr.left + pr.width / 2 - cr.left - cr.width / 2 + "px");
          el.style.setProperty("--dy", pr.top - cr.top + "px");
        });
      }
    }
    h.querySelectorAll(".jx-hcard.deal").forEach((_, k) => setTimeout(() => { if(st.f === f) sfx.deal(); }, k * 45));
    h.querySelectorAll(".jx-hcard").forEach((el) => {
      const i = +el.dataset.i;
      el.querySelectorAll("[data-mode]").forEach((b) => {
        b.onclick = (ev) => {
          ev.stopPropagation();
          if (!st.dragged) onPlayCard(i, b.dataset.mode);
        };
        b.onmouseenter = () => {
          if (!st.busy) {
            const r = previewCard(st.f, i, b.dataset.mode);
            if (r) updateFlow({ res: r });
          }
        };
        b.onmouseleave = () => {
          if (!st.busy) {
            updateFlow();
            renderEnergy(0);
          }
        };
      });
      el.onclick = () => {
        if (st.busy || st.dragged) return;
        setFocus(st.focus === i ? null : i);
      };
      el.onmousemove = (ev) => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", -y * 10 + "deg");
        el.style.setProperty("--ry", x * 12 + "deg");
        el.style.setProperty("--mx", (x + 0.5) * 100 + "%");
        el.style.setProperty("--my", (y + 0.5) * 100 + "%");
      };
      el.onmouseleave = () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
        peek(null, false);
      };
      el.onmouseenter = () => {
        if (!st.busy) peek(f.hand[i], true);
      };
      el.onpointerdown = (ev) => {
        if (st.busy || el.classList.contains("cant") || ev.button) return;
        const y0 = ev.clientY, x0 = ev.clientX;
        let horizontal = false;
        st.dragged = false;
        const move = (e2) => {
          const dy = e2.clientY - y0, dx = e2.clientX - x0;
          // Once a gesture becomes a sideways scroll, never play on release.
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) horizontal = true;
          if (horizontal) {
            st.dragged = true;
            clearTimeout(lp);
            el.classList.remove("dragging", "up", "down");
            el.style.removeProperty("--dragy");
            return;
          }
          if (Math.abs(dy) > 8) {
            st.dragged = true;
            el.classList.add("dragging");
            el.style.setProperty("--dragy", dy + "px");
            el.classList.toggle("up", dy < -40);
            el.classList.toggle("down", dy > 40);
          }
        };
        const up = (e2) => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", cancel);
          if (st.f !== f) return;
          const dy = e2.clientY - y0;
          el.classList.remove("dragging", "up", "down");
          el.style.removeProperty("--dragy");
          if (!horizontal && st.dragged && Math.abs(dy) >= 40 && Math.abs(e2.clientX - x0) <= Math.abs(dy)) {
            const modes = modesFor(f.hand[i]);
            const m = modes[0] === "play" ? "play" : dy < 0 ? "strike" : "guard";
            if (modes.includes(m) || m === "play") onPlayCard(i, m);
          }
          setTimeout(() => {
            st.dragged = false;
          }, 0);
        };
        const cancel = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", cancel);
          el.classList.remove("dragging", "up", "down");
          el.style.removeProperty("--dragy");
          st.dragged = false;
          clearTimeout(lp);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", cancel);
      };
      let lp = null;
      el.ontouchstart = () => {
        lp = setTimeout(() => { if(st.f === f) peek(f.hand[i], true); }, 450);
      };
      el.ontouchmove = el.ontouchcancel = () => clearTimeout(lp);
      el.ontouchend = () => {
        clearTimeout(lp);
        setTimeout(() => { if(st.f === f) peek(null, false); }, 1500);
      };
    });
  }
  function setFocus(i) {
    st.focus = i;
    root.querySelectorAll(".jx-hcard").forEach((el) => el.classList.toggle("focus", +el.dataset.i === i));
    if (i == null) {
      updateFlow();
      renderEnergy(0);
      return;
    }
    const c = st.f.hand[i];
    if (!c) return;
    const hand = $("#jxHand"), focused = hand?.querySelector(`.jx-hcard[data-i="${i}"]`);
    if (focused) {
      const a = focused.getBoundingClientRect(), b = hand.getBoundingClientRect();
      if (a.left < b.left + 8) hand.scrollLeft += a.left - b.left - 8;
      else if (a.right > b.right - 8) hand.scrollLeft += a.right - b.right + 8;
    }
    sfx.select();
    const m = modesFor(c)[0], r = previewCard(st.f, i, m === "play" ? "play" : m);
    if (r) updateFlow({ res: r });
  }
  function sortHand(mode) {
    if (st.busy) return;
    const f = st.f, eo = ["Air", "Water", "Spirit", "Fire", "Earth", "Neutral"];
    f.hand.sort(mode === "el" ? (a, b) => eo.indexOf(a.elements[0]) - eo.indexOf(b.elements[0]) || a.rank - b.rank : (a, b) => a.rank - b.rank || eo.indexOf(a.elements[0]) - eo.indexOf(b.elements[0]));
    st.focus = null;
    sfx.deal();
    renderHand(null);
    persist();
  }
  function lock(v) {
    st.busy = v;
    setIdle(!v);
    root.querySelector(".jx-bottom")?.classList.toggle("locked", v);
    root.querySelectorAll("[data-off]").forEach((b) => {
      b.disabled = v;
    });
    const e = $("#jxEnd");
    if (e) e.disabled = v;
  }
  const wait = (ms) => {
    const run = st.run;
    return new Promise((res) => setTimeout(() => res(st.run === run), ms));
  };
  function popup(anchor, text, cls) {
    if (!anchor || !anchor.isConnected) return;
    const r = anchor.getBoundingClientRect(), fr = root.getBoundingClientRect();
    const p = document.createElement("div");
    p.className = "jx-pop " + cls;
    p.textContent = text;
    p.style.left = r.left - fr.left + r.width / 2 + "px";
    p.style.top = r.top - fr.top + 10 + "px";
    root.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
  function particles(anchor, element, n = 12) {
    if (!anchor || S.settings.reducedMotion) return;
    const r = anchor.getBoundingClientRect(), fr = root.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.className = "jx-part " + element.toLowerCase();
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      p.style.cssText = `left:${r.left - fr.left + r.width / 2}px;top:${r.top - fr.top + r.height / 2}px;--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 30}px;--c:${elHex(element)};animation-duration:${(600 + Math.random() * 400) / st.speed}ms`;
      root.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }
  function shake(px) {
    if (S.settings.reducedMotion || !px) return;
    const el = $("#jxFight");
    if (!el) return;
    el.style.setProperty("--sh", px + "px");
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }
  function bump(el, cls = "bump") {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  async function avatarOverlay() {
    const run = st.run;
    if (S.settings.reducedMotion && S.settings.seenAvatar) return;
    S.settings.seenAvatar = true;
    L.save && L.save();
    const o = document.createElement("div");
    o.className = "jx-avatar";
    o.innerHTML = `<div class="orbs">${(runSurge() || { els: [] }).els.map((e, i) => `<i class="orb o${i}" style="--c:${elHex(e)}">${glyph(e, 34)}</i>`).join("")}</div><div class="jx-avatartitle">${L.esc(T().text.surge.toUpperCase())}</div><div class="note">Flow doubled \xB7 click to skip</div>`;
    root.appendChild(o);
    sfx.avatar();
    ["#f2c46d", "#5aa7e0", "#6fa356", "#e8543a"].forEach((c, i) => setTimeout(() => { if(st.run === run) bd.pulse(c, 0.6); }, i * 250));
    await Promise.race([wait(1600 / Math.max(1, st.speed / 2)), new Promise((res) => o.addEventListener("click", res, { once: true }))]);
    if (st.run !== run) return;
    o.classList.add("flash");
    if (!await wait(250)) return;
    o.remove();
  }
  function elementFx(el, anchor, strength) {
    particles(anchor, el, 10 + Math.min(14, strength));
    if (el === "Earth") shake(3 + Math.min(6, strength / 2));
    else if (el === "Fire") bd.pulse(elHex("Fire"), Math.min(0.9, 0.2 + strength / 20));
    else if (el === "Water" && anchor) impact(anchor, elHex("Water"), false, S);
    else if (el === "Spirit" && anchor) {
      anchor.classList.remove("wobble");
      void anchor.offsetWidth;
      anchor.classList.add("wobble");
    }
  }
  async function onPlayCard(i, mode) {
    showTip("flow");
    if (st.busy || st.screen !== "fight") return;
    const run = st.run, f = st.f, c = f.hand[i];
    if (!c) return;
    if (!canPlayCard(f, i, mode).ok) {
      const el2 = root.querySelector(`.jx-hcard[data-i="${i}"]`);
      bump(el2, "nope");
      sfx.deselect();
      return;
    }
    lock(true);
    peek(null, false);
    st.focus = null;
    const cardEl = root.querySelector(`.jx-hcard[data-i="${i}"]`), hpBefore = f.enemy.hp, blockBefore = f.player.block;
    const { res, events } = runPlayCard(st.run, i, mode);
    persist();
    const sp = st.speed, el = c.elements.find((x) => x !== "Neutral") || "Neutral", col = elHex(el);
    const stage = $("#jxStage");
    if (cardEl && stage) {
      const r0 = cardEl.getBoundingClientRect(), fr = root.getBoundingClientRect();
      const ghost = document.createElement("div");
      ghost.className = "jx-flycard " + (res.mode === "guard" ? "g" : "s");
      ghost.innerHTML = cardFace(c);
      ghost.style.cssText = `left:${r0.left - fr.left}px;top:${r0.top - fr.top}px;width:${r0.width}px`;
      root.appendChild(ghost);
      cardEl.style.visibility = "hidden";
      const target = res.mode === "guard" ? $("#jxBlock") : res.mode === "strike" ? $(".jx-enemyart") : $("#jxFlow");
      const tr = target.getBoundingClientRect();
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${tr.left - r0.left + tr.width / 2 - r0.width / 2}px,${tr.top - r0.top + tr.height / 2 - r0.height / 2}px) scale(.35) rotate(${res.mode === "guard" ? -8 : 10}deg)`;
        ghost.style.opacity = "0.2";
      });
      sfx.whoosh();
      setTimeout(() => ghost.remove(), 420 / sp + 60);
      if (!await wait(320 / sp)) return;
    }
    sfx.elem(el, f.chain.length);
    renderChain();
    bump(root.querySelector("#jxChain .lnk:last-child"), "pop");
    const fn = $("#jxFlowN");
    updateFlow();
    bump(fn);
    bump($("#jxFlow"), "surge");
    popup($("#jxFlow"), "+" + fmtNum(res.flowAfter - res.flowBefore) + " Flow", "flow");
    if (res.avatar) {
      await avatarOverlay();
      if (st.run !== run) return;
    }
    const enemyArtEl = $(".jx-enemyart");
    if (res.dmg > 0) {
      const big = res.dmg >= hpBefore * 0.5 || res.dmg >= 1e3;
      impact(enemyArtEl, col, big || res.dmg >= hpBefore, S);
      {
        const [ex, ey] = ((r) => [r.left + r.width / 2, r.top + r.height / 2])(enemyArtEl.getBoundingClientRect());
        bd.pulse(col, Math.min(1.2, 0.25 + res.dmg / Math.max(1, f.enemy.maxHp) * 2.5), ex, ey);
      }
      shake(shakeFor(res.dmg));
      sfx.hit(big);
      bump($("#jxEnemy"), "hit");
      res.hits.forEach((h, k) => setTimeout(() => popup(enemyArtEl, "-" + fmtNum(Math.min(h, hpBefore)), "dmg" + (big ? " big" : "")), k * 160 / sp));
      updateEnemyHp(false);
    }
    elementFx(el, res.mode === "guard" ? $("#jxBlock") : enemyArtEl, res.flowNow);
    if (res.block) {
      const sh = $("#jxBlock");
      sh.querySelector("b").textContent = blockBefore + res.block;
      sh.classList.add("has");
      bump(sh, "gain");
      popup(sh, "+" + fmtNum(res.block) + " Block", "guardpop");
      sfx.block();
    }
    if (res.heal) popup($("#jxPhp"), "+" + res.heal + " HP", "heal");
    if (res.burn) popup(enemyArtEl, "Burn " + res.burn, "effect");
    if (res.haunt) popup(enemyArtEl, "Haunt " + res.haunt, "effect");
    if (res.dodge) popup($("#jxPBadges") || $("#jxBlock"), "Dodge " + res.dodge, "effect");
    if (res.delay) popup($("#jxIntent"), "Delayed", "effect");
    if (c.role === "power") popup($("#jxPowers") || $("#jxFlow"), c.name.split(",")[0] + " stays in play", "effect");
    for (const j of events.filter((e) => e.t === "joker")) bump($(`[data-jid="${j.id}"]`), "wiggle");
    if (!await wait(420 / sp)) return;
    if (events.some((e) => e.t === "phase")) {
      popup(enemyArtEl, "Phase 2!", "xmult");
      sfx.stinger();
      shake(8);
      if (!await wait(700 / sp)) return;
    }
    if (f.result === "won" || events.some((e) => e.t === "win")) {
      await onWin();
      return;
    }
    updateEnemy(false);
    updatePlayer();
    renderHand("new");
    updateFlow();
    $("#jxJokers").innerHTML = jokerRow(st.run, false, false);
    lock(false);
    updateEndTurn();
  }
  async function onEndTurn() {
    if (st.busy || st.screen !== "fight") return;
    lock(true);
    peek(null, false);
    st.focus = null;
    const f = st.f, sp = st.speed;
    root.querySelectorAll(".jx-hcard").forEach((el) => el.classList.add("discarding"));
    sfx.page();
    if (!await wait(260 / sp)) return;
    const { events } = runEndTurn(st.run);
    persist();
    const enemyEl = $("#jxEnemy"), art = $(".jx-enemyart");
    for (const ev of events) {
      if (ev.t === "strikeAgain") {
        popup(art, "-" + fmtNum(ev.dmg), "dmg big");
        impact(art, "#f0c56a", true, S);
        sfx.hit(true);
        shake(6);
        updateEnemyHp(false);
        if (!await wait(450 / sp)) return;
      }
      if (ev.t === "burnTick") {
        popup(art, "\u{1F525} -" + ev.n, "dmg");
        particles(art, "Fire", 10);
        sfx.elem("Fire", 2);
        updateEnemyHp(false);
        if (!await wait(380 / sp)) return;
      }
      if (ev.t === "phase") {
        popup(art, "Phase 2!", "xmult");
        sfx.stinger();
        shake(8);
        if (!await wait(700 / sp)) return;
      }
      if (ev.t === "enemyHeal") {
        popup(art, "+" + ev.n, "heal");
        updateEnemyHp(false);
        if (!await wait(300 / sp)) return;
      }
      if (ev.t === "enemyFortify") {
        popup(art, "+" + ev.armor + " armor", "guardpop");
        sfx.block();
        if (!await wait(380 / sp)) return;
      }
      if (ev.t === "enemyHex") {
        popup(art, "Hex: " + tt(hexText(ev.hex)), "effect");
        sfx.bell();
        if (!await wait(550 / sp)) return;
      }
      if (ev.t === "enemyCanceled") {
        popup($("#jxIntent"), "Attack canceled!", "effect");
        if (!await wait(450 / sp)) return;
      }
      if (ev.t === "dodge") {
        bump(enemyEl, "lunge");
        if (!await wait(200 / sp)) return;
        popup($("#jxBlock"), "Dodged!", "effect");
        sfx.whoosh();
        if (!await wait(300 / sp)) return;
      }
      if (ev.t === "counter") {
        popup(art, "-" + ev.dmg, "dmg");
        updateEnemyHp(false);
        if (!await wait(250 / sp)) return;
      }
      if (ev.t === "enemyHit") {
        bump(enemyEl, "lunge");
        if (!await wait(220 / sp)) return;
        if (ev.blocked) {
          popup($("#jxBlock"), "Blocked " + ev.blocked, "chips");
          sfx.block();
          shards($("#jxBlock"), S);
        }
      }
      if (ev.t === "playerHit" && ev.dmg) {
        slash($(".jx-stats"), S);
        bd.pulse("#e8333a", 0.45);
        popup($("#jxPhp"), "-" + ev.dmg, "dmg");
        sfx.hurt();
        shake(6);
        flash(root, "hurt", S);
        bump($(".jx-stats"), "hurt");
        $("#jxPhp").textContent = `${Math.max(0, f.player.hp)} / ${f.player.maxHp}`;
        if (!await wait(420 / sp)) return;
      }
    }
    if (f.result === "won") {
      await onWin();
      return;
    }
    if (f.result === "lost") {
      $("#jxFight")?.classList.add("defeat");
      banner(root, "Defeated", "lose", S);
      if (!await wait(prefersReduced(S) ? 300 : 1100)) return;
      go();
      return;
    }
    renderChain();
    updateFlow();
    bump($("#jxFlowN"), "reset");
    updateEnemy(true);
    updatePlayer();
    st.handUids = /* @__PURE__ */ new Set();
    renderHand("all");
    for (const ev of events.filter((e) => e.t === "power")) bump(root.querySelector("#jxPowers .jx-power"), "wiggle");
    lock(false);
    updateEndTurn();
  }
  async function onWin() {
    const enemyEl = $("#jxEnemy");
    enemyEl.classList.add("shatter");
    sfx.shatter();
    if (!await wait(450)) return;
    banner(root, st.f.enemy.def.boss ? "Boss defeated" : "Victory", "win", S);
    if (!await wait(prefersReduced(S) ? 200 : 750)) return;
    st.busy = false;
    setIdle(true);
    go();
  }
  document.addEventListener("keydown", (ev) => {
    if (!root.offsetParent || ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName || "")) return;
    if (root.querySelector(".jx-modal")) {
      if (ev.key === "Escape") root.querySelector(".jx-modal").remove();
      return;
    }
    const k = ev.key.toLowerCase(), n = /^[0-9]$/.test(k) ? k === "0" ? 10 : +k : 0;
    const click = (sel) => {
      const el = root.querySelector(sel);
      if (el && !el.disabled && el.offsetParent) {
        el.click();
        ev.preventDefault();
        return true;
      }
      return false;
    };
    if (st.screen === "fight" && !st.busy) {
      if (n && st.f.hand[n - 1]) {
        setFocus(st.focus === n - 1 ? null : n - 1);
        ev.preventDefault();
        return;
      }
      const i = st.focus;
      if (i != null && st.f.hand[i]) {
        const modes = modesFor(st.f.hand[i]);
        if (k === "s" || k === "g" || k === "enter") {
          const m = modes[0] === "play" ? "play" : k === "g" ? "guard" : k === "s" ? "strike" : modes[0];
          ev.preventDefault();
          onPlayCard(i, m);
          return;
        }
      }
      if (k === "e") return click("#jxEnd");
      if (k === "escape") {
        setFocus(null);
        return;
      }
    }
    if (st.screen === "map" && n) {
      const b = root.querySelectorAll("[data-go]")[n - 1];
      if (b) {
        b.click();
        ev.preventDefault();
      }
      return;
    }
    if (st.screen === "node:event" && n) {
      const b = root.querySelectorAll("[data-ch]")[n - 1];
      if (b && !b.disabled) {
        b.click();
        ev.preventDefault();
      }
      return;
    }
    if (k === "enter" && (st.screen.startsWith("node:") || st.screen === "bossintro")) {
      click("#jxCont") || click("#jxFightBoss");
    }
  });
  const api = {
    reset() {
      // Invalidates outstanding async work by replacing its run identity.
      st.run = null; st.f = null; st.setup = null; st.focus = null;
      st.busy = false; st.dragged = false; st.handUids = new Set();
      st.bookShown = st.cardDue = st.introSeen = st.lastGold = st.lastHp = null;
      st.speed = S.settings.jspeed || 1;
      peek(null, false);
      root.dataset.book = ''; bd.setTheme('none'); bd.setHeat(0); setIdle(true);
      renderStart();
    },
    resume() {
      const saved = loadSave();
      if (!saved || !["map", "node", "fight"].includes(saved.status)) return false;
      resumeSaved(saved);
      return true;
    },
    _state: st,
    _newRun(seed, opt) {
      if (!DEBUG) return false;
      // A string is a legacy nation id; an object is { colours, sets, theme }.
      st.newRunOpts = opt && typeof opt === "object" ? opt : { nation: opt || "water" };
      startRun(seed);
      if (st.run.pending && st.run.pending.kind === "start") {
        takeStartCharm(st.run, 0);
        go();
      }
      return true;
    },
    // jump to a node of this type on the current map (or on `book`), as if arriving from the floor below
    _debugGoto(type, book) {
      if (!DEBUG || !st.run || st.busy) return false;
      const r = st.run;
      if (book && book !== r.book) {
        r.book = book;
        if (!r.maps[book]) r.maps[book] = generateBook(book, createRng("dbg" + book));
      }
      r.pending = null;
      r.fight = null;
      r.status = "map";
      const map = currentMap(r), n = map.floors.flat().find((x) => x.type === type);
      if (!n) return false;
      const prev = map.floors.flat().find((x) => x.next.includes(n.id));
      r.nodeId = prev ? prev.id : null;
      r.floor = prev ? prev.floor : 0;
      enterNode(r, n.id);
      go();
      return true;
    },
    _debugForce(kind) {
      if (!DEBUG || !st.f || st.screen !== "fight") return false;
      if (kind === "avatar") {
        const pick = (col) => L.BASE.find((c) => c.r === "C" && c.col === col && /Creature/.test(c.type) && c.cost && c.cost.split(" ").length <= 2);
        st.f.hand = ["W", "U", "G", "R"].map((col, i) => {
          const rc = toRunCard(pick(col), { uid: "dbg" + i });
          rc.hpCost = 0;
          rc.energy = 1;
          return rc;
        });
        st.f.energy = 4;
        renderHand(null);
        updatePlayer();
        updateFlow();
        return true;
      }
      if (kind === "weak") {
        st.f.enemy.hp = 1;
        updateEnemyHp(true);
        return true;
      }
      return false;
    },
    _debugFight() {
      if (!DEBUG || !st.f) return null;
      const f = st.f;
      return { flow: f.flow, energy: f.energy, turn: f.turn, hand: f.hand.map((c) => c.name), enemyHp: f.enemy.hp, chain: f.chain.length, busy: st.busy };
    }
  };
  renderStart();
  return api;
}
