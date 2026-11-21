// League state: teams, schedule, standings, rankings, playoff, recruiting and the offseason.
import { TEAMS, POSITIONS, POS_ORDER, ROSTER_MAX, CONFERENCES } from './teams.js';
import { rng, makeRoster, autoDepth, repairDepth, units, clamp, gauss, makeName, pick } from './players.js';
import { simGame, OFFENSES, DEFENSES, DEFAULT_PLAN } from './sim.js';

// Orient regular-season games so every team gets home games equal to half its schedule
// (6 of 12). Every team plays an even number of games, so an Euler circuit through the
// "who plays whom" graph gives each team exactly as many home games as road games.
function balanceHomeAway(games, r) {
  const reg = games.filter(g => g.kind === 'reg' && !g.neutral);
  const adj = {};
  reg.forEach((g, i) => { (adj[g.h] = adj[g.h] || []).push(i); (adj[g.a] = adj[g.a] || []).push(i); });
  for (const k in adj) adj[k] = shuffle(r, adj[k]);
  const used = new Array(reg.length).fill(false);
  const ptr = {};
  for (const start of shuffle(r, Object.keys(adj).map(Number))) {
    const stack = [start];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const list = adj[v];
      let p = ptr[v] || 0;
      while (p < list.length && used[list[p]]) p++;
      ptr[v] = p;
      if (p === list.length) { stack.pop(); continue; }
      const g = reg[list[p]];
      used[list[p]] = true;
      const u = g.h === v ? g.a : g.h;
      g.a = v; g.h = u;                // travelling v -> u: u hosts
      stack.push(u);
    }
  }
}

const SAVE_KEY = 'cfb-coach-save-v1';
export const REG_WEEKS = 12;
export const RECRUIT_POINTS = 100;   // weekly base, scaled by prestige
export const BOARD_MAX = 20;

export class League {
  static create(userTeamId, coachName) {
    const L = new League();
    L.seed = (Math.random() * 2 ** 32) >>> 0;
    L.tick = 1;
    L.nextPid = 1;
    L.year = 2026;
    const r = L.r();
    L.teams = TEAMS.map(t => {
      const roster = makeRoster(r, L, t);
      const team = { id: t.id, prestige: t.prestige, roster, depth: autoDepth(roster), plan: null, elo: 1500 + (t.prestige - 70) * 12, history: [] };
      team.plan = aiPlan(team, r);
      return team;
    });
    L.user = { teamId: userTeamId, name: coachName || 'Coach', rep: clamp(TEAMS[userTeamId].prestige - 10, 30, 90), seasons: [], hotSeat: 0, titles: 0, jobs: [{ team: userTeamId, from: 2026 }] };
    L.history = [];   // champions per year
    L.startSeason();
    return L;
  }

  r() { return rng((this.seed ^ Math.imul(this.tick++, 2654435761)) >>> 0); }
  team(id) { return this.teams[id]; }
  meta(id) { return TEAMS[id]; }
  get userTeam() { return this.teams[this.user.teamId]; }

  // ---------------- Season ----------------
  startSeason() {
    const r = this.r();
    this.week = 1;
    this.phase = 'regular';           // regular | ccg | playoff | done | offseason
    this.games = [];                  // {id, week, h, a, neutral, kind, box, score}
    this.stats = {};                  // pid -> season stat totals
    this.news = [];
    for (const t of this.teams) { t.w = 0; t.l = 0; t.rw = 0; t.rl = 0; t.cw = 0; t.cl = 0; t.pf = 0; t.pa = 0; t.depth = repairDepth(t.depth, t.roster); t._byId = null; }
    this.makeSchedule(r);
    this.recruits = makeRecruitClass(this, r);
    this.board = [];                  // user's recruit ids
    this.rankings = this.computeRankings(true);
    this.preseasonRank = Object.fromEntries(this.rankings.map((id, i) => [id, i + 1]));
    // Expected wins (for job security) from preseason strength rank.
    for (const t of this.teams) t.expect = clamp(Math.round(11 - (this.preseasonRank[t.id] - 1) * (7 / 60)), 3, 11);
  }

