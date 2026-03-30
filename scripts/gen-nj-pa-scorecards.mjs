/**
 * One-off generator: writes lib/scorecards/nj-pa-directory.json from NJ/PA markdown source data.
 * Run: node scripts/gen-nj-pa-scorecards.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "lib/scorecards/nj-pa-directory.json");

function holesFromRows(pars, yards, holeStart, handicaps) {
  return pars.map((par, i) => ({
    holeNumber: holeStart + i,
    par,
    yardage: yards[i],
    handicap: handicaps[i],
  }));
}

/** Split total yards across 9 holes by par weights (3=short, 5=long). */
function syntheticNine(totalYds, pars, holeOffset, hcpOffset) {
  const w = pars.map((p) => (p === 3 ? 0.24 : p === 5 ? 1.32 : 1));
  const sw = w.reduce((a, b) => a + b, 0);
  const y = w.map((x) => Math.round((totalYds * x) / sw));
  const drift = totalYds - y.reduce((a, b) => a + b, 0);
  y[y.length - 1] += drift;
  return pars.map((par, i) => ({
    holeNumber: holeOffset + i,
    par,
    yardage: y[i],
    handicap: ((hcpOffset + i - 1) % 18) + 1,
  }));
}

const par36a = [4, 4, 3, 5, 4, 4, 3, 5, 4];
const par36b = [4, 5, 3, 4, 4, 3, 5, 4, 4];

const courses = [];

// --- Neshanic Valley (3x 18 combos, Blue tees) ---
const Mpar = [4, 4, 3, 5, 4, 3, 5, 4, 4];
const Mblue = [388, 400, 185, 505, 355, 170, 500, 380, 365];
const Lpar = [4, 5, 3, 4, 4, 3, 5, 4, 4];
const Lblue = [395, 510, 190, 378, 362, 178, 498, 385, 360];
const Rpar = [4, 3, 5, 4, 4, 5, 3, 4, 4];
const Rblue = [390, 180, 515, 372, 357, 498, 175, 380, 388];

function combine18(aP, aY, bP, bY, id, name, city, state, lat, lng, tees) {
  const h1 = aP.map((par, i) => ({
    holeNumber: i + 1,
    par,
    yardage: aY[i],
    handicap: i + 1,
  }));
  const h2 = bP.map((par, i) => ({
    holeNumber: i + 10,
    par,
    yardage: bY[i],
    handicap: i + 10,
  }));
  courses.push({
    courseId: id,
    name,
    city,
    state: state,
    country: "USA",
    latitude: lat,
    longitude: lng,
    holes: [...h1, ...h2],
    tees,
  });
}

const neshanicTees = [
  { teeId: "blue", name: "Blue", color: "Blue", rating: 72.0, slope: 131, front9Yards: 3248, back9Yards: 3256, totalYards: 6504 },
  { teeId: "black", name: "Black", color: "Black", rating: 74.5, slope: 136, front9Yards: 3500, back9Yards: 3500, totalYards: 7108 },
  { teeId: "white", name: "White", color: "White", rating: 69.5, slope: 124, front9Yards: 2983, back9Yards: 2990, totalYards: 5973 },
];

combine18(
  Mpar,
  Mblue,
  Lpar,
  Lblue,
  "neshanic-valley-meadow-lake",
  "Neshanic Valley GC (Meadow / Lake 18)",
  "Neshanic Station",
  "NJ",
  40.5641,
  -74.5824,
  neshanicTees,
);
combine18(
  Lpar,
  Lblue,
  Rpar,
  Rblue,
  "neshanic-valley-lake-ridge",
  "Neshanic Valley GC (Lake / Ridge 18)",
  "Neshanic Station",
  "NJ",
  40.5641,
  -74.5824,
  neshanicTees,
);
combine18(
  Mpar,
  Mblue,
  Rpar,
  Rblue,
  "neshanic-valley-meadow-ridge",
  "Neshanic Valley GC (Meadow / Ridge 18)",
  "Neshanic Station",
  "NJ",
  40.5641,
  -74.5824,
  neshanicTees,
);

