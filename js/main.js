// UI for CFB Coach.
import { TEAMS, CONFERENCES, POS_ORDER, POSITIONS } from './teams.js';
import { League, OFFENSES, DEFENSES, DEFAULT_PLAN, REG_WEEKS, BOARD_MAX, statLine } from './league.js';
import { units, starters } from './players.js';

const $ = (s) => document.querySelector(s);
const view = $('#view');
let L = null;
let tab = 'home';
let sub = { team: 'depth', recruit: 'board', league: 'top25' };
let filters = { pos: 'ALL', stars: 0, conf: 'SEC' };

const T = (id) => TEAMS[id];
const logo = (id, size = '') => `<span class="logo ${size}" style="background:${T(id).color};border-color:${T(id).alt};color:${T(id).alt === '#FFFFFF' ? '#fff' : T(id).alt}">${T(id).short}</span>`;
const rk = (id) => { const r = L.rankOf(id); return r <= 25 ? `<span class="rank">#${r}</span>` : ''; };
const nm = (id) => `${rk(id)}${T(id).name}`;
const starsTxt = (n) => (n ? `<span class="stars">${'★'.repeat(n)}</span>` : '<span class="muted">—</span>');
const YR = ['', 'FR', 'SO', 'JR', 'SR', 'SR', 'SR'];

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}
function modal(html, center = false) { const m = $('#modal'); m.innerHTML = `<div class="sheet ${center ? 'center' : ''}">${html}</div>`; m.classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
function save() { L.save(); }

// ---------------- Header ----------------
function renderTop() {
  const u = L.userTeam, m = T(u.id);
  document.documentElement.style.setProperty('--team', m.color);
  const phase = L.phase === 'regular' ? `Week ${L.week}` : L.phase === 'ccg' ? 'Championship Week' : L.phase === 'playoff' ? ['', 'Playoff · 1st Round', 'Quarterfinals', 'Semifinals', 'National Championship'][L.round] : L.phase === 'done' ? 'Season complete' : 'Offseason';
  $('#top').innerHTML = `<div class="row">${logo(u.id)}
    <div><div class="name">${rk(u.id)}${m.name}</div><div class="sub">${L.year} · ${phase} · Coach ${L.user.name}</div></div>
    <div class="rec"><b>${u.w}-${u.l}</b><div class="sub">${CONFERENCES[m.conf]} ${u.cw}-${u.cl}</div></div></div>`;
}

// ---------------- Views ----------------
function render() {
  renderTop();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  ({ home, schedule, team, recruit, league })[tab]();
}

function home() {
  const u = L.userTeam, g = L.nextUserGame();
  let html = '';
  if (L.phase === 'offseason' && L.offseason) {
    view.innerHTML = `<div class="card"><h3>Offseason</h3><p class="muted">Your offseason decisions are waiting.</p><button class="btn primary" data-act="showoff">Continue</button></div>`;
    return;
  }
  if (L.phase === 'done') {
    const s = L.user.seasons[L.user.seasons.length - 1];
    const h = L.history[L.history.length - 1];
    html += `<div class="card"><h3>🏆 ${L.year} National Champion</h3><div class="matchup"><div class="side">${logo(L.champion)}<b>${T(L.champion).name}</b></div></div>
      ${h.heisman ? `<p class="muted">Heisman: <b style="color:var(--text)">${h.heisman.name}</b> (${h.heisman.pos}, ${T(h.heisman.team).short}) — ${h.heisman.line}</p>` : ''}</div>
      <div class="card"><h3>Your season</h3><div class="big">${s.w}-${s.l}</div>
      <p class="muted">Final rank #${s.rank} · Expected ${s.expect} regular-season wins, got ${s.rw}${s.confChamp ? ' · Conference champs' : ''}${s.playoff ? ' · Made the playoff' : ''}${s.champion ? ' · 🏆 NATIONAL CHAMPIONS' : ''}</p>
      <button class="btn primary" data-act="offseason">Go to the offseason →</button></div>`;
  } else if (g) {
    const homeTeam = g.h === u.id, opp = homeTeam ? g.a : g.h;
    const label = g.kind === 'ccg' ? `${CONFERENCES[g.conf]} Championship` : g.kind === 'cfp' ? ['', 'CFP First Round', 'CFP Quarterfinal', 'CFP Semifinal', 'National Championship'][g.round] : `Week ${g.week}`;
    html += `<div class="card"><h3>Next game <span class="r tag">${label}</span></h3>
      <div class="matchup"><div class="side">${logo(g.a)}<b>${rk(g.a)}${T(g.a).short}</b><span class="muted">${L.team(g.a).w}-${L.team(g.a).l}</span></div>
      <div class="vs">${g.neutral ? 'vs' : '@'}</div>
      <div class="side">${logo(g.h)}<b>${rk(g.h)}${T(g.h).short}</b><span class="muted">${L.team(g.h).w}-${L.team(g.h).l}</span></div></div>
      <p class="muted" style="text-align:center">Team rating ${units(u).ovr.toFixed(0)} vs ${units(L.team(opp)).ovr.toFixed(0)} · ${OFFENSES[u.plan.off].name} / ${DEFENSES[u.plan.def].name}</p>
      <div class="btns"><button class="btn primary" data-act="sim">Play ${L.phase === 'regular' ? 'week' : 'game'}</button>
      ${L.phase === 'regular' && L.week < REG_WEEKS ? '<button class="btn" data-act="simreg">Sim to season end</button>' : ''}</div></div>`;
  } else {
    html += `<div class="card"><h3>Postseason</h3><p class="muted">Your season is over — the rest of the bracket plays on.</p>
      <button class="btn primary" data-act="sim">Sim next round</button><button class="btn" data-act="simall">Sim to the end</button></div>`;
  }
  const last = L.userGames().filter(x => x.box).slice(-1)[0];
  if (last) html += `<div class="card"><h3>Last game</h3>${gameRow(last, true)}</div>`;
  html += `<div class="card"><h3>Program</h3>
    <table><tr><td>Prestige</td><td class="num">${u.prestige}</td></tr>
    <tr><td>Team rating</td><td class="num">${units(u).ovr.toFixed(1)}</td></tr>
    <tr><td>Expectation</td><td class="num">${u.expect} wins</td></tr>
    <tr><td>Coach reputation</td><td class="num">${L.user.rep}</td></tr>
    <tr><td>Job security</td><td class="num">${L.user.hotSeat >= 1 ? '<span class="tag hot">HOT SEAT</span>' : '<span class="tag good">Safe</span>'}</td></tr></table></div>`;
  if (L.news.length) html += `<div class="card news"><h3>News</h3>${L.news.slice(-8).reverse().map(n => `<div>${n}</div>`).join('')}</div>`;
  view.innerHTML = html;
}

function gameRow(g, showWeek = true) {
  const u = L.user.teamId, mine = g.h === u || g.a === u;
  const opp = !mine ? null : g.h === u ? g.a : g.h;
  const wk = g.kind === 'ccg' ? 'CCG' : g.kind === 'cfp' ? ['', 'R1', 'QF', 'SF', 'NC'][g.round] : `W${g.week}`;
  let res = '<span class="muted">—</span>';
  if (g.box) {
    if (mine) { const us = g.h === u ? g.score[0] : g.score[1], them = g.h === u ? g.score[1] : g.score[0]; res = `<span class="${us > them ? 'W' : 'L'}">${us > them ? 'W' : 'L'}</span> ${us}-${them}`; }
    else res = `${g.score[0]}-${g.score[1]}`;
  }
  const label = mine ? `${g.neutral ? 'vs' : g.h === u ? 'vs' : '@'} ${nm(opp)}` : `${nm(g.a)} @ ${nm(g.h)}`;
  return `<div class="game ${g.box ? 'tap' : ''}" data-box="${g.id}">${showWeek ? `<div class="wk">${wk}</div>` : ''}<div class="opp">${label}</div><div class="res">${res}${g.overtimes ? ' OT' : ''}</div></div>`;
}

function schedule() {
  view.innerHTML = `<div class="card"><h3>${L.year} schedule</h3>${L.userGames().map(g => gameRow(g)).join('')}</div>
    <div class="card"><h3>Around the league · ${L.phase === 'regular' ? `Week ${Math.max(1, L.week - (L.weekGames().some(g => g.box) ? 0 : 1))}` : 'latest'}</h3>${lastWeekGames().map(g => gameRow(g, false)).join('') || '<p class="muted">No games played yet.</p>'}</div>`;
}
function lastWeekGames() {
  const played = L.games.filter(g => g.box);
  if (!played.length) return [];
  const wk = Math.max(...played.map(g => g.week));
  const rank = (id) => L.rankOf(id);
  return played.filter(g => g.week === wk).sort((a, b) => Math.min(rank(a.h), rank(a.a)) - Math.min(rank(b.h), rank(b.a))).slice(0, 20);
}

// ---------------- Team ----------------
function team() {
  const seg = `<div class="seg">${[['depth', 'Depth chart'], ['plan', 'Game plan'], ['roster', 'Roster']].map(([k, v]) => `<button data-sub="${k}" class="${sub.team === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  const u = L.userTeam;
  if (sub.team === 'depth') {
    const byId = new Map(u.roster.map(p => [p.id, p]));
    const html = POS_ORDER.map(pos => {
      const n = POSITIONS[pos][1];
      return `<div class="pos"><h4>${pos} · ${n} starter${n > 1 ? 's' : ''}</h4>${u.depth[pos].map((id, i) => {
        const p = byId.get(id);
        return `<div class="pl ${i < n ? 'starter' : ''}"><span class="ovr">${p.ovr}</span><span class="nm">${p.n}${p.portal ? ' <span class="tag">portal</span>' : ''}</span><span class="yr">${YR[p.yr]}</span>
          <button class="mv" data-up="${pos}:${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button class="mv" data-down="${pos}:${i}" ${i === u.depth[pos].length - 1 ? 'disabled' : ''}>▼</button></div>`;
      }).join('')}</div>`;
    }).join('');
    view.innerHTML = seg + `<button class="btn" data-act="autodepth" style="margin:0 0 10px">Auto-set depth chart (best players start)</button>` + html;
    return;
  }
  if (sub.team === 'plan') {
    const p = u.plan;
    const card = (set, k, d, on) => `<button class="${on ? 'on' : ''}" data-${set}="${k}"><b>${d.name}</b>${d.desc}</button>`;
    const slider = (key, label, opts) => `<div class="slider"><label><span>${label}</span><span>${opts[p[key]]}</span></label>
      <div class="seg">${opts.map((o, i) => `<button data-slider="${key}:${i}" class="${p[key] === i ? 'on' : ''}">${o}</button>`).join('')}</div></div>`;
    const U = units(u);
    view.innerHTML = seg + `<div class="card"><h3>Offense <span class="r muted">Pass ${U.pass.toFixed(0)} · Run ${U.rush.toFixed(0)}</span></h3><div class="plan">${Object.entries(OFFENSES).map(([k, d]) => card('off', k, d, p.off === k)).join('')}</div>
      ${slider('tempo', 'Tempo', ['Slow', 'Normal', 'Hurry-up'])}${slider('fourth', '4th-down aggression', ['Conservative', 'Normal', 'Go for it'])}</div>
      <div class="card"><h3>Defense <span class="r muted">Pass D ${U.passD.toFixed(0)} · Run D ${U.rushD.toFixed(0)}</span></h3><div class="plan">${Object.entries(DEFENSES).map(([k, d]) => card('def', k, d, p.def === k)).join('')}</div>
      ${slider('blitz', 'Blitz rate', ['Low', 'Normal', 'High'])}</div>
      <p class="muted">Match your scheme to your roster: a pass-heavy offense needs a QB and receivers; a 3-3-5 blitz forces turnovers but gives up big plays.</p>`;
    return;
  }
  // roster
  const rows = u.roster.slice().sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr).map(p => {
    const s = L.stats[p.id];
    return `<tr><td>${p.pos}</td><td>${p.n}</td><td>${YR[p.yr]}</td><td class="num"><b>${p.ovr}</b></td><td class="num muted">${grade(p.pot)}</td><td>${starsTxt(p.stars)}</td></tr>${s && statLine(s) ? `<tr><td></td><td colspan="5" class="muted" style="font-size:11px;padding-top:0">${statLine(s)}</td></tr>` : ''}`;
  }).join('');
  view.innerHTML = seg + `<div class="card"><h3>Roster · ${u.roster.length} players</h3><table><tr><th>Pos</th><th>Name</th><th>Yr</th><th class="num">OVR</th><th class="num">Pot</th><th>★</th></tr>${rows}</table></div>`;
}
const grade = (pot) => (pot >= 92 ? 'A+' : pot >= 87 ? 'A' : pot >= 82 ? 'B+' : pot >= 77 ? 'B' : pot >= 72 ? 'C+' : pot >= 67 ? 'C' : 'D');

// ---------------- Recruiting ----------------
function recruit() {
  const u = L.userTeam;
  const spots = L.openSpots(u.id), commits = L.userCommits();
  const leaving = {};
  for (const p of u.roster) if (p.yr >= 4) leaving[p.pos] = (leaving[p.pos] || 0) + 1;
  for (const c of commits) leaving[c.pos] = (leaving[c.pos] || 0) - 1;
  const needs = POS_ORDER.map(p => `<span class="${(leaving[p] || 0) >= 2 ? 'hi' : ''}">${p} ${Math.max(0, leaving[p] || 0)}</span>`).join('');
  const head = `<div class="card"><h3>Class of ${L.year + 1} <span class="r">${commits.length}/${spots} commits</span></h3>
    <p class="muted" style="margin-top:0">${L.weeklyPoints()} recruiting points per week, split across your board by effort (1-3). Commitments happen during the season; everyone else signs after the title game.</p>
    <div class="needs">${needs}</div><p class="muted" style="margin-bottom:0">Seniors leaving per position (red = big need).</p></div>`;
  const seg = `<div class="seg">${[['board', `Board (${L.board.length}/${BOARD_MAX})`], ['find', 'Find recruits'], ['class', 'My class']].map(([k, v]) => `<button data-sub="${k}" class="${sub.recruit === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  let body = '';
  if (L.phase !== 'regular') body = `<p class="muted">Recruiting is closed until the regular season. Signed players join your roster in the offseason.</p>`;
  if (sub.recruit === 'board') {
    const list = L.board.map(id => L.recruits.find(c => c.id === id)).filter(Boolean);
    body += list.length ? list.map(c => rcard(c, true)).join('') : '<p class="muted">Your board is empty. Add prospects from "Find recruits".</p>';
  } else if (sub.recruit === 'find') {
    const posOpts = ['ALL', ...POS_ORDER].map(p => `<option ${filters.pos === p ? 'selected' : ''}>${p}</option>`).join('');
    const starOpts = [[0, 'All stars'], [5, '5★'], [4, '4★'], [3, '3★'], [2, '2★']].map(([v, l]) => `<option value="${v}" ${filters.stars === v ? 'selected' : ''}>${l}</option>`).join('');
    const list = L.recruits.filter(c => c.commit == null && (filters.pos === 'ALL' || c.pos === filters.pos) && (!filters.stars || c.stars === filters.stars)).slice(0, 60);
    body += `<div class="btns" style="margin-bottom:8px"><select id="fpos" style="flex:1">${posOpts}</select><select id="fstars" style="flex:1">${starOpts}</select></div>`
      + list.map(c => rcard(c, false)).join('');
  } else {
    body += commits.length ? commits.map(c => rcard(c, false)).join('') : '<p class="muted">No commitments yet.</p>';
  }
  view.innerHTML = head + seg + body;
}
function rcard(c, onBoard) {
  const share = L.interest(c);
  const committed = c.commit === L.user.teamId, lost = c.commit != null && !committed;
  const leader = c.commit != null ? `Committed: ${c.commit === -1 ? 'non-P4' : T(c.commit).short}` : `Leader: ${share >= 0.5 && L.board.includes(c.id) ? T(L.user.teamId).short : (c.aiTeam >= 0 ? T(c.aiTeam).short : '—')}`;
  const right = onBoard && c.commit == null
    ? `<div class="eff">${[1, 2, 3].map(e => `<button data-eff="${c.id}:${e}" class="${(c.effort || 1) === e ? 'on' : ''}">${e}</button>`).join('')}<button data-rm="${c.id}">✕</button></div>`
    : !onBoard && c.commit == null && !L.board.includes(c.id) && L.phase === 'regular' ? `<button class="btn small" data-add="${c.id}">+ Board</button>` : '';
  return `<div class="rc ${committed ? 'committed' : lost ? 'lost' : ''}"><div class="info"><b>#${c.rank} ${c.n}</b>
    <span class="muted">${c.pos} · ${c.state} · ${starsTxt(c.stars)} · OVR ${c.ovr} · Pot ${grade(c.pot)} · ${leader}</span>
    ${L.board.includes(c.id) && c.commit == null ? `<div class="bar"><i style="width:${Math.round(share * 100)}%"></i></div>` : ''}</div>${right}</div>`;
}

// ---------------- League ----------------
function league() {
  const opts = [['top25', 'Top 25'], ['standings', 'Standings'], ['playoff', 'Playoff'], ['leaders', 'Leaders'], ['history', 'History']];
  const seg = `<div class="seg">${opts.map(([k, v]) => `<button data-sub="${k}" class="${sub.league === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  let body = '';
  if (sub.league === 'top25') {
    body = `<div class="card"><table><tr><th>#</th><th>Team</th><th class="num">Record</th><th class="num">Conf</th></tr>${L.rankings.slice(0, 25).map((id, i) => {
      const t = L.team(id);
      return `<tr class="${id === L.user.teamId ? 'me' : ''}"><td>${i + 1}</td><td><span class="tchip"><i style="background:${T(id).color}"></i>${T(id).name}</span></td><td class="num">${t.w}-${t.l}</td><td class="num muted">${T(id).conf === 'IND' ? 'Ind' : CONFERENCES[T(id).conf]}</td></tr>`;
    }).join('')}</table></div>`;
  } else if (sub.league === 'standings') {
    const cs = ['SEC', 'B1G', 'ACC', 'B12'];
    body = `<div class="seg">${cs.map(c => `<button data-conf="${c}" class="${filters.conf === c ? 'on' : ''}">${CONFERENCES[c]}</button>`).join('')}</div>
      <div class="card"><table><tr><th>Team</th><th class="num">Conf</th><th class="num">All</th><th class="num">PF</th><th class="num">PA</th></tr>${L.confStandings(filters.conf).map(id => {
        const t = L.team(id);
        return `<tr class="${id === L.user.teamId ? 'me' : ''}"><td>${nm(id)}</td><td class="num">${t.cw}-${t.cl}</td><td class="num">${t.w}-${t.l}</td><td class="num muted">${t.pf}</td><td class="num muted">${t.pa}</td></tr>`;
      }).join('')}</table></div>`;
  } else if (sub.league === 'playoff') {
    if (!L.seeds) body = `<p class="muted">The 12-team field is set after championship week. Four conference champions get in and the top four seeds get byes.</p>
      <div class="card"><h3>If the season ended today</h3>${L.rankings.slice(0, 12).map((id, i) => `<div class="game"><div class="wk">${i + 1}</div><div class="opp">${T(id).name}</div><div class="res">${L.team(id).w}-${L.team(id).l}</div></div>`).join('')}</div>`;
    else {
      const rounds = [[1, 'First round'], [2, 'Quarterfinals'], [3, 'Semifinals'], [4, 'National Championship']];
      body = `<div class="card bracket">${rounds.map(([r, label]) => {
        const gs = L.games.filter(g => g.kind === 'cfp' && g.round === r);
        if (!gs.length) return '';
        return `<div class="rnd"><h4>${label}</h4>${gs.map(g => {
          const wH = g.box && g.score[0] > g.score[1], wA = g.box && !wH;
          return `<div class="m" data-box="${g.box ? g.id : ''}"><div class="${wA ? 'won' : ''}"><span>${g.seedA}. ${T(g.a).name}</span><span>${g.box ? g.score[1] : ''}</span></div><div class="${wH ? 'won' : ''}"><span>${g.seedH}. ${T(g.h).name}</span><span>${g.box ? g.score[0] : ''}</span></div></div>`;
        }).join('')}</div>`;
      }).join('')}${L.champion != null ? `<p>🏆 <b>${T(L.champion).name}</b> are national champions.</p>` : ''}</div>`;
    }
  } else if (sub.league === 'leaders') {
    const top = (key, label, fmt) => {
      const list = Object.values(L.stats).filter(s => s[key]).sort((a, b) => b[key] - a[key]).slice(0, 5);
      return `<div class="card"><h3>${label}</h3>${list.map(s => {
        const p = L.team(s.team).roster.find(x => x.id === s.id);
        return `<div class="game"><div class="opp">${p ? p.n : '—'} <span class="muted">${T(s.team).short}</span></div><div class="res">${fmt(s)}</div></div>`;
      }).join('') || '<p class="muted">No games yet.</p>'}</div>`;
    };
    body = top('pyd', 'Passing yards', s => `${s.pyd} · ${s.ptd || 0} TD`) + top('ryd', 'Rushing yards', s => `${s.ryd} · ${s.rtd || 0} TD`)
      + top('recyd', 'Receiving yards', s => `${s.recyd} · ${s.rectd || 0} TD`) + top('sack', 'Sacks', s => `${s.sack}`) + top('defint', 'Interceptions', s => `${s.defint}`);
  } else {
    const career = L.user.seasons.slice().reverse().map(s => `<div class="game"><div class="wk">${s.year}</div><div class="opp">${T(s.team).name}</div><div class="res">${s.w}-${s.l}${s.champion ? ' 🏆' : s.playoff ? ' CFP' : ''}</div></div>`).join('');
    const champs = L.history.slice().reverse().map(h => `<div class="game"><div class="wk">${h.year}</div><div class="opp">🏆 ${T(h.champion).name}</div><div class="res muted">${h.heisman ? `Heisman: ${h.heisman.name}` : ''}</div></div>`).join('');
    body = `<div class="card"><h3>Coach ${L.user.name} <span class="r">${L.user.titles} title${L.user.titles === 1 ? '' : 's'}</span></h3>${career || '<p class="muted">Your first season is underway.</p>'}</div>
      <div class="card"><h3>National champions</h3>${champs || '<p class="muted">None yet.</p>'}</div>
      <button class="btn" data-act="newgame">Start a new dynasty</button>`;
  }
  view.innerHTML = seg + body;
}

// ---------------- Box score ----------------
function showBox(id) {
  const g = L.games.find(x => x.id === id);
  if (!g || !g.box) return;
  const b = g.box;
  const qs = (side) => [...b.q[side], ...(b.ot ? [b.ot[side]] : [])];
  const hdr = ['', '1', '2', '3', '4', ...(b.ot ? ['OT'] : []), 'T'];
  const row = (id2, side) => `<tr><td>${rk(id2)}${T(id2).short}</td>${qs(side).map(x => `<td>${x}</td>`).join('')}<td><b>${side === 'h' ? b.score[0] : b.score[1]}</b></td></tr>`;
  const ts = (side) => b.team[side];
  const stat = (label, f) => `<tr><td>${label}</td><td>${f(ts('a'))}</td><td>${f(ts('h'))}</td></tr>`;
  const leaders = (side, teamId) => {
    const ps = b.players.filter(p => p.side === side);
    const best = (k) => ps.filter(p => p[k]).sort((x, y) => y[k] - x[k])[0];
    const pas = best('att'), rus = best('ryd'), rec = best('recyd');
    const def = ps.filter(p => p.sack || p.defint).sort((x, y) => (y.sack || 0) + (y.defint || 0) * 2 - (x.sack || 0) - (x.defint || 0) * 2)[0];
    return `<div class="card leaders"><h3>${T(teamId).name}</h3>
      ${pas ? `<div class="ln"><b>Passing</b>${pas.n} · ${pas.cmp}/${pas.att}, ${pas.pyd} yds, ${pas.ptd || 0} TD, ${pas.int || 0} INT</div>` : ''}
      ${rus ? `<div class="ln"><b>Rushing</b>${rus.n} · ${rus.car} car, ${rus.ryd} yds, ${rus.rtd || 0} TD</div>` : ''}
      ${rec ? `<div class="ln"><b>Receiving</b>${rec.n} · ${rec.rec} rec, ${rec.recyd} yds, ${rec.rectd || 0} TD</div>` : ''}
      ${def ? `<div class="ln"><b>Defense</b>${def.n} · ${def.sack || 0} sacks, ${def.defint || 0} INT</div>` : ''}</div>`;
  };
  modal(`<button class="close" data-act="close">✕</button><div class="box-score">
    <h3 style="margin:0 0 10px">${T(g.a).name} ${g.neutral ? 'vs' : '@'} ${T(g.h).name}</h3>
    <div class="card"><table><tr>${hdr.map(h => `<th>${h}</th>`).join('')}</tr>${row(g.a, 'a')}${row(g.h, 'h')}</table></div>
    <div class="card"><table><tr><th></th><th>${T(g.a).short}</th><th>${T(g.h).short}</th></tr>
      ${stat('Total yards', t => t.pyd + t.ryd)}${stat('Passing', t => `${t.cmp}/${t.att}, ${t.pyd}`)}${stat('Rushing', t => `${t.car}-${t.ryd}`)}
      ${stat('First downs', t => t.first)}${stat('Turnovers', t => t.to)}${stat('Sacks allowed', t => t.sacked)}</table></div>
    ${leaders('a', g.a)}${leaders('h', g.h)}</div>`);
}

// ---------------- Offseason ----------------
function offseason() {
  L.runOffseason();
  save();
  showOffseason(L.offseason);
}
function showOffseason(rep) {
  const u = L.userTeam;
  const cls = (rep.classes[u.id] || []).slice().sort((a, b) => b.stars - a.stars || b.ovr - a.ovr);
  const classRank = rep.classRank.indexOf(u.id) + 1;
  const offers = rep.offers.map(id => `<button class="school" data-job="${id}">${logo(id)}<div class="s"><b>${T(id).name}</b><small>${CONFERENCES[T(id).conf] || 'Independent'} · Prestige ${L.team(id).prestige}</small></div><span>Accept →</span></button>`).join('');
  modal(`<h2 style="margin:4px 0">${rep.fired ? '❌ You\'ve been fired' : `${L.year} offseason`}</h2>
    <p class="muted">${rep.fired ? `${T(u.id).name} let you go after missing expectations.` : rep.hotSeat >= 1 ? '🔥 You\'re on the hot seat. Another bad year and you\'re out.' : rep.perf >= 2 ? 'The administration is thrilled.' : 'A steady year.'} Reputation ${L.user.rep}. Program prestige now ${u.prestige}.</p>
    <div class="card"><h3>Signing class · #${classRank || '—'} nationally</h3>${cls.length ? cls.map(c => `<div class="game"><div class="wk">${c.pos}</div><div class="opp">${c.n} <span class="muted">${c.state}</span></div><div class="res">${starsTxt(c.stars)}</div></div>`).join('') : '<p class="muted">No signees.</p>'}</div>
    <div class="card"><h3>Departures (${rep.departures.length})</h3>${rep.departures.map(d => `<div class="game"><div class="wk">${d.pos}</div><div class="opp">${d.n}</div><div class="res muted">${d.ovr} · ${d.draft ? 'Draft' : 'Grad'}</div></div>`).join('') || '<p class="muted">None.</p>'}</div>
    ${rep.transfers.length ? `<div class="card"><h3>Transfer portal adds (${rep.transfers.length})</h3>${rep.transfers.map(p => `<div class="game"><div class="wk">${p.pos}</div><div class="opp">${p.n}</div><div class="res">${p.ovr}</div></div>`).join('')}</div>` : ''}
    <div class="card"><h3>${rep.fired ? 'Schools willing to hire you' : 'Job offers'}</h3>${offers || '<p class="muted">No offers this year.</p>'}</div>
    ${rep.fired && !rep.offers.length ? '' : rep.fired ? '' : `<button class="btn primary" data-job="-1">Stay at ${T(u.id).name} →</button>`}
    ${rep.fired && !rep.offers.length ? '<button class="btn primary" data-act="newgame">Start over</button>' : ''}`, true);
}

// ---------------- Start screen ----------------
function startScreen() {
  const sorted = TEAMS.slice().sort((a, b) => b.prestige - a.prestige);
  const confs = ['SEC', 'B1G', 'ACC', 'B12', 'IND'];
  $('#top').innerHTML = '';
  document.documentElement.style.setProperty('--team', '#4f8cff');
  view.innerHTML = `<div class="start"><h1>🏈 CFB Coach</h1><p class="muted">Recruit, set your depth chart and game plan, and sim season after season. Win and better jobs come calling. Lose and you're fired.</p>
    <input id="coach" placeholder="Your coach name" value="${filters.coach || ''}" style="width:100%;margin:6px 0 12px" />
    <div class="seg">${confs.map(c => `<button data-pickconf="${c}" class="${filters.startConf === c ? 'on' : ''}">${c === 'IND' ? 'ND' : CONFERENCES[c]}</button>`).join('')}</div>
    ${sorted.filter(t => t.conf === (filters.startConf || 'SEC')).map(t => `<button class="school" data-start="${t.id}">${logo(t.id)}<div class="s"><b>${t.name}</b><small>Prestige ${t.prestige} · ${t.prestige >= 88 ? 'Title or bust' : t.prestige >= 75 ? 'Contender' : t.prestige >= 65 ? 'Rebuild' : 'Long climb'}</small></div><span>›</span></button>`).join('')}</div>`;
  $('#tabs').classList.add('hidden');
}

// ---------------- Events ----------------
document.addEventListener('click', (e) => {
  const el = (sel) => e.target.closest(sel);
  let x;
  if ((x = el('[data-tab]'))) { tab = x.dataset.tab; render(); view.scrollTop = 0; return; }
  if ((x = el('[data-pickconf]'))) { filters.coach = $('#coach').value; filters.startConf = x.dataset.pickconf; startScreen(); return; }
  if ((x = el('[data-start]'))) {
    const name = ($('#coach') && $('#coach').value.trim()) || 'Smith';
    L = League.create(+x.dataset.start, name);
    save(); $('#tabs').classList.remove('hidden'); tab = 'home'; render(); return;
  }
  if ((x = el('[data-box]')) && x.dataset.box) { showBox(+x.dataset.box); return; }
  if ((x = el('[data-sub]'))) { sub[tab] = x.dataset.sub; render(); return; }
  if ((x = el('[data-conf]'))) { filters.conf = x.dataset.conf; render(); return; }
  if ((x = el('[data-up]')) || (x = el('[data-down]'))) {
    const [pos, i] = (x.dataset.up || x.dataset.down).split(':'); const j = +i + (x.dataset.up ? -1 : 1);
    const d = L.userTeam.depth[pos]; [d[+i], d[j]] = [d[j], d[+i]]; L.userTeam._byId = null; save(); render(); return;
  }
  if ((x = el('[data-off]'))) { L.userTeam.plan.off = x.dataset.off; save(); render(); return; }
  if ((x = el('[data-def]'))) { L.userTeam.plan.def = x.dataset.def; save(); render(); return; }
  if ((x = el('[data-slider]'))) { const [k, v] = x.dataset.slider.split(':'); L.userTeam.plan[k] = +v; save(); render(); return; }
  if ((x = el('[data-add]'))) { if (!L.addToBoard(+x.dataset.add)) toast(`Board is full (${BOARD_MAX})`); else toast('Added to your board'); save(); render(); return; }
  if ((x = el('[data-rm]'))) { L.removeFromBoard(+x.dataset.rm); save(); render(); return; }
  if ((x = el('[data-eff]'))) { const [id, v] = x.dataset.eff.split(':'); L.setEffort(+id, +v); save(); render(); return; }
  if ((x = el('[data-job]'))) { const id = +x.dataset.job; L.finishOffseason(id); save(); closeModal(); if (id >= 0) toast(`Welcome to ${T(id).name}!`); tab = 'home'; render(); return; }
  if ((x = el('[data-act]'))) {
    const a = x.dataset.act;
    if (a === 'close') closeModal();
    else if (a === 'sim') { simOnce(); }
    else if (a === 'simreg') { while (L.phase === 'regular') L.simWeek(); save(); render(); toast('Regular season complete'); }
    else if (a === 'simall') { let g = 0; while (L.phase !== 'done' && g++ < 10) L.simWeek(); save(); render(); }
    else if (a === 'offseason') offseason();
    else if (a === 'showoff') showOffseason(L.offseason);
    else if (a === 'autodepth') { L.userTeam.depth = autoDepthFor(L.userTeam); L.userTeam._byId = null; save(); render(); toast('Depth chart set by overall'); }
    else if (a === 'newgame') { if (confirm('Start a new dynasty? Your current save will be erased.')) { League.clear(); closeModal(); L = null; startScreen(); } }
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'fpos') { filters.pos = e.target.value; render(); }
  if (e.target.id === 'fstars') { filters.stars = +e.target.value; render(); }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !L.offseason) closeModal(); });

function autoDepthFor(t) {
  const out = {};
  for (const pos of POS_ORDER) out[pos] = t.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id);
  return out;
}

function simOnce() {
  const before = L.nextUserGame();
  L.simWeek();
  save();
  render();
  if (before && before.box) showBox(before.id);
}

// ---------------- Boot ----------------
L = League.load();
if (L) render(); else startScreen();
window.__cfb = { get L() { return L; } };
