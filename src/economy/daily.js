import { ECONOMY } from "./config.js";
import { daysBetween } from "./clock.js";

// Daily gift: one free pack per calendar day (missed days accrue up to a cap) and streak cash
// that grows with consecutive days and resets after a missed day. Never mutates its input.
export function claimDaily(daily, today) {
  const last = daily.last;
  const gap = last ? daysBetween(last, today) : 1;
  if (gap <= 0) return { daily, claimed: false, cash: 0, packs: 0, streakDay: daily.streak };
  const streak = last && gap === 1 ? daily.streak + 1 : 1;
  const table = ECONOMY.streakCash;
  return {
    daily: { last: today, streak },
    claimed: true,
    cash: table[Math.min(streak, table.length) - 1],
    packs: Math.min(gap, ECONOMY.dailyPackMaxAccrual),
    streakDay: streak
  };
}