  makeSchedule(r) {
    const ids = this.teams.map(t => t.id);
    const confOf = (id) => TEAMS[id].conf;
    let gid = 1;
    const add = (week, h, a, kind = 'reg', neutral = false) => this.games.push({ id: gid++, week, h, a, kind, neutral, box: null });
    // Weeks 1-3: non-conference (random matching, avoid same conference).
    for (let w = 1; w <= 3; w++) {
      let pool = shuffle(r, ids.slice());
      for (let tries = 0; tries < 50; tries++) {
        let ok = true;
        for (let i = 0; i < pool.length; i += 2) if (confOf(pool[i]) === confOf(pool[i + 1]) && confOf(pool[i]) !== 'IND') { ok = false; break; }
        if (ok) break;
        pool = shuffle(r, pool);
      }
      for (let i = 0; i < pool.length; i += 2) add(w, pool[i], pool[i + 1]);
    }
    // Weeks 4-12: 9 conference rounds (circle method). Notre Dame plays the ACC team on a bye.
    const confs = {};
    for (const id of ids) if (confOf(id) !== 'IND') (confs[confOf(id)] = confs[confOf(id)] || []).push(id);
    const nd = ids.find(id => confOf(id) === 'IND');
    for (const members of Object.values(confs)) {
      const list = shuffle(r, members.slice());
      if (list.length % 2) list.push(null);
      const n = list.length;
      for (let round = 0; round < 9; round++) {
        for (let i = 0; i < n / 2; i++) {
          const a = list[i], b = list[n - 1 - i];
          const week = 4 + round;
          if (a == null || b == null) { add(week, (a ?? b), nd); continue; }
          if ((round + i) % 2) add(week, a, b); else add(week, b, a);
        }
        list.splice(1, 0, list.pop()); // rotate all but the first
      }
    }
    // Notre Dame may have gaps (weeks without an ACC bye): fill against no one (bye) is fine.
    balanceHomeAway(this.games, r);
  }

  weekGames(week = this.week) { return this.games.filter(g => g.week === week); }
  userGames() { return this.games.filter(g => g.h === this.user.teamId || g.a === this.user.teamId); }
  nextUserGame() { return this.userGames().find(g => !g.box); }

  // Simulate the current week (all games), then advance.
  simWeek() {
    if (this.phase === 'done' || this.phase === 'offseason') return null;
    const r = this.r();
    const games = this.weekGames().filter(g => !g.box);
    for (const g of games) this.playGame(g, r);
    if (this.phase === 'regular') this.recruitingWeek(r);
    this.rankings = this.computeRankings();
    const played = games;
    this.advanceWeek();
    return played;
  }

  playGame(g, r) {
    const H = this.teams[g.h], A = this.teams[g.a];
    const box = simGame(H, A, r, { neutral: g.neutral });
    g.box = compactBox(box);
    g.score = [box.score.h, box.score.a];
    const hw = box.score.h > box.score.a;
    const W = hw ? H : A, Lo = hw ? A : H;
    if (g.kind === 'reg') {
      W.w++; Lo.l++; W.rw++; Lo.rl++;
      if (TEAMS[g.h].conf === TEAMS[g.a].conf && TEAMS[g.h].conf !== 'IND') { W.cw++; Lo.cl++; }
    } else { W.w++; Lo.l++; }
    H.pf += box.score.h; H.pa += box.score.a; A.pf += box.score.a; A.pa += box.score.h;
    // Elo with margin of victory.
    const diff = Math.abs(box.score.h - box.score.a);
    const exp = 1 / (1 + 10 ** ((Lo.elo - W.elo) / 400));
    const k = 30 * Math.log(diff + 1) * 0.6;
    W.elo += k * (1 - exp); Lo.elo -= k * (1 - exp);
    // Season stats.
    for (const line of Object.values(box.players)) {
      const s = this.stats[line.id] = this.stats[line.id] || { id: line.id, team: line.side === 'h' ? g.h : g.a, g: 0 };
      s.g++;
      for (const [k2, v] of Object.entries(line)) if (typeof v === 'number' && k2 !== 'id') s[k2] = (k2 === 'long' ? Math.max(s[k2] || 0, v) : (s[k2] || 0) + v);
    }
  }

  advanceWeek() {
    if (this.phase === 'regular') {
      if (this.week < REG_WEEKS) { this.week++; return; }
      this.setupConfChampionships();
      return;
    }
    if (this.phase === 'ccg') { this.setupPlayoff(); return; }
    if (this.phase === 'playoff') { this.advancePlayoff(); }
  }