// Fix tee yard totals to match actual blue hole sums per combo
for (const c of courses.filter((x) => x.courseId.startsWith("neshanic"))) {
  const f = c.holes.slice(0, 9).reduce((s, h) => s + h.yardage, 0);
  const b = c.holes.slice(9).reduce((s, h) => s + h.yardage, 0);
  const blue = c.tees.find((t) => t.teeId === "blue");
  if (blue) {
    blue.front9Yards = f;
    blue.back9Yards = b;
    blue.totalYards = f + b;
  }
}

// --- Ash Brook ---
courses.push({
  courseId: "ash-brook-golf-course",
  name: "Ash Brook Golf Course",
  city: "Scotch Plains",
  state: "NJ",
  country: "USA",
  latitude: 40.6522,
  longitude: -74.3767,
  holes: [
    ...holesFromRows(
      [4, 4, 3, 5, 4, 3, 5, 4, 4],
      [380, 415, 185, 530, 395, 170, 520, 385, 379],
      1,
      [9, 3, 15, 7, 5, 17, 11, 13, 1],
    ),
    ...holesFromRows(
      [4, 3, 5, 4, 4, 3, 5, 4, 4],
      [400, 195, 545, 390, 405, 180, 510, 375, 400],
      10,
      [4, 16, 8, 2, 6, 18, 10, 14, 12],
    ),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 72.5, slope: 127, front9Yards: 3359, back9Yards: 3200, totalYards: 6559 },
    { teeId: "white", name: "White", color: "White", rating: 70.5, slope: 122, front9Yards: 3145, back9Yards: 2785, totalYards: 6200 },
    { teeId: "gold", name: "Gold", color: "Gold", rating: 67.8, slope: 116, front9Yards: 2900, back9Yards: 2650, totalYards: 5750 },
    { teeId: "red", name: "Red", color: "Red", rating: 72.0, slope: 120, front9Yards: 2650, back9Yards: 2500, totalYards: 5300 },
  ],
});

// --- Quail Brook ---
courses.push({
  courseId: "quail-brook-golf-course",
  name: "Quail Brook Golf Course",
  city: "Somerset",
  state: "NJ",
  country: "USA",
  latitude: 40.495,
  longitude: -74.535,
  holes: [
    ...[4, 4, 3, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [390, 355, 185, 525, 375, 400, 175, 510, 380][i],
      handicap: [7, 13, 15, 3, 9, 5, 17, 11, 1][i],
    })),
    ...[4, 3, 4, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [395, 190, 360, 520, 385, 370, 180, 514, 370][i],
      handicap: [6, 16, 14, 2, 8, 12, 18, 4, 10][i],
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.2, slope: 122, front9Yards: 3295, back9Yards: 3174, totalYards: 6469 },
    { teeId: "white", name: "White", color: "White", rating: 69.0, slope: 117, front9Yards: 3076, back9Yards: 3065, totalYards: 6100 },
    { teeId: "gold", name: "Gold", color: "Gold", rating: 66.0, slope: 110, front9Yards: 2850, back9Yards: 2750, totalYards: 5600 },
  ],
});

// --- Green Knoll ---
courses.push({
  courseId: "green-knoll-golf-course",
  name: "Green Knoll Golf Course",
  city: "Bridgewater",
  state: "NJ",
  country: "USA",
  latitude: 40.5947,
  longitude: -74.6176,
  holes: [
    ...[4, 5, 3, 4, 4, 3, 5, 4, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [380, 520, 175, 360, 395, 165, 510, 370, 457][i],
      handicap: [9, 3, 17, 13, 5, 15, 7, 11, 1][i],
    })),
    ...[4, 3, 4, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [375, 185, 350, 515, 385, 362, 178, 518, 392][i],
      handicap: [8, 16, 14, 2, 6, 12, 18, 4, 10][i],
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.8, slope: 120, front9Yards: 3332, back9Yards: 3260, totalYards: 6592 },
    { teeId: "white", name: "White", color: "White", rating: 68.5, slope: 114, front9Yards: 3100, back9Yards: 3039, totalYards: 5950 },
    { teeId: "gold", name: "Gold", color: "Gold", rating: 65.5, slope: 108, front9Yards: 2880, back9Yards: 2820, totalYards: 5450 },
  ],
});

