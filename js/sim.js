// Drive-by-drive game simulation. Produces a box score; no play-by-play is shown.
import { units, starters, clamp, gauss } from './players.js';

export const OFFENSES = {
  airraid: { name: 'Air Raid', passRate: 0.64, pass: 4, rush: -4, desc: 'Throw it all over the field. Needs a QB and receivers.' },
  spread:  { name: 'Spread', passRate: 0.56, pass: 2, rush: 1, desc: 'Space and tempo, balanced lean to the pass.' },
  pro:     { name: 'Pro Style', passRate: 0.5, pass: 1, rush: 1, desc: 'Balanced and physical. Works with any roster.' },
  power:   { name: 'Power Run', passRate: 0.4, pass: -2, rush: 4, desc: 'Line up and run it. Needs a big O-line and RB.' },
  option:  { name: 'Option', passRate: 0.3, pass: -5, rush: 6, desc: 'Ground and pound with reads. Rarely throws.' },
};
export const DEFENSES = {
  d43:   { name: '4-3', passD: -1, rushD: 3, pressure: 0, desc: 'Stout against the run.' },
  d34:   { name: '3-4', passD: 1, rushD: 1, pressure: 0.01, desc: 'Balanced and flexible.' },
  nickel:{ name: 'Nickel', passD: 3, rushD: -2, pressure: 0, desc: 'Extra DB to stop the pass.' },
  d335:  { name: '3-3-5 Blitz', passD: 1, rushD: -1, pressure: 0.04, desc: 'Chaos: sacks and turnovers, but big plays allowed.' },
};
export const DEFAULT_PLAN = { off: 'pro', def: 'd43', tempo: 1, fourth: 1, blitz: 1 };