  confStandings(conf) {
    const ids = this.teams.filter(t => TEAMS[t.id].conf === conf).map(t => t.id);
    const rank = Object.fromEntries(this.rankings.map((id, i) => [id, i]));
    return ids.sort((a, b) => {
      const A = this.teams[a], B = this.teams[b];
      return (B.cw - B.cl) - (A.cw - A.cl) || (B.w - B.l) - (A.w - A.l) || rank[a] - rank[b];
    });
  }

  setupConfChampionships() {
    this.phase = 'ccg';
    this.week = 13;
    let gid = Math.max(...this.games.map(g => g.id)) + 1;
    for (const conf of ['SEC', 'B1G', 'ACC', 'B12']) {
      const [a, b] = this.confStandings(conf);
      this.games.push({ id: gid++, week: 13, h: a, a: b, kind: 'ccg', conf, neutral: true, box: null });
    }
  }

  // 12-team playoff: four conference champions guaranteed, seeded by ranking; top four seeds get byes.
  setupPlayoff() {
    const champs = this.games.filter(g => g.kind === 'ccg').map(g => (g.score[0] > g.score[1] ? g.h : g.a));
    this.champs = champs;
    this.rankings = this.computeRankings();
    const field = [...champs];
    for (const id of this.rankings) { if (field.length >= 12) break; if (!field.includes(id)) field.push(id); }
    const rank = Object.fromEntries(this.rankings.map((id, i) => [id, i]));
    // Seeds 1-4: the four highest-ranked conference champions; 5-12: everyone else by ranking.
    const topChamps = champs.slice().sort((a, b) => rank[a] - rank[b]);
    const rest = field.filter(id => !topChamps.includes(id)).sort((a, b) => rank[a] - rank[b]);
    this.seeds = [...topChamps, ...rest];
    this.phase = 'playoff';
    this.week = 14;
    this.round = 1;
    let gid = Math.max(...this.games.map(g => g.id)) + 1;
    const s = this.seeds;
    for (const [hi, lo] of [[4, 11], [5, 10], [6, 9], [7, 8]]) this.games.push({ id: gid++, week: 14, h: s[hi], a: s[lo], kind: 'cfp', round: 1, seedH: hi + 1, seedA: lo + 1, neutral: false, box: null });
    this.news.push(`The playoff field is set. ${TEAMS[s[0]].name} is the No. 1 seed.`);
  }

  advancePlayoff() {
    const winner = (g) => (g.score[0] > g.score[1] ? g.h : g.a);
    const seedOf = (id) => this.seeds.indexOf(id) + 1;
    let gid = Math.max(...this.games.map(g => g.id)) + 1;
    const cur = this.games.filter(g => g.kind === 'cfp' && g.round === this.round);
    if (this.round === 1) {
      // Quarterfinals: 1 v 8/9 winner, 2 v 7/10, 3 v 6/11, 4 v 5/12.
      const w = cur.map(winner); // order: 5v12, 6v11, 7v10, 8v9
      const pairs = [[this.seeds[0], w[3]], [this.seeds[1], w[2]], [this.seeds[2], w[1]], [this.seeds[3], w[0]]];
      this.round = 2; this.week = 15;
      for (const [a, b] of pairs) this.games.push({ id: gid++, week: 15, h: a, a: b, kind: 'cfp', round: 2, seedH: seedOf(a), seedA: seedOf(b), neutral: true, box: null });
    } else if (this.round === 2) {
      const w = cur.map(winner);
      this.round = 3; this.week = 16;
      for (const [a, b] of [[w[0], w[3]], [w[1], w[2]]]) this.games.push({ id: gid++, week: 16, h: a, a: b, kind: 'cfp', round: 3, seedH: seedOf(a), seedA: seedOf(b), neutral: true, box: null });
    } else if (this.round === 3) {
      const w = cur.map(winner);
      this.round = 4; this.week = 17;
      this.games.push({ id: gid++, week: 17, h: w[0], a: w[1], kind: 'cfp', round: 4, seedH: seedOf(w[0]), seedA: seedOf(w[1]), neutral: true, box: null });
    } else {
      this.champion = winner(cur[0]);
      this.phase = 'done';
      this.endOfSeason();
    }
  }

