// Every economy number in one place, so balancing is a data change (spec §3).
export var ECONOMY = {
  startingBankroll: 50,
  starterPacks: 3,
  dailyPackMaxAccrual: 3,
  streakCash: [5, 5, 10, 10, 15, 15, 20],
  packPrice: 6.99,
  boxPrice: 149.99,
  sellRatePercent: 60,
  keepDefault: 4,
  keepJourneyDefault: 12,
  journeyPayout: { fight: 1, elite: 2.5, boss: [6, 10, 14], win: 10 }
};