// Teams: { roster, depth, plan }. Returns a full box score object.
export function simGame(home, away, r, opts = {}) {
  const neutral = !!opts.neutral;
  const U = { h: units(home), a: units(away) };
  const plan = { h: home.plan || DEFAULT_PLAN, a: away.plan || DEFAULT_PLAN };
  const box = {
    q: { h: [0, 0, 0, 0], a: [0, 0, 0, 0] },
    team: { h: blankTeam(), a: blankTeam() },
    players: {}, // id -> stat line
  };
  const line = (p) => (box.players[p.id] = box.players[p.id] || { id: p.id, n: p.n, pos: p.pos, side: null });

  // Possessions per team: tempo of both teams.
  const pace = 11 + (plan.h.tempo + plan.a.tempo) * 0.6 + gauss(r) * 0.8;
  const drives = Math.round(clamp(pace, 9, 15));
  const order = r() < 0.5 ? ['h', 'a'] : ['a', 'h'];

  for (let d = 0; d < drives * 2; d++) {
    const side = order[d % 2];
    const quarter = Math.min(3, Math.floor((d / (drives * 2)) * 4));
    const pts = drive(side, quarter);
    box.q[side][quarter] += pts;
  }
  // Overtime: alternate possessions until someone leads after a full round.
  let ot = 0;
  while (sum(box.q.h) + (box.ot ? box.ot.h : 0) === sum(box.q.a) + (box.ot ? box.ot.a : 0) && ot < 8) {
    box.ot = box.ot || { h: 0, a: 0 };
    ot++;
    for (const side of ['a', 'h']) box.ot[side] += drive(side, 3, true);
  }
  box.score = { h: sum(box.q.h) + (box.ot ? box.ot.h : 0), a: sum(box.q.a) + (box.ot ? box.ot.a : 0) };
  if (box.score.h === box.score.a) box.score[r() < 0.5 ? 'h' : 'a'] += 3; // tie-break safety
  box.overtimes = ot;
  return box;

  function drive(side, quarter, isOT) {
    const opp = side === 'h' ? 'a' : 'h';
    const O = U[side], D = U[opp], po = plan[side], pd = plan[opp];
    const off = OFFENSES[po.off], def = DEFENSES[pd.def];
    const hfa = !neutral ? (side === 'h' ? 1.5 : -1.5) : 0;
    const passRate = clamp(off.passRate + gauss(r) * 0.06, 0.15, 0.85);
    const passEdge = O.pass + off.pass - (D.passD + def.passD);
    const rushEdge = O.rush + off.rush - (D.rushD + def.rushD);
    const edge = passEdge * passRate + rushEdge * (1 - passRate) + hfa + gauss(r) * 7;
    const blitz = (pd.blitz - 1) * 0.025 + def.pressure;            // defensive aggression
    const agg = (po.fourth - 1);                                    // 4th-down aggression (-1..1)

    let pTD = clamp(0.27 + 0.013 * edge + agg * 0.03 + blitz * 0.6, 0.04, 0.7);
    let pFG = clamp(0.13 + 0.002 * edge - agg * 0.035, 0.02, 0.3);
    let pTO = clamp(0.115 - 0.003 * edge + blitz * 1.2 + (po.tempo - 1) * 0.01, 0.03, 0.3);
    let pTOD = clamp(0.025 + agg * 0.025, 0, 0.12);
    if (isOT) { pTD += 0.1; pFG += 0.15; pTO *= 0.6; }
    const x = r();
    let outcome;
    if (x < pTD) outcome = 'TD';
    else if (x < pTD + pFG) outcome = 'FG';
    else if (x < pTD + pFG + pTO) outcome = 'TO';
    else if (x < pTD + pFG + pTO + pTOD) outcome = 'DOWNS';
    else outcome = 'PUNT';

    // Yardage for the drive.
    const yds = Math.round(
      outcome === 'TD' ? 45 + r() * 40 : outcome === 'FG' ? 30 + r() * 35 : outcome === 'DOWNS' ? 20 + r() * 35
        : outcome === 'TO' ? r() * 40 : 2 + r() * 26);
    const plays = Math.max(1, Math.round(yds / (6.2 + edge * 0.08 + r() * 2.2)) + (outcome === 'PUNT' ? 1 : 0));
    const team = box.team[side];
    team.drives++;
    // Split yardage between pass and rush.
    let passPlays = Math.round(plays * passRate), rushPlays = plays - passPlays;
    let passYds = Math.round(yds * (passRate * 1.15) / (passRate * 1.15 + (1 - passRate) * 0.85));
    let rushYds = yds - passYds;
    // Big play bonus against blitzing defenses.
    if (blitz > 0.02 && r() < blitz * 4 && outcome === 'TD') { passYds += 15; }

    // --- Passing ---
    const S = (t, pos) => starters(t, pos);
    const offTeam = side === 'h' ? home : away, defTeam = side === 'h' ? away : home;
    const qb = S(offTeam, 'QB')[0];
    if (passPlays > 0 && qb) {
      const compRate = clamp(0.58 + (qb.ovr - 75) * 0.004 + passEdge * 0.003 + gauss(r) * 0.04, 0.38, 0.82);
      const att = passPlays;
      const comp = Math.max(0, Math.min(att, Math.round(att * compRate)));
      const L = line(qb); L.side = side;
      L.cmp = (L.cmp || 0) + comp; L.att = (L.att || 0) + att; L.pyd = (L.pyd || 0) + passYds;
      team.cmp += comp; team.att += att; team.pyd += passYds;
      // Distribute catches and yards across receivers.
      const targets = [...S(offTeam, 'WR').map(p => [p, p.ovr * 1.0]), ...S(offTeam, 'TE').map(p => [p, p.ovr * 0.55]), ...S(offTeam, 'RB').map(p => [p, p.ovr * 0.3])];
      let left = passYds;
      for (let c = 0; c < comp; c++) {
        const rc = weighted(r, targets);
        const y = c === comp - 1 ? left : Math.round(left / (comp - c) * (0.5 + r()));
        left -= y;
        const RL = line(rc); RL.side = side;
        RL.rec = (RL.rec || 0) + 1; RL.recyd = (RL.recyd || 0) + y;
      }
      // Sacks
      const sackP = clamp(0.06 + (D.rushPass - O.pass) * 0.003 + blitz * 1.5, 0.01, 0.2);
      for (let i = 0; i < att; i++) if (r() < sackP) {
        team.sacked++;
        const rusher = weighted(r, [...S(defTeam, 'DL').map(p => [p, p.ovr]), ...S(defTeam, 'LB').map(p => [p, p.ovr * 0.6])]);
        const DLn = line(rusher); DLn.side = opp; DLn.sack = (DLn.sack || 0) + 1;
      }
    }
    // --- Rushing ---
    if (rushPlays > 0) {
      const rbs = S(offTeam, 'RB'), qbs = S(offTeam, 'QB');
      const carriers = [[rbs[0], 0.72], [qbs[0], po.off === 'option' ? 0.35 : 0.12], [offTeam.depth.RB[1] && offTeam._byId.get(offTeam.depth.RB[1]), 0.16]].filter(c => c[0]);
      let left = rushYds;
      for (let c = 0; c < rushPlays; c++) {
        const p = weighted(r, carriers);
        const y = c === rushPlays - 1 ? left : Math.round(left / (rushPlays - c) * (0.4 + r() * 1.2));
        left -= y;
        const RL = line(p); RL.side = side;
        RL.car = (RL.car || 0) + 1; RL.ryd = (RL.ryd || 0) + y;
      }
      team.car += rushPlays; team.ryd += rushYds;
    }
    team.plays += plays;
    team.first += Math.max(0, Math.floor(yds / 11));

    // --- Result ---
    if (outcome === 'TD') {
      const passTD = r() < passRate * 1.05;
      if (passTD && qb) {
        const QL = line(qb); QL.ptd = (QL.ptd || 0) + 1;
        const rc = weighted(r, [...S(offTeam, 'WR').map(p => [p, p.ovr]), ...S(offTeam, 'TE').map(p => [p, p.ovr * 0.6]), ...S(offTeam, 'RB').map(p => [p, p.ovr * 0.2])]);
        const RL = line(rc); RL.side = side; RL.rectd = (RL.rectd || 0) + 1;
      } else {
        const ball = weighted(r, [[S(offTeam, 'RB')[0], 0.75], [qb, po.off === 'option' ? 0.4 : 0.15]].filter(c => c[0]));
        const RL = line(ball); RL.side = side; RL.rtd = (RL.rtd || 0) + 1;
      }
      const k = S(offTeam, 'K')[0];
      const xp = r() < 0.94 + (k ? (k.ovr - 70) * 0.002 : 0);
      if (k) { const KL = line(k); KL.side = side; KL.xpa = (KL.xpa || 0) + 1; if (xp) KL.xpm = (KL.xpm || 0) + 1; }
      return 6 + (xp ? 1 : 0);
    }
    if (outcome === 'FG') {
      const k = S(offTeam, 'K')[0];
      const dist = 20 + Math.round(r() * 32);
      const make = r() < clamp(0.97 - (dist - 20) * 0.012 + (k ? (k.ovr - 70) * 0.006 : 0), 0.3, 0.99);
      if (k) { const KL = line(k); KL.side = side; KL.fga = (KL.fga || 0) + 1; if (make) KL.fgm = (KL.fgm || 0) + 1; KL.long = make ? Math.max(KL.long || 0, dist) : (KL.long || 0); }
      return make ? 3 : 0;
    }
    if (outcome === 'TO') {
      team.to++;
      const isInt = r() < passRate * 1.1;
      if (isInt && qb) {
        const QL = line(qb); QL.int = (QL.int || 0) + 1;
        const db = weighted(r, [...S(defTeam, 'CB').map(p => [p, p.ovr]), ...S(defTeam, 'S').map(p => [p, p.ovr * 0.8]), ...S(defTeam, 'LB').map(p => [p, p.ovr * 0.3])]);
        const DB = line(db); DB.side = opp; DB.defint = (DB.defint || 0) + 1;
      } else { team.fum++; }
      // Rare pick-six / scoop-and-score
      if (r() < 0.07) { box.q[opp][quarter] += 7; box.team[opp].dtd = (box.team[opp].dtd || 0) + 1; }
      return 0;
    }
    if (outcome === 'PUNT') {
      const p = S(offTeam, 'P')[0];
      if (p) { const PL = line(p); PL.side = side; PL.punts = (PL.punts || 0) + 1; PL.pyds = (PL.pyds || 0) + Math.round(38 + (p.ovr - 70) * 0.2 + gauss(r) * 5); }
    }
    return 0;
  }
}

function blankTeam() { return { drives: 0, plays: 0, first: 0, cmp: 0, att: 0, pyd: 0, car: 0, ryd: 0, to: 0, fum: 0, sacked: 0 }; }
function sum(a) { return a.reduce((s, x) => s + x, 0); }
function weighted(r, items) {
  let tot = 0;
  for (const [, w] of items) tot += w;
  let x = r() * tot;
  for (const [it, w] of items) { x -= w; if (x <= 0) return it; }
  return items[items.length - 1][0];
}