  // Poll: Elo plus record, so undefeated teams climb.
  computeRankings(preseason = false) {
    const score = (t) => preseason ? units(t).ovr * 10 + t.prestige * 2 : t.elo + 22 * (t.w - 1.4 * t.l);
    return this.teams.slice().sort((a, b) => score(b) - score(a)).map(t => t.id);
  }
  rankOf(id) { return this.rankings.indexOf(id) + 1; }

  // ---------------- Recruiting ----------------
  weeklyPoints() { return Math.round(RECRUIT_POINTS * (0.8 + this.userTeam.prestige / 250)); }
  openSpots(teamId) {
    const t = this.teams[teamId];
    const leaving = t.roster.filter(p => p.yr >= 4).length;
    return Math.max(0, Math.min(25, ROSTER_MAX - t.roster.length + leaving - (ROSTER_MAX - 68)));
  }
  userCommits() { return this.recruits.filter(c => c.commit === this.user.teamId); }

  addToBoard(id) {
    if (this.board.includes(id) || this.board.length >= BOARD_MAX) return false;
    this.board.push(id); return true;
  }
  removeFromBoard(id) { this.board = this.board.filter(x => x !== id); }
  // Spend points on a board recruit (1-3 = light/medium/heavy).
  setEffort(id, level) { const c = this.recruits.find(x => x.id === id); if (c && c.commit == null) c.effort = level; }

  // User interest vs. the recruit's leading other suitor: share in 0..1.
  // Elite recruits cost more effort, and a big prestige gap to their favourite makes them much harder to flip.
  interest(c) {
    const myP = this.userTeam.prestige, theirP = c.aiTeam >= 0 ? this.teams[c.aiTeam].prestige : 55;
    const gap = clamp((myP / theirP) ** (c.stars * 0.8), 0.15, 1.1);
    const userPull = (pullFor(myP, c) * 20 * STAR_DEMAND[c.stars] + c.userPts / STAR_COST[c.stars]) * gap;
    const total = userPull + c.aiPull;
    return total ? userPull / total : 0;
  }

  // AI class sizes are limited: if a recruit's favourite is full, his next suitor takes over.
  aiCommitsFor(teamId) { return this.recruits.filter(c => c.commit === teamId).length; }
  commitName(c) { return c.commit === -1 ? 'a non-P4 school' : TEAMS[c.commit].name; }
  ensureSuitorHasRoom(c, r) {
    const full = (id) => this.aiCommitsFor(id) >= this.openSpots(id);
    if (!full(c.aiTeam)) return;
    const choice = chooseSuitor(this, c.stars, r, (t) => t.id !== this.user.teamId && !full(t.id));
    if (choice) { c.aiTeam = choice.id; c.aiPull = choice.pull; }
    else c.aiTeam = -1;   // every Power 4 class is full: he signs with a non-P4 program
  }

  recruitingWeek(r) {
    // User effort: points split across board by effort level.
    const pts = this.weeklyPoints();
    const active = this.board.map(id => this.recruits.find(c => c.id === id)).filter(c => c && c.commit == null);
    const totalEffort = active.reduce((s, c) => s + (c.effort || 1), 0) || 1;
    for (const c of active) c.userPts += pts * (c.effort || 1) / totalEffort;
    // Commitments: as the season goes on, recruits pick a side.
    const spots = this.openSpots(this.user.teamId);
    for (const c of this.recruits) {
      if (c.commit != null) continue;
      const p = 0.02 + this.week * 0.012;
      if (r() > p) continue;
      const share = this.interest(c);
      if (share > 0.55 && this.board.includes(c.id) && this.userCommits().length < spots) {
        c.commit = this.user.teamId;
        this.news.push(`⭐ ${'★'.repeat(c.stars)} ${c.pos} ${c.n} committed to ${TEAMS[this.user.teamId].name}!`);
      } else if (share < 0.45 || !this.board.includes(c.id)) {
        this.ensureSuitorHasRoom(c, r);
        c.commit = c.aiTeam;
        if (this.board.includes(c.id)) this.news.push(`${c.n} (${c.pos}, ${'★'.repeat(c.stars)}) committed to ${this.commitName(c)}.`);
      }
    }
  }