// --- Spooky Brook (no hdcp in MD for some — use sequence) ---
courses.push({
  courseId: "spooky-brook-golf-course",
  name: "Spooky Brook Golf Course",
  city: "Somerset",
  state: "NJ",
  country: "USA",
  latitude: 40.5646,
  longitude: -74.5385,
  holes: [
    ...[4, 5, 4, 3, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [385, 525, 390, 180, 400, 365, 175, 530, 395][i],
      handicap: i + 1,
    })),
    ...[4, 3, 5, 4, 4, 3, 4, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [380, 190, 520, 395, 375, 185, 385, 540, 385][i],
      handicap: i + 10,
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.0, slope: 121, front9Yards: 3345, back9Yards: 3155, totalYards: 6500 },
    { teeId: "white", name: "White", color: "White", rating: 69.0, slope: 116, front9Yards: 3126, back9Yards: 3135, totalYards: 6261 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.5, slope: 118, front9Yards: 2900, back9Yards: 2900, totalYards: 5400 },
  ],
});

// --- Flanders Blue/White (synthetic hole split from nine totals) ---
const flBlueF = syntheticNine(3185, par36a, 1, 1);
const flBlueB = syntheticNine(3165, par36b, 10, 10);
courses.push({
  courseId: "flanders-valley-blue-white",
  name: "Flanders Valley GC (Blue / White 18)",
  city: "Flanders",
  state: "NJ",
  country: "USA",
  latitude: 40.8221,
  longitude: -74.6881,
  holes: [...flBlueF, ...flBlueB],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 72.5, slope: 130, front9Yards: 3400, back9Yards: 3370, totalYards: 6770 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.5, slope: 126, front9Yards: 3185, back9Yards: 3165, totalYards: 6350 },
    { teeId: "white", name: "White", color: "White", rating: 68.0, slope: 119, front9Yards: 2960, back9Yards: 2940, totalYards: 5900 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.0, slope: 117, front9Yards: 2600, back9Yards: 2600, totalYards: 5200 },
  ],
});

// --- Sunset Valley ---
courses.push({
  courseId: "sunset-valley-golf-course",
  name: "Sunset Valley Golf Course",
  city: "Pompton Plains",
  state: "NJ",
  country: "USA",
  latitude: 40.9595,
  longitude: -74.2948,
  holes: [
    ...[4, 5, 3, 4, 4, 3, 4, 5, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [375, 520, 185, 395, 370, 170, 410, 510, 395][i],
      handicap: [9, 3, 15, 5, 11, 17, 7, 1, 13][i],
    })),
    ...[4, 3, 4, 5, 4, 3, 4, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [390, 190, 360, 525, 380, 175, 395, 515, 370][i],
      handicap: [6, 16, 14, 2, 8, 18, 4, 10, 12][i],
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.2, slope: 128, front9Yards: 3330, back9Yards: 3300, totalYards: 6400 },
    { teeId: "white", name: "White", color: "White", rating: 68.8, slope: 121, front9Yards: 3106, back9Yards: 3081, totalYards: 6187 },
    { teeId: "gold", name: "Gold", color: "Gold", rating: 66.0, slope: 114, front9Yards: 2880, back9Yards: 2850, totalYards: 5500 },
    { teeId: "red", name: "Red", color: "Red", rating: 68.5, slope: 116, front9Yards: 2650, back9Yards: 2600, totalYards: 5050 },
  ],
});

// --- Pinch Brook executive ---
courses.push({
  courseId: "pinch-brook-golf-course",
  name: "Pinch Brook Golf Course",
  city: "Florham Park",
  state: "NJ",
  country: "USA",
  latitude: 40.7667,
  longitude: -74.4001,
  holes: [
    ...[4, 4, 3, 4, 4, 3, 4, 4, 3].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [320, 340, 155, 310, 350, 145, 330, 360, 165][i],
      handicap: i + 1,
    })),
    ...[3, 3, 4, 3, 3, 3, 3, 4, 3].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [150, 145, 310, 150, 155, 140, 145, 330, 150][i],
      handicap: i + 10,
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 61.5, slope: 102, front9Yards: 2475, back9Yards: 1725, totalYards: 4200 },
    { teeId: "white", name: "White", color: "White", rating: 59.5, slope: 97, front9Yards: 2265, back9Yards: 1685, totalYards: 3950 },
  ],
});

