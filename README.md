# CFB Coach (proof of concept)

A simple college football coaching sim for mobile web. Pick a Power 4 school (or Notre Dame), recruit, set your depth chart and game plan, and sim season after season. Games are simulated drive by drive; you see the box score.

**Play:** https://jbaxmeyer-personal.github.io/cfb-coach/

- 68 programs in their 2026 conferences (SEC, Big Ten, ACC, Big 12, plus Notre Dame). School names and colours only.
- 12-game schedule, conference championship games, and a 12-team playoff (four conference champions get in; the top four seeds get byes).
- Recruiting: a weekly points budget spread across your board. Prospects commit during the season, and the rest sign after the title game.
- Offseason: seniors graduate, early draft entries, player progression, transfer-portal fills, prestige changes, the hot seat, and job offers.
- Saves in your browser. Plain JS, no build step.

| File | Purpose |
|---|---|
| `js/teams.js` | Schools, conferences, colours, prestige, roster template |
| `js/players.js` | Player generation, depth charts, unit ratings |
| `js/sim.js` | Drive-by-drive game simulation and box scores |
| `js/league.js` | Season, schedule, rankings, playoff, recruiting, offseason, saves |
| `js/main.js` | Mobile UI |
