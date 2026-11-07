import { TIPS } from "../meta/tips.js";

// One small, non-blocking card at a time (top right). Seen state lives in the player's save,
// reached through the store passed to initTips.
var tipStore = null;
var tipQueue = [];
var tipCardEl = () => {
  let el = document.getElementById("tipCard");
  if (!el) {
    el = document.createElement("div");
    el.id = "tipCard";
    el.className = "tipCard";
    el.setAttribute("role", "status");
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
};
function renderNextTip() {
  const el = tipCardEl(), id = tipQueue[0];
  if (!id) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const t = TIPS.find((x) => x.id === id);
  el.innerHTML = `<b>${t.title}</b><p>${t.text}</p><button class="btn" id="tipOk">Got it</button>`;
  el.hidden = false;
  el.querySelector("#tipOk").onclick = () => {
    tipStore.markSeen(id);
    tipQueue.shift();
    renderNextTip();
  };
}
export function initTips(store) {
  tipStore = store;
}
export function showTip(id) {
  if (!tipStore || !tipStore.enabled() || tipStore.isSeen(id) || tipQueue.includes(id) || !TIPS.some((t) => t.id === id)) return false;
  tipQueue.push(id);
  if (tipQueue.length === 1) renderNextTip();
  return true;
}
export function resetTips() {
  if (tipStore) tipStore.reset();
  tipQueue = [];
  renderNextTip();
}
