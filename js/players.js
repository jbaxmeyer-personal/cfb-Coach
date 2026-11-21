// Player generation, depth charts and unit ratings.
import { FIRST_NAMES, LAST_NAMES, POSITIONS, POS_ORDER } from './teams.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const gauss = (r) => (r() + r() + r() + r() - 2) / 0.8165; // ~N(0,1)

export function makeName(r) { return `${pick(r, FIRST_NAMES)} ${pick(r, LAST_NAMES)}`; }

// A rostered player. ovr 40-99, pot = ceiling, yr 1-4 (FR..SR).
export function makePlayer(r, league, pos, yr, teamPrestige) {
  // Better programs have better rosters; upperclassmen have developed more.
  const base = 52 + teamPrestige * 0.22 + (yr - 1) * 4.5;
  const ovr = clamp(Math.round(base + gauss(r) * 6), 40, 97);
  const pot = clamp(Math.round(ovr + 4 + r() * 14 - (yr - 1) * 2), ovr, 99);
  const stars = ovr >= 84 ? 5 : ovr >= 76 ? 4 : ovr >= 66 ? 3 : 2;
  return { id: league.nextPid++, n: makeName(r), pos, yr, ovr, pot, stars };
}

export function makeRoster(r, league, team) {
  const roster = [];
  for (const pos of POS_ORDER) {
    const [count] = POSITIONS[pos];
    for (let i = 0; i < count; i++) roster.push(makePlayer(r, league, pos, 1 + (i % 4), team.prestige));
  }
  return roster;
}

// Depth chart: pos -> [player ids], best first.
export function autoDepth(roster) {
  const depth = {};
  for (const pos of POS_ORDER) {
    depth[pos] = roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id);
  }
  return depth;
}

// Keep a (possibly user-edited) depth chart valid after roster changes.
export function repairDepth(depth, roster) {
  const out = {};
  const byPos = {};
  for (const p of roster) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  for (const pos of POS_ORDER) {
    const ids = new Set((byPos[pos] || []).map(p => p.id));
    const kept = (depth && depth[pos] || []).filter(id => ids.has(id));
    const rest = (byPos[pos] || []).filter(p => !kept.includes(p.id)).sort((a, b) => b.ovr - a.ovr).map(p => p.id);
    out[pos] = [...kept, ...rest];
  }
  return out;
}

export function starters(team, pos) {
  const n = POSITIONS[pos][1];
  const byId = team._byId || (team._byId = new Map(team.roster.map(p => [p.id, p])));
  return team.depth[pos].slice(0, n).map(id => byId.get(id)).filter(Boolean);
}
const avg = (arr) => (arr.length ? arr.reduce((s, p) => s + p.ovr, 0) / arr.length : 40);

// Unit ratings from the starting lineup.
export function units(team) {
  team._byId = null;
  const S = (pos) => starters(team, pos);
  const QB = avg(S('QB')), RB = avg(S('RB')), WR = avg(S('WR')), TE = avg(S('TE')), OL = avg(S('OL'));
  const DL = avg(S('DL')), LB = avg(S('LB')), CB = avg(S('CB')), SA = avg(S('S')), K = avg(S('K')), P = avg(S('P'));
  return {
    pass: QB * 0.45 + WR * 0.3 + TE * 0.1 + OL * 0.15,
    rush: RB * 0.4 + OL * 0.45 + QB * 0.15,
    passD: CB * 0.4 + SA * 0.3 + LB * 0.1 + DL * 0.2,
    rushD: DL * 0.45 + LB * 0.4 + SA * 0.15,
    rushPass: DL * 0.7 + LB * 0.3,
    K, P,
    ovr: (QB * 2 + RB + WR * 1.5 + TE * 0.5 + OL * 2 + DL * 2 + LB * 1.5 + CB * 1.5 + SA + K * 0.3) / 13.3,
  };
}