// --- Mercer Oaks West (synthetic from nine totals) ---
const moBlackF = syntheticNine(3430, par36a, 1, 1);
const moBlackB = syntheticNine(3370, par36b, 10, 10);
courses.push({
  courseId: "mercer-oaks-west",
  name: "Mercer Oaks GC (West Course)",
  city: "West Windsor",
  state: "NJ",
  country: "USA",
  latitude: 40.2681,
  longitude: -74.6556,
  holes: [...moBlackF, ...moBlackB],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 72.8, slope: 132, front9Yards: 3430, back9Yards: 3370, totalYards: 6800 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.5, slope: 126, front9Yards: 3210, back9Yards: 3140, totalYards: 6350 },
    { teeId: "white", name: "White", color: "White", rating: 68.2, slope: 118, front9Yards: 2980, back9Yards: 2920, totalYards: 5900 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.0, slope: 117, front9Yards: 2620, back9Yards: 2580, totalYards: 5200 },
  ],
});

// --- Mountain View ---
courses.push({
  courseId: "mountain-view-golf-course-ewing",
  name: "Mountain View Golf Course",
  city: "Ewing",
  state: "NJ",
  country: "USA",
  latitude: 40.2647,
  longitude: -74.7999,
  holes: [
    ...[4, 5, 4, 3, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [390, 530, 385, 185, 405, 370, 175, 520, 385][i],
      handicap: i + 1,
    })),
    ...[4, 3, 4, 5, 4, 3, 4, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [380, 190, 365, 525, 385, 185, 395, 530, 400][i],
      handicap: i + 10,
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.0, slope: 124, front9Yards: 3345, back9Yards: 3155, totalYards: 6500 },
    { teeId: "white", name: "White", color: "White", rating: 68.5, slope: 117, front9Yards: 3124, back9Yards: 3135, totalYards: 6259 },
    { teeId: "red", name: "Red", color: "Red", rating: 69.8, slope: 115, front9Yards: 2900, back9Yards: 2900, totalYards: 5300 },
  ],
});

// --- Cream Ridge ---
const crF = syntheticNine(3300, par36a, 1, 1);
const crB = syntheticNine(3300, par36b, 10, 10);
courses.push({
  courseId: "cream-ridge-golf-course",
  name: "Cream Ridge Golf Course",
  city: "Cream Ridge",
  state: "NJ",
  country: "USA",
  latitude: 40.1317,
  longitude: -74.4765,
  holes: [...crF, ...crB],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.5, slope: 122, front9Yards: 3300, back9Yards: 3300, totalYards: 6600 },
    { teeId: "white", name: "White", color: "White", rating: 69.5, slope: 116, front9Yards: 3100, back9Yards: 3100, totalYards: 6200 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.5, slope: 115, front9Yards: 2750, back9Yards: 2750, totalYards: 5500 },
  ],
});

// --- Tamarack West (synthetic; tee table only in MD) ---
const twF = syntheticNine(3350, par36a, 1, 1);
const twB = syntheticNine(3350, par36b, 10, 10);
courses.push({
  courseId: "tamarack-golf-course-west",
  name: "Tamarack GC (West Course)",
  city: "East Brunswick",
  state: "NJ",
  country: "USA",
  latitude: 40.4597,
  longitude: -74.3981,
  holes: [...twF, ...twB],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 72.0, slope: 128, front9Yards: 3350, back9Yards: 3350, totalYards: 6700 },
    { teeId: "white", name: "White", color: "White", rating: 70.2, slope: 124, front9Yards: 3175, back9Yards: 3174, totalYards: 6349 },
    { teeId: "red", name: "Red", color: "Red", rating: 71.0, slope: 120, front9Yards: 2750, back9Yards: 2750, totalYards: 5500 },
  ],
});

