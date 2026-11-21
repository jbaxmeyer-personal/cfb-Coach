// Power 4 conferences + Notre Dame (2026 alignment). Names, colours and ESPN logo IDs.
// prestige: 1-100 starting program strength (recruiting pull + expectations).
export const CONFERENCES = {
  SEC: 'SEC', B1G: 'Big Ten', ACC: 'ACC', B12: 'Big 12', IND: 'Independent',
};

// [name, short, conf, primary colour, prestige]
const RAW = [
  // SEC (16)
  ['Alabama', 'BAMA', 'SEC', '#9E1B32', 93], ['Arkansas', 'ARK', 'SEC', '#9D2235', 68], ['Auburn', 'AUB', 'SEC', '#0C2340', 77],
  ['Florida', 'FLA', 'SEC', '#0021A5', 82], ['Georgia', 'UGA', 'SEC', '#BA0C2F', 94], ['Kentucky', 'UK', 'SEC', '#0033A0', 66],
  ['LSU', 'LSU', 'SEC', '#461D7C', 88], ['Mississippi State', 'MSST', 'SEC', '#660000', 63], ['Missouri', 'MIZ', 'SEC', '#F1B82D', 76],
  ['Oklahoma', 'OU', 'SEC', '#841617', 85], ['Ole Miss', 'MISS', 'SEC', '#14213D', 84], ['South Carolina', 'SC', 'SEC', '#73000A', 75],
  ['Tennessee', 'TENN', 'SEC', '#FF8200', 85], ['Texas', 'TEX', 'SEC', '#BF5700', 92], ['Texas A&M', 'TAMU', 'SEC', '#500000', 84],
  ['Vanderbilt', 'VAN', 'SEC', '#866D4B', 65],
  // Big Ten (18)
  ['Illinois', 'ILL', 'B1G', '#E84A27', 70], ['Indiana', 'IU', 'B1G', '#990000', 80], ['Iowa', 'IOWA', 'B1G', '#FFCD00', 74],
  ['Maryland', 'MD', 'B1G', '#E03A3E', 63], ['Michigan', 'MICH', 'B1G', '#00274C', 89], ['Michigan State', 'MSU', 'B1G', '#18453B', 65],
  ['Minnesota', 'MINN', 'B1G', '#7A0019', 66], ['Nebraska', 'NEB', 'B1G', '#E41C38', 72], ['Northwestern', 'NW', 'B1G', '#4E2A84', 58],
  ['Ohio State', 'OSU', 'B1G', '#BB0000', 95], ['Oregon', 'ORE', 'B1G', '#154733', 91], ['Penn State', 'PSU', 'B1G', '#041E42', 88],
  ['Purdue', 'PUR', 'B1G', '#CEB888', 57], ['Rutgers', 'RUT', 'B1G', '#CC0033', 61], ['UCLA', 'UCLA', 'B1G', '#2D68C4', 67],
  ['USC', 'USC', 'B1G', '#990000', 84], ['Washington', 'UW', 'B1G', '#4B2E83', 78], ['Wisconsin', 'WIS', 'B1G', '#C5050C', 74],
  // ACC (17)
  ['Boston College', 'BC', 'ACC', '#8A100B', 60], ['California', 'CAL', 'ACC', '#003262', 60], ['Clemson', 'CLEM', 'ACC', '#F56600', 86],
  ['Duke', 'DUKE', 'ACC', '#003087', 64], ['Florida State', 'FSU', 'ACC', '#782F40', 80], ['Georgia Tech', 'GT', 'ACC', '#B3A369', 68],
  ['Louisville', 'LOU', 'ACC', '#AD0000', 72], ['Miami', 'MIA', 'ACC', '#F47321', 84], ['NC State', 'NCST', 'ACC', '#CC0000', 66],
  ['North Carolina', 'UNC', 'ACC', '#7BAFD4', 68], ['Pittsburgh', 'PITT', 'ACC', '#003594', 66], ['SMU', 'SMU', 'ACC', '#C8102E', 72],
  ['Stanford', 'STAN', 'ACC', '#8C1515', 58], ['Syracuse', 'SYR', 'ACC', '#F76900', 62], ['Virginia', 'UVA', 'ACC', '#232D4B', 60],
  ['Virginia Tech', 'VT', 'ACC', '#861F41', 66], ['Wake Forest', 'WAKE', 'ACC', '#9E7E38', 58],
  // Big 12 (16)
  ['Arizona', 'ARIZ', 'B12', '#CC0033', 64], ['Arizona State', 'ASU', 'B12', '#8C1D40', 76], ['Baylor', 'BAY', 'B12', '#154734', 70],
  ['BYU', 'BYU', 'B12', '#002E5D', 74], ['Cincinnati', 'CIN', 'B12', '#E00122', 62], ['Colorado', 'COLO', 'B12', '#CFB87C', 72],
  ['Houston', 'HOU', 'B12', '#C8102E', 60], ['Iowa State', 'ISU', 'B12', '#C8102E', 72], ['Kansas', 'KU', 'B12', '#0051BA', 62],
  ['Kansas State', 'KSU', 'B12', '#512888', 74], ['Oklahoma State', 'OKST', 'B12', '#FF7300', 69], ['TCU', 'TCU', 'B12', '#4D1979', 72],
  ['Texas Tech', 'TTU', 'B12', '#CC0000', 75], ['UCF', 'UCF', 'B12', '#BA9B37', 64], ['Utah', 'UTAH', 'B12', '#CC0000', 76],
  ['West Virginia', 'WVU', 'B12', '#002855', 64],
  // Independent
  ['Notre Dame', 'ND', 'IND', '#0C2340', 90],
];