  // National signing day: everyone remaining signs. Then classes are added to rosters in the offseason.
  signingDay(r) {
    const spots = this.openSpots(this.user.teamId);
    for (const c of this.recruits) {
      if (c.commit != null) continue;
      if (this.board.includes(c.id) && this.interest(c) > 0.5 && this.userCommits().length < spots) c.commit = this.user.teamId;
      else { this.ensureSuitorHasRoom(c, r); c.commit = c.aiTeam; }
    }
  }

  // ---------------- End of season & offseason ----------------
  endOfSeason() {
    const u = this.userTeam;
    const madePO = this.seeds.includes(u.id);
    const won = this.champion === u.id;
    const confChamp = (this.champs || []).includes(u.id);
    const summary = { year: this.year, team: u.id, w: u.w, l: u.l, rw: u.rw, expect: u.expect, rank: this.rankOf(u.id), playoff: madePO, champion: won, confChamp };
    this.user.seasons.push(summary);
    if (won) this.user.titles++;
    this.history.push({ year: this.year, champion: this.champion, heisman: this.heisman() });
    for (const t of this.teams) t.history.push({ year: this.year, w: t.w, l: t.l, rank: this.rankOf(t.id) });
  }

  heisman() {
    let best = null, bs = -1;
    for (const s of Object.values(this.stats)) {
      const t = this.teams[s.team];
      const v = (s.pyd || 0) * 0.025 + (s.ptd || 0) * 4 - (s.int || 0) * 3 + (s.ryd || 0) * 0.05 + (s.rtd || 0) * 5 + (s.recyd || 0) * 0.04 + (s.rectd || 0) * 4 + t.w * 4;
      if (v > bs) { bs = v; best = s; }
    }
    if (!best) return null;
    const p = this.teams[best.team].roster.find(x => x.id === best.id);
    return p ? { name: p.n, pos: p.pos, team: best.team, line: statLine(best) } : null;
  }