// --- Five Ponds ---
courses.push({
  courseId: "five-ponds-golf-club",
  name: "Five Ponds Golf Club",
  city: "Warminster",
  state: "PA",
  country: "USA",
  latitude: 40.214,
  longitude: -75.0826,
  holes: [
    ...[4, 5, 3, 4, 4, 3, 5, 4, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [375, 498, 175, 360, 385, 155, 512, 345, 372][i],
      handicap: [11, 5, 13, 7, 1, 17, 3, 15, 9][i],
    })),
    ...[4, 3, 4, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [390, 170, 353, 502, 367, 380, 165, 498, 313][i],
      handicap: [2, 16, 12, 4, 8, 6, 18, 10, 14][i],
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.2, slope: 125, front9Yards: 3177, back9Yards: 3138, totalYards: 6315 },
    { teeId: "black", name: "Black", color: "Black", rating: 72.1, slope: 130, front9Yards: 3395, back9Yards: 3350, totalYards: 6745 },
    { teeId: "white", name: "White", color: "White", rating: 68.0, slope: 118, front9Yards: 2926, back9Yards: 2899, totalYards: 5825 },
    { teeId: "red", name: "Red", color: "Red", rating: 69.5, slope: 116, front9Yards: 2650, back9Yards: 2550, totalYards: 5200 },
  ],
});

// --- Makefield Highlands (Black tees in hole table; Blue/White from MD)
const mkHolesBlackFront = [390, 535, 200, 410, 375, 185, 530, 385, 390];
const mkHolesBlackBack = [420, 195, 370, 545, 380, 400, 190, 525, 395];
courses.push({
  courseId: "makefield-highlands-golf-club",
  name: "Makefield Highlands Golf Club",
  city: "Yardley",
  state: "PA",
  country: "USA",
  latitude: 40.2451,
  longitude: -74.846,
  holes: [
    ...[4, 5, 3, 4, 4, 3, 5, 4, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: mkHolesBlackFront[i],
      handicap: [9, 5, 13, 3, 11, 17, 1, 7, 15][i],
    })),
    ...[4, 3, 4, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: mkHolesBlackBack[i],
      handicap: [2, 16, 14, 4, 8, 6, 18, 10, 12][i],
    })),
  ],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 72.8, slope: 135, front9Yards: 3400, back9Yards: 3420, totalYards: 6820 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.5, slope: 128, front9Yards: 3180, back9Yards: 3201, totalYards: 6381 },
    { teeId: "white", name: "White", color: "White", rating: 68.2, slope: 120, front9Yards: 2930, back9Yards: 2951, totalYards: 5881 },
    { teeId: "red", name: "Red", color: "Red", rating: 69.8, slope: 118, front9Yards: 2650, back9Yards: 2650, totalYards: 5200 },
  ],
});

// --- Bucks Club (hole sum 6720 black) ---
courses.push({
  courseId: "the-bucks-club",
  name: "The Bucks Club",
  city: "Jamison",
  state: "PA",
  country: "USA",
  latitude: 40.2547,
  longitude: -75.0744,
  holes: [
    ...[4, 4, 3, 5, 4, 3, 4, 5, 4].map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: [380, 410, 185, 530, 370, 175, 400, 520, 390][i],
      handicap: [11, 5, 15, 3, 13, 17, 7, 1, 9][i],
    })),
    ...[4, 3, 4, 5, 4, 4, 3, 5, 4].map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: [405, 190, 365, 535, 380, 395, 180, 525, 385][i],
      handicap: [4, 16, 14, 2, 8, 6, 18, 10, 12][i],
    })),
  ],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 71.5, slope: 128, front9Yards: 3360, back9Yards: 3360, totalYards: 6720 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 69.5, slope: 122, front9Yards: 3139, back9Yards: 3141, totalYards: 6280 },
    { teeId: "white", name: "White", color: "White", rating: 67.2, slope: 115, front9Yards: 2891, back9Yards: 2891, totalYards: 5782 },
    { teeId: "red", name: "Red", color: "Red", rating: 68.8, slope: 113, front9Yards: 2600, back9Yards: 2550, totalYards: 5150 },
  ],
});

// --- Fairways Golf Club — scale IN blues to match 4650 total ---
const fairOutPar = [4, 3, 4, 3, 4, 3, 4, 3, 4];
const fairOutBlue = [310, 155, 295, 160, 325, 145, 315, 170, 305];
const fairInPar = [4, 3, 4, 3, 5, 3, 4, 3, 4];
const fairInBlueRaw = [320, 150, 310, 165, 300, 155, 330, 145, 321];
const fairOutSum = fairOutBlue.reduce((a, b) => a + b, 0);
const targetIn = 4650 - fairOutSum;
const fairInSum = fairInBlueRaw.reduce((a, b) => a + b, 0);
const fairInBlue = fairInBlueRaw.map((y) => Math.round((y * targetIn) / fairInSum));
let drift = targetIn - fairInBlue.reduce((a, b) => a + b, 0);
fairInBlue[fairInBlue.length - 1] += drift;

