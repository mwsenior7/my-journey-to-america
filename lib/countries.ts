// ── Country coordinates (lon, lat) ────────────────────────────────────────────
// Canonical source of every country the Journey Map can draw an arc for.
// components/InteractiveMap.tsx imports COUNTRY_COORDS from here.
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  // Americas
  Mexico: [-102, 23], Canada: [-96, 60], Brazil: [-52, -10],
  Colombia: [-74, 4], Venezuela: [-66, 8], Peru: [-76, -9],
  Argentina: [-64, -34], Ecuador: [-78, -1], Chile: [-71, -35],
  Bolivia: [-65, -17], Paraguay: [-58, -23], Uruguay: [-56, -32],
  Guyana: [-59, 5], Suriname: [-56, 4],
  "Trinidad and Tobago": [-61, 10], Trinidad: [-61, 10],
  Jamaica: [-77, 18], Cuba: [-79, 22], Haiti: [-73, 19],
  "Dominican Republic": [-71, 19], "Puerto Rico": [-66, 18],
  Guatemala: [-90, 15], "El Salvador": [-88, 14], Honduras: [-87, 15],
  Nicaragua: [-85, 13], "Costa Rica": [-84, 10], Panama: [-80, 9],
  Belize: [-88, 17], Barbados: [-59, 13], Bahamas: [-77, 25],
  "Antigua and Barbuda": [-62, 17], Grenada: [-62, 12],
  "Saint Lucia": [-61, 14], Guadeloupe: [-61, 16], Martinique: [-61, 15],
  // Europe
  "United Kingdom": [-2, 52], UK: [-2, 52], England: [-2, 52],
  Scotland: [-4, 56], Wales: [-3, 52], Ireland: [-8, 53],
  France: [2, 46], Germany: [10, 51], Italy: [12, 42],
  Spain: [-3, 40], Portugal: [-8, 40], Netherlands: [5, 52],
  Belgium: [4, 51], Switzerland: [8, 47], Austria: [15, 47],
  Sweden: [15, 62], Norway: [8, 62], Denmark: [10, 56],
  Finland: [26, 64], Poland: [20, 52], Ukraine: [32, 49],
  Russia: [100, 60], Romania: [25, 45], Hungary: [19, 47],
  "Czech Republic": [16, 50], Czechia: [16, 50], Slovakia: [19, 49],
  Bulgaria: [25, 43], Serbia: [21, 44], Croatia: [16, 45],
  "Bosnia and Herzegovina": [17, 44], Bosnia: [17, 44],
  Albania: [20, 41], Greece: [22, 39], Turkey: [35, 39],
  Lithuania: [24, 56], Latvia: [25, 57], Estonia: [25, 59],
  Belarus: [28, 53], Moldova: [29, 47], "North Macedonia": [22, 42],
  Kosovo: [21, 42], Montenegro: [19, 43], Slovenia: [15, 46],
  Luxembourg: [6, 50], Iceland: [-19, 65], Malta: [14, 36],
  Cyprus: [33, 35],
  // Middle East
  Iran: [54, 32], Iraq: [44, 33], Syria: [38, 35], Lebanon: [36, 33],
  Israel: [35, 31], Jordan: [37, 31], "Saudi Arabia": [45, 24],
  Yemen: [48, 16], Kuwait: [48, 29], UAE: [54, 24],
  "United Arab Emirates": [54, 24], Qatar: [51, 25],
  Bahrain: [50, 26], Oman: [57, 22], Palestine: [35, 32],
  Afghanistan: [67, 33], Egypt: [30, 27], Libya: [17, 25],
  Tunisia: [9, 34], Algeria: [3, 28], Morocco: [-5, 32],
  // Asia
  China: [104, 35], India: [78, 20], Pakistan: [70, 30],
  Bangladesh: [90, 24], "Sri Lanka": [81, 7], Nepal: [84, 28],
  Bhutan: [90, 27], Japan: [138, 36], "South Korea": [128, 36],
  Korea: [128, 36], "North Korea": [127, 40], Taiwan: [121, 24],
  "Hong Kong": [114, 22], Vietnam: [108, 14], Thailand: [101, 15],
  Indonesia: [106, -6], Malaysia: [109, 2], Philippines: [122, 12],
  Myanmar: [96, 17], Burma: [96, 17], Cambodia: [105, 12],
  Laos: [103, 18], Singapore: [104, 1], Mongolia: [103, 46],
  Kazakhstan: [67, 48], Uzbekistan: [63, 41], Kyrgyzstan: [74, 41],
  Tajikistan: [71, 39], Turkmenistan: [59, 40], Azerbaijan: [48, 40],
  Georgia: [44, 42], Armenia: [45, 40],
  // Africa
  Nigeria: [8, 10], Ethiopia: [40, 8], Kenya: [38, 0], Ghana: [-1, 8],
  "South Africa": [22.9375, -30.5595], Tanzania: [35, -6], Uganda: [32, 1],
  Cameroon: [12, 6], Somalia: [46, 6], Sudan: [30, 12],
  "South Sudan": [31, 7], Eritrea: [39, 15], Rwanda: [30, -2],
  Zimbabwe: [30, -20], Zambia: [27, -13], Senegal: [-14, 14],
  Liberia: [-9, 6], "Sierra Leone": [-12, 8], Guinea: [-11, 11],
  "Ivory Coast": [-7, 8], "Côte d'Ivoire": [-7, 8],
  Congo: [24, -3], "Democratic Republic of the Congo": [24, -3],
  DRC: [24, -3], Angola: [18, -12], Mozambique: [35, -18],
  Madagascar: [47, -20], Malawi: [34, -13], Botswana: [24, -22],
  Namibia: [18, -22], Gabon: [12, -1], Burundi: [30, -3],
  Mali: [-2, 17], Niger: [8, 17], Chad: [18, 15],
  "Burkina Faso": [-1, 12], Togo: [1, 8], Benin: [2, 9],
  Mauritania: [-11, 20], "Cape Verde": [-24, 16],
  // Oceania
  Australia: [134, -25], "New Zealand": [172, -41],
  Fiji: [178, -18], "Papua New Guinea": [147, -6],
};

// Every country the Journey Map can draw, sorted alphabetically. Every entry
// here is guaranteed to resolve in COUNTRY_COORDS since it's derived from it.
export const COUNTRIES: string[] = Object.keys(COUNTRY_COORDS).sort((a, b) =>
  a.localeCompare(b)
);