  // Runs the whole offseason; returns a report for the UI (job status, offers, departures, class).
  runOffseason() {
    const r = this.r();
    this.signingDay(r);
    const report = { year: this.year, departures: [], classes: {}, offers: [], fired: false };
    const u = this.userTeam;
    const s = this.user.seasons[this.user.seasons.length - 1];

    // Prestige moves with results vs expectations and postseason success.
    for (const t of this.teams) {
      const delta = (t.rw - t.expect) * 1.1 + (this.champion === t.id ? 5 : 0) + ((this.seeds || []).includes(t.id) ? 1.5 : 0) + (70 - t.prestige) * 0.06;
      t.prestige = clamp(Math.round(t.prestige + delta), 35, 99);
    }
    // Coach reputation and job security.
    const perf = (s.rw - s.expect) + (s.playoff ? 2 : 0) + (s.champion ? 5 : 0) + (s.confChamp ? 1 : 0);
    this.user.rep = clamp(Math.round(this.user.rep + perf * 2.5), 10, 100);
    this.user.hotSeat = perf < -1 ? this.user.hotSeat + (perf < -3 ? 2 : 1) : Math.max(0, this.user.hotSeat - 1);
    report.perf = perf;
    report.hotSeat = this.user.hotSeat;
    if (this.user.hotSeat >= 2) { report.fired = true; }

    // Players leave: seniors graduate, some elite juniors declare for the draft.
    for (const t of this.teams) {
      const leaving = t.roster.filter(p => p.yr >= 4 || (p.yr === 3 && p.ovr >= 88 && r() < 0.6));
      if (t.id === u.id) report.departures = leaving.map(p => ({ n: p.n, pos: p.pos, ovr: p.ovr, yr: p.yr, draft: p.yr === 3 }));
      t.roster = t.roster.filter(p => !leaving.includes(p));
      // Progression for returning players.
      for (const p of t.roster) {
        const grow = Math.max(0, (p.pot - p.ovr) * (0.34 + r() * 0.2)) + 1 + gauss(r) * 1.5 + (t.prestige - 70) * 0.03;
        p.ovr = clamp(Math.round(p.ovr + grow), 35, 99);
        p.yr++;
      }
    }
    // Signed classes join as freshmen.
    for (const c of this.recruits) {
      if (c.commit == null || c.commit < 0) continue;
      const t = this.teams[c.commit];
      if (t.roster.length >= ROSTER_MAX) continue;
      t.roster.push({ id: this.nextPid++, n: c.n, pos: c.pos, yr: 1, ovr: c.ovr, pot: c.pot, stars: c.stars });
      (report.classes[c.commit] = report.classes[c.commit] || []).push(c);
    }
    // Transfer portal fills any position below its minimum (quality tracks program prestige).
    report.transfers = [];
    for (const t of this.teams) {
      for (const pos of POS_ORDER) {
        const need = POSITIONS[pos][0] - t.roster.filter(p => p.pos === pos).length;
        for (let i = 0; i < need; i++) {
          const ovr = clamp(Math.round(58 + t.prestige * 0.16 + gauss(r) * 5), 45, 88);
          const p = { id: this.nextPid++, n: makeName(r), pos, yr: 2 + Math.floor(r() * 3), ovr, pot: clamp(ovr + Math.round(r() * 6), ovr, 99), stars: 0, portal: true };
          t.roster.push(p);
          if (t.id === u.id) report.transfers.push(p);
        }
      }
      t.depth = repairDepth(t.id === u.id ? t.depth : null, t.roster);
      if (t.id !== u.id) { t.depth = autoDepth(t.roster); t.plan = aiPlan(t, r); }
    }
    // Class rankings (by average stars, weighted by count).
    report.classRank = Object.entries(report.classes).map(([id, cl]) => [+id, cl.reduce((s2, c) => s2 + c.stars ** 2, 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);

    // Coaching carousel: underperforming programs open up. Offers depend on your reputation.
    const openings = this.teams.filter(t => t.id !== u.id && (t.rw < t.expect - 2 || r() < 0.06));
    for (const t of openings) {
      if (t.prestige <= this.user.rep + 12 || report.fired) report.offers.push(t.id);
    }
    if (report.fired) report.offers = this.teams.filter(t => t.id !== u.id && t.prestige < Math.max(50, this.user.rep)).sort(() => r() - 0.5).slice(0, 3).map(t => t.id);
    report.offers = report.offers.sort((a, b) => this.teams[b].prestige - this.teams[a].prestige).slice(0, 4);
    this.offseason = report;
    this.phase = 'offseason';
    return report;
  }

  // Accept a job (or stay with -1). Then the next season starts.
  finishOffseason(newTeamId = -1) {
    if (newTeamId >= 0) {
      this.user.teamId = newTeamId;
      this.user.hotSeat = 0;
      this.user.jobs.push({ team: newTeamId, from: this.year + 1 });
      this.userTeam.depth = autoDepth(this.userTeam.roster);
    }
    this.year++;
    this.offseason = null;
    this.startSeason();
  }

  // ---------------- Persistence ----------------
  save() {
    try {
      const data = JSON.stringify(this, (k, v) => (k === '_byId' ? undefined : v));
      localStorage.setItem(SAVE_KEY, data);
      return data.length;
    } catch (e) { return 0; }
  }
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const L = Object.assign(new League(), JSON.parse(raw));
      // Older saves had lopsided home/away splits: re-balance if the season hasn't started.
      if (L.phase === 'regular' && L.games.every(g => !g.box)) balanceHomeAway(L.games, Math.random);
      return L;
    } catch (e) { return null; }
  }
  static clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
}

// ---------------- Helpers ----------------
function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// AI picks schemes that fit its roster.
export function aiPlan(team, r) {
  const u = units(team);
  const lean = u.pass - u.rush + gauss(r) * 2;
  const off = lean > 3 ? (r() < 0.5 ? 'airraid' : 'spread') : lean < -3 ? (r() < 0.7 ? 'power' : 'option') : (r() < 0.5 ? 'pro' : 'spread');
  const dlean = u.rushD - u.passD + gauss(r) * 2;
  const def = dlean > 2 ? 'd43' : dlean < -2 ? 'nickel' : (r() < 0.6 ? 'd34' : 'd335');
  return { off, def, tempo: Math.floor(r() * 3), fourth: Math.floor(r() * 3), blitz: def === 'd335' ? 2 : Math.floor(r() * 3) };
}