courses.push({
  courseId: "fairways-golf-club-warrington",
  name: "Fairways Golf Club",
  city: "Warrington",
  state: "PA",
  country: "USA",
  latitude: 40.2476,
  longitude: -75.1358,
  holes: [
    ...fairOutPar.map((par, i) => ({
      holeNumber: i + 1,
      par,
      yardage: fairOutBlue[i],
      handicap: [7, 17, 9, 15, 5, 18, 11, 13, 3][i],
    })),
    ...fairInPar.map((par, i) => ({
      holeNumber: i + 10,
      par,
      yardage: fairInBlue[i],
      handicap: [4, 16, 8, 14, 12, 18, 2, 16, 1][i],
    })),
  ],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 62.5, slope: 103, front9Yards: fairOutSum, back9Yards: targetIn, totalYards: 4650 },
    { teeId: "white", name: "White", color: "White", rating: 60.5, slope: 97, front9Yards: 1975, back9Yards: 1991, totalYards: 4300 },
    { teeId: "red", name: "Red", color: "Red", rating: 61.5, slope: 98, front9Yards: 1800, back9Yards: 1800, totalYards: 3900 },
  ],
});

// --- Jeffersonville ---
const jfF = syntheticNine(3340, par36a, 1, 1);
const jfB = syntheticNine(3260, [4, 3, 4, 5, 4, 3, 4, 5, 4], 10, 10);
courses.push({
  courseId: "jeffersonville-golf-club",
  name: "Jeffersonville Golf Club",
  city: "Norristown",
  state: "PA",
  country: "USA",
  latitude: 40.1218,
  longitude: -75.3395,
  holes: [...jfF, ...jfB],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 72.0, slope: 128, front9Yards: 3340, back9Yards: 3260, totalYards: 6600 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.0, slope: 123, front9Yards: 3140, back9Yards: 3060, totalYards: 6200 },
    { teeId: "white", name: "White", color: "White", rating: 67.5, slope: 116, front9Yards: 2940, back9Yards: 2860, totalYards: 5800 },
    { teeId: "red", name: "Red", color: "Red", rating: 69.2, slope: 114, front9Yards: 2550, back9Yards: 2550, totalYards: 5100 },
  ],
});

// --- Macoby Run ---
const macF = syntheticNine(3420, par36a, 1, 1);
const macB = syntheticNine(3380, par36b, 10, 10);
courses.push({
  courseId: "macoby-run-golf-course",
  name: "Macoby Run Golf Course",
  city: "Green Lane",
  state: "PA",
  country: "USA",
  latitude: 40.3932,
  longitude: -75.4514,
  holes: [...macF, ...macB],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 73.0, slope: 133, front9Yards: 3420, back9Yards: 3380, totalYards: 6800 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 70.8, slope: 127, front9Yards: 3195, back9Yards: 3155, totalYards: 6350 },
    { teeId: "white", name: "White", color: "White", rating: 68.5, slope: 119, front9Yards: 2970, back9Yards: 2930, totalYards: 5900 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.0, slope: 117, front9Yards: 2650, back9Yards: 2650, totalYards: 5300 },
  ],
});

// --- Butter Valley ---
const bvF = syntheticNine(3280, par36a, 1, 1);
const bvB = syntheticNine(3220, par36b, 10, 10);
courses.push({
  courseId: "butter-valley-golf-course",
  name: "Butter Valley Golf Course",
  city: "Barto",
  state: "PA",
  country: "USA",
  latitude: 40.3958,
  longitude: -75.6086,
  holes: [...bvF, ...bvB],
  tees: [
    { teeId: "black", name: "Black", color: "Black", rating: 71.0, slope: 126, front9Yards: 3280, back9Yards: 3220, totalYards: 6500 },
    { teeId: "blue", name: "Blue", color: "Blue", rating: 69.0, slope: 120, front9Yards: 3080, back9Yards: 3020, totalYards: 6100 },
    { teeId: "white", name: "White", color: "White", rating: 67.0, slope: 113, front9Yards: 2880, back9Yards: 2820, totalYards: 5700 },
    { teeId: "red", name: "Red", color: "Red", rating: 68.5, slope: 112, front9Yards: 2550, back9Yards: 2550, totalYards: 5100 },
  ],
});