// Secondary colours for badges.
const ALT = {
  BAMA: '#FFFFFF', ARK: '#FFFFFF', AUB: '#E87722', FLA: '#FA4616', UGA: '#000000', UK: '#FFFFFF', LSU: '#FDD023', MSST: '#FFFFFF',
  MIZ: '#000000', OU: '#FDF9D8', MISS: '#CE1126', SC: '#000000', TENN: '#FFFFFF', TEX: '#FFFFFF', TAMU: '#FFFFFF', VAN: '#000000',
  ILL: '#13294B', IU: '#EEEDEB', IOWA: '#000000', MD: '#FFD520', MICH: '#FFCB05', MSU: '#FFFFFF', MINN: '#FFCC33', NEB: '#FFFFFF',
  NW: '#FFFFFF', OSU: '#A7B1B7', ORE: '#FEE123', PSU: '#FFFFFF', PUR: '#000000', RUT: '#FFFFFF', UCLA: '#FFD100', USC: '#FFC72C',
  UW: '#B7A57A', WIS: '#FFFFFF', BC: '#BC9B6A', CAL: '#FDB515', CLEM: '#522D80', DUKE: '#FFFFFF', FSU: '#CEB888', GT: '#003057',
  LOU: '#000000', MIA: '#005030', NCST: '#FFFFFF', UNC: '#13294B', PITT: '#FFB81C', SMU: '#0033A0', STAN: '#FFFFFF', SYR: '#000E54',
  UVA: '#F84C1E', VT: '#E5751F', WAKE: '#000000', ARIZ: '#003366', ASU: '#FFC627', BAY: '#FFB81C', BYU: '#FFFFFF', CIN: '#000000',
  COLO: '#000000', HOU: '#FFFFFF', ISU: '#F1BE48', KU: '#E8000D', KSU: '#FFFFFF', OKST: '#000000', TCU: '#A3A9AC', TTU: '#000000',
  UCF: '#000000', UTAH: '#FFFFFF', WVU: '#EAAA00', ND: '#C99700',
};
// ESPN team IDs -> logos hot-linked from ESPN's CDN (not bundled in this repo).
const ESPN = {
  BAMA: 333, ARK: 8, AUB: 2, FLA: 57, UGA: 61, UK: 96, LSU: 99, MSST: 344, MIZ: 142, OU: 201, MISS: 145, SC: 2579,
  TENN: 2633, TEX: 251, TAMU: 245, VAN: 238,
  ILL: 356, IU: 84, IOWA: 2294, MD: 120, MICH: 130, MSU: 127, MINN: 135, NEB: 158, NW: 77, OSU: 194, ORE: 2483,
  PSU: 213, PUR: 2509, RUT: 164, UCLA: 26, USC: 30, UW: 264, WIS: 275,
  BC: 103, CAL: 25, CLEM: 228, DUKE: 150, FSU: 52, GT: 59, LOU: 97, MIA: 2390, NCST: 152, UNC: 153, PITT: 221,
  SMU: 2567, STAN: 24, SYR: 183, UVA: 258, VT: 259, WAKE: 154,
  ARIZ: 12, ASU: 9, BAY: 239, BYU: 252, CIN: 2132, COLO: 38, HOU: 248, ISU: 66, KU: 2305, KSU: 2306, OKST: 197,
  TCU: 2628, TTU: 2641, UCF: 2116, UTAH: 254, WVU: 277,
  ND: 87,
};
const espnLogo = (id, dark = true) => `https://a.espncdn.com/i/teamlogos/ncaa/${dark ? '500-dark' : '500'}/${id}.png`;
export const TEAMS = RAW.map(([name, short, conf, color, prestige], i) => ({ id: i, name, short, conf, color, alt: ALT[short] || '#FFFFFF', prestige,
  logo: ESPN[short] ? espnLogo(ESPN[short]) : null, logoLight: ESPN[short] ? espnLogo(ESPN[short], false) : null }));