// How much a program's prestige appeals to a recruit (stars matter: elite recruits want elite programs).
function pullFor(prestige, c) { return (prestige / 100) ** (1 + c.stars * 0.4); }
// How hard the competition fights for each star level.
const STAR_DEMAND = { 5: 1, 4: 0.8, 3: 0.55, 2: 0.35 };
const STAR_COST = { 5: 6, 4: 2.5, 3: 1.6, 2: 1 };
// Pick an AI suitor weighted toward prestige (more so for higher-star recruits).
function chooseSuitor(L, stars, r, ok = () => true) {
  const cands = L.teams.filter(ok);
  if (!cands.length) return null;
  const w = cands.map(t => (t.prestige / 100) ** (stars * 2.2));
  let x = r() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < cands.length - 1; i++) { x -= w[i]; if (x <= 0) break; }
  const t = cands[i];
  return { id: t.id, pull: pullFor(t.prestige, { stars }) * (0.6 + r() * 0.8) * 40 * STAR_DEMAND[stars] };
}

// A national recruiting class (~1,500 prospects). Each has an AI favourite and that suitor's pull.
function makeRecruitClass(L, r) {
  // Pool sized to ~1.3x the open Power 4 scholarships so the best programs fill up and the rest sign elsewhere.
  const spots = L.teams.reduce((s2, t) => s2 + L.openSpots(t.id), 0);
  const k = (spots * 1.3) / 1250;
  const counts = { 5: Math.round(30 * k), 4: Math.round(300 * k), 3: Math.round(650 * k), 2: Math.round(270 * k) };
  const posWeights = POS_ORDER.map(p => [p, POSITIONS[p][0]]);
  const totalW = posWeights.reduce((s, [, w]) => s + w, 0);
  const out = [];
  let id = 1;
  const states = ['TX', 'FL', 'GA', 'CA', 'OH', 'AL', 'LA', 'PA', 'NC', 'MI', 'TN', 'SC', 'VA', 'AZ', 'IL', 'NJ', 'MS', 'MD', 'WA', 'OK'];
  for (const [stars, n] of Object.entries(counts)) {
    const st = +stars;
    for (let i = 0; i < n; i++) {
      let x = r() * totalW, pos = 'QB';
      for (const [p, w] of posWeights) { x -= w; if (x <= 0) { pos = p; break; } }
      const ovr = Math.round(({ 5: 76, 4: 68, 3: 60, 2: 52 })[st] + r() * 8);
      const pot = clamp(Math.round(({ 5: 94, 4: 88, 3: 80, 2: 72 })[st] + r() * 8), ovr + 5, 99);
      // Top prospects draw several suitors; the strongest leads.
      let s = null;
      for (let k = 0; k < ({ 5: 3, 4: 2, 3: 1, 2: 1 })[st]; k++) { const c2 = chooseSuitor(L, st, r, (t) => t.id !== L.user.teamId); if (!s || c2.pull > s.pull) s = c2; }
      out.push({ id: id++, n: makeName(r), pos, stars: st, ovr, pot, state: pick(r, states), aiTeam: s.id, aiPull: s.pull, userPts: 0, effort: 2, commit: null });
    }
  }
  // National rank by stars then ovr+pot.
  out.sort((a, b) => b.stars - a.stars || (b.ovr + b.pot) - (a.ovr + a.pot));
  out.forEach((c, i) => { c.rank = i + 1; });
  return out;
}

function compactBox(b) {
  return { q: b.q, ot: b.ot || null, team: b.team, players: Object.values(b.players).filter(p => p.att || p.car || p.rec || p.sack || p.defint || p.fga), score: [b.score.h, b.score.a] };
}

export function statLine(s) {
  if (s.att) return `${s.cmp}/${s.att}, ${s.pyd} yds, ${s.ptd || 0} TD, ${s.int || 0} INT${s.car ? ` · ${s.ryd} rush` : ''}`;
  if (s.car) return `${s.car} car, ${s.ryd} yds, ${s.rtd || 0} TD`;
  if (s.rec) return `${s.rec} rec, ${s.recyd} yds, ${s.rectd || 0} TD`;
  if (s.sack || s.defint) return `${s.sack || 0} sacks, ${s.defint || 0} INT`;
  return '';
}

export { OFFENSES, DEFENSES, DEFAULT_PLAN, CONFERENCES };