// --- Mainland ---
const mnF = syntheticNine(3230, par36a, 1, 1);
const mnB = syntheticNine(3170, [4, 3, 4, 5, 4, 3, 4, 5, 4], 10, 10);
courses.push({
  courseId: "mainland-golf-course",
  name: "Mainland Golf Course",
  city: "Harleysville",
  state: "PA",
  country: "USA",
  latitude: 40.2697,
  longitude: -75.3872,
  holes: [...mnF, ...mnB],
  tees: [
    { teeId: "blue", name: "Blue", color: "Blue", rating: 71.0, slope: 124, front9Yards: 3230, back9Yards: 3170, totalYards: 6400 },
    { teeId: "white", name: "White", color: "White", rating: 68.8, slope: 117, front9Yards: 3030, back9Yards: 2970, totalYards: 6000 },
    { teeId: "red", name: "Red", color: "Red", rating: 70.0, slope: 115, front9Yards: 2650, back9Yards: 2650, totalYards: 5300 },
  ],
});

function fixTeeYards(courseId, map) {
  const c = courses.find((x) => x.courseId === courseId);
  if (!c) return;
  for (const [tid, y] of Object.entries(map)) {
    const t = c.tees.find((x) => x.teeId === tid);
    if (t) {
      t.front9Yards = y.f;
      t.back9Yards = y.b;
      t.totalYards = y.f + y.b;
    }
  }
}

function syncTeeFromHoles(c, teeId) {
  if (!c || !teeId) return;
  const f = c.holes.filter((h) => h.holeNumber <= 9).reduce((s, h) => s + h.yardage, 0);
  const b = c.holes.filter((h) => h.holeNumber > 9).reduce((s, h) => s + h.yardage, 0);
  const t = c.tees.find((x) => x.teeId === teeId);
  if (t) {
    t.front9Yards = f;
    t.back9Yards = b;
    t.totalYards = f + b;
  }
}

fixTeeYards("five-ponds-golf-club", {
  black: { f: 3395, b: 3350 },
  blue: { f: 3177, b: 3138 },
  white: { f: 2926, b: 2899 },
});
fixTeeYards("makefield-highlands-golf-club", {
  black: { f: 3400, b: 3420 },
  blue: { f: 3180, b: 3201 },
  white: { f: 2930, b: 2951 },
});
fixTeeYards("the-bucks-club", {
  black: { f: 3360, b: 3360 },
  blue: { f: 3139, b: 3141 },
  white: { f: 2891, b: 2891 },
});

syncTeeFromHoles(courses.find((x) => x.courseId === "five-ponds-golf-club"), "blue");
syncTeeFromHoles(courses.find((x) => x.courseId === "makefield-highlands-golf-club"), "black");
syncTeeFromHoles(courses.find((x) => x.courseId === "the-bucks-club"), "black");

/** Hole yardages in JSON follow this tee (others from MD tables). */
const primaryTeeForHoles = {
  "jeffersonville-golf-club": "black",
  "macoby-run-golf-course": "black",
  "butter-valley-golf-course": "black",
};

for (const c of courses) {
  if (c.courseId.startsWith("neshanic")) continue;
  if (
    c.courseId === "five-ponds-golf-club" ||
    c.courseId === "makefield-highlands-golf-club" ||
    c.courseId === "the-bucks-club"
  ) {
    continue;
  }
  const tid =
    primaryTeeForHoles[c.courseId] ??
    (c.tees.some((t) => t.teeId === "blue") ? "blue" : c.tees[0]?.teeId);
  if (tid) syncTeeFromHoles(c, tid);
}

fs.writeFileSync(outPath, JSON.stringify(courses, null, 2));
console.log("Wrote", courses.length, "courses to", outPath);