export const TEAM_BY_SHORT = Object.fromEntries(TEAMS.map(t => [t.short, t]));

export const FIRST_NAMES = ['Jaylen','Marcus','Tyler','Jordan','Caleb','Malik','Trey','Devin','Isaiah','Brandon','Cameron','Elijah','Josh','Chris','Darius','Xavier','Jalen','Bryce','Drew','Cole','Tre','Kendrick','Austin','Noah','Ethan','Carson','Quinn','Dante','Jace','Ty','Andre','Micah','Zion','Keon','Jamari','Nico','Luke','Blake','Mason','Garrett','Kobe','Deion','Amari','Rashad','Cade','Brock','Hunter','Logan','Javon','Terrell','DJ','AJ','Shedeur','Arch','Quinton','Tavion','Emeka','Kyren','Omarion','Sam','Jack','Will','Riley','Bo','Gavin','Max','Owen','Peyton','Reggie','Tommy'];
export const LAST_NAMES = ['Johnson','Williams','Smith','Brown','Jones','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark','Lewis','Walker','Hall','Allen','Young','King','Wright','Scott','Green','Baker','Adams','Nelson','Hill','Campbell','Mitchell','Carter','Roberts','Turner','Phillips','Parker','Evans','Edwards','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Bell','Bailey','Cooper','Richardson','Cox','Howard','Ward','Brooks','Watson','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Washington','Butler','Simmons','Foster','Bryant','Alexander','Russell','Griffin','Hayes','Myers','Ford','Hamilton','Graham','Sullivan','Wallace','Woods','Cole','West','Jordan','Owens','Reynolds','Fisher','Ellis','Harrison','Gibson','McDonald','Cruz','Marshall','Gomez','Murray','Freeman','Wells','Webb','Simpson','Stevens','Tucker','Porter','Hunter','Hicks','Crawford','Boyd','Mason','Warren','Dixon','Ramos','Burns','Gordon','Shaw','Holmes','Rice','Hunt','Black','Daniels','Palmer','Mills','Grant','Knight','Ferguson','Stone','Hawkins','Dunn','Perkins','Hudson','Spencer','Gardner','Stephens','Payne','Pierce','Berry','Matthews','Arnold','Wagner','Willis','Ray','Watkins','Olson','Carroll','Duncan','Snyder','Hart','Cunningham','Bradley','Lane','Andrews','Harper','Fox','Riley','Armstrong','Carpenter','Weaver','Greene','Lawrence','Elliott','Chavez','Sims','Austin','Peters','Kelley','Franklin','Lawson'];

// Roster template: position -> [roster count, starters]
export const POSITIONS = {
  QB: [4, 1], RB: [4, 1], WR: [8, 3], TE: [4, 1], OL: [13, 5],
  DL: [10, 4], LB: [8, 3], CB: [7, 2], S: [6, 2], K: [2, 1], P: [2, 1],
};
export const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
export const ROSTER_MAX = 85;
