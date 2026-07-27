// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(p => {
      p.classList.toggle('is-active', p.dataset.panel === target);
    });
  });
});

// Live slider readouts
document.querySelectorAll('input[type="range"]').forEach(range => {
  const outId = range.dataset.out;
  if (!outId) return;
  const out = document.getElementById(outId);
  range.addEventListener('input', () => {
    out.textContent = range.value;
    recalc();
  });
});

document.querySelectorAll('select').forEach(sel => {
  sel.addEventListener('change', recalc);
});

// ---- Calculations ----
// All values rounded to friendly whole numbers. Yearly outputs.

function val(id) { return Number(document.getElementById(id).value); }

function calcPlastic() {
  const bottles = val('p-bottles') * 52;       // count/year
  const bags    = val('p-bags') * 52;
  const takeout = val('p-takeout') * 52;
  const orders  = val('p-orders') * 12;

  // Weights (kg per item)
  const kg =
    bottles * 0.013 +
    bags    * 0.006 +
    takeout * 0.030 +
    orders  * 0.080;

  return {
    kg,
    bottles,
    bags,
    trashBags: kg / 4 // ~4kg of plastic fills a kitchen trash bag
  };
}

function calcCarbon() {
  const km       = val('c-miles') * 52;            // km/year
  const flyHours = val('c-flights');               // hours/year
  const dietT    = Number(document.getElementById('c-diet').value); // tons CO2/yr
  const bill     = val('c-power');                 // €/month

  // kg CO2 per year — Irish/European data
  const kg =
    km       * 0.171 +               // EEA Irish fleet avg: ~0.171 kg CO2/km
    flyHours * 90 +                  // ~90 kg CO2 per flight hour, economy
    dietT    * 1000 +                // Teagasc diet bands, tons -> kg
    bill     * 12 * 0.7;             // SEAI: ~290 g/kWh ÷ ~€0.43/kWh ≈ 0.7 kg CO2 per €

  return {
    kg,
    tons: kg / 1000,
    dubgal:  kg / 72,                // Dublin↔Galway round trip ~420 km × 0.171 ≈ 72 kg
    kettles: kg / 0.033,             // 1 kettle boil ~0.11 kWh × 0.3 kg CO2/kWh ≈ 0.033 kg
    pints:   kg / 0.5                // ~0.5 kg CO2 per pint of Guinness (brewing + packaging)
  };
}

function calcFabric() {
  const newItems = val('f-new') * 12;       // items/year
  const fast     = val('f-fast') * 12;
  const tossed   = val('f-tossed');         // items/year
  const laundry  = val('f-laundry') * 52;   // loads/year

  // Avg garment ~0.4 kg; fast fashion lighter but higher production impact
  const kg =
    newItems * 0.45 +
    tossed   * 0.40 +
    fast     * 0.10;  // small extra for low-quality fiber shedding/turnover

  const items = newItems + tossed;

  return {
    kg,
    items,
    tshirts: kg / 0.2,                    // 1 t-shirt ≈ 0.2 kg
    baskets: kg / 4,                      // a packed basket ≈ 4 kg of clothes
    // Water to make the clothes plus water to wash them all year
    // (1 t-shirt ≈ 2700L to make; 1 wash load ≈ 50L; 1 shower ≈ 65L)
    showers: (newItems * 2700 + fast * 500 + laundry * 50) / 65,
    laundry
  };
}

function calcFood() {
  const leftovers = val('d-leftovers') * 52; // meals/year
  const produce   = val('d-produce')   * 52; // pieces/year
  const bread     = val('d-bread')     * 12; // items/year
  const takeout   = val('d-takeout')   * 52; // meals/year

  // kg per item averages
  const kg =
    leftovers * 0.5 +
    produce   * 0.15 +
    bread     * 0.4 +
    takeout   * 0.55;

  return {
    kg,
    meals: leftovers + takeout,
    grocery: kg / 5,              // a full grocery bag ≈ 5 kg
    dollars: Math.round(kg * 4.5) // Bord Bia / CSO: ~€4.50 per kg of typical groceries
  };
}

// ---- Render ----
function fmt(n, digits = 0) {
  if (!isFinite(n) || n < 0) n = 0;
  return Math.round(n).toLocaleString('en-IE');
}
function fmtDec(n, digits = 1) {
  if (!isFinite(n) || n < 0) n = 0;
  return n.toFixed(digits);
}

function recalc() {
  const p = calcPlastic();
  const c = calcCarbon();
  const f = calcFabric();
  const d = calcFood();

  // Plastic
  set('plastic-kg', fmt(p.kg));
  set('plastic-stone', fmtDec(p.kg / 6.35, 1));
  set('plastic-bottles', fmt(p.bottles));
  set('plastic-bags', fmt(p.bags));
  set('plastic-trash', fmt(p.trashBags));

  // Carbon
  set('carbon-kg', fmt(c.kg));
  set('carbon-tons', fmtDec(c.tons, 1));
  set('carbon-dubgal', fmt(c.dubgal));
  set('carbon-kettles', fmt(c.kettles));
  set('carbon-pints', fmt(c.pints));

  // Fabric
  set('fabric-kg', fmt(f.kg));
  set('fabric-items', fmt(f.items));
  set('fabric-tshirts', fmt(f.tshirts));
  set('fabric-baskets', fmt(f.baskets));
  set('fabric-showers', fmt(f.showers));

  // Food
  set('food-kg', fmt(d.kg));
  set('food-stone', fmtDec(d.kg / 6.35, 1));
  set('food-meals', fmt(d.meals));
  set('food-grocery', fmt(d.grocery));
  set('food-dollars', '€' + fmt(d.dollars));

  // Total — carbon dwarfs the others by weight, so we show the trash-side total
  // (plastic + fabric + food) plus carbon separately would be misleading.
  // Instead, total weight of physical waste; elephants ~ 5000 kg each.
  const physicalKg = p.kg + f.kg + d.kg;
  const totalKg = physicalKg + c.kg;
  document.getElementById('total-kg').textContent = fmt(totalKg);
  document.getElementById('total-elephants').textContent = fmtDec(totalKg / 5000, 1);

  // Place the user on the country spectrum (defined further down).
  if (typeof renderYouVsWorld === 'function') renderYouVsWorld(c.tons, totalKg);
}

function set(key, value) {
  document.querySelectorAll(`[data-result="${key}"]`).forEach(el => {
    el.textContent = value;
  });
}

// ---- Country Overshoot Day ----
// Ecological footprint per person, in global hectares (gha).
// Source: Global Footprint Network National Footprint Accounts (recent,
// rounded). World biocapacity is ~1.5 gha per person — a country's fair share.
const WORLD_BIOCAPACITY = 1.5;

// footprint = ecological footprint (gha/person, Global Footprint Network)
// co2       = territorial CO2 emissions (tonnes/person/yr, Global Carbon Project)
// waste     = municipal solid waste (kg/person/yr, World Bank — rough)
// selected  = shown by default in the country-overshoot comparison
const COUNTRIES = [
  { name: 'Qatar',        flag: '🇶🇦', footprint: 14.3, co2: 35.0, waste: 800, selected: false },
  { name: 'Luxembourg',   flag: '🇱🇺', footprint: 12.9, co2: 13.0, waste: 790, selected: false },
  { name: 'United States',flag: '🇺🇸', footprint: 8.1,  co2: 14.9, waste: 810, selected: true  },
  { name: 'Canada',       flag: '🇨🇦', footprint: 8.1,  co2: 14.2, waste: 700, selected: false },
  { name: 'Australia',    flag: '🇦🇺', footprint: 6.9,  co2: 15.0, waste: 560, selected: true  },
  { name: 'South Korea',  flag: '🇰🇷', footprint: 5.9,  co2: 11.6, waste: 400, selected: false },
  { name: 'Russia',       flag: '🇷🇺', footprint: 5.2,  co2: 11.4, waste: 330, selected: false },
  { name: 'Ireland',      flag: '🇮🇪', footprint: 4.9,  co2: 7.7,  waste: 600, selected: true  },
  { name: 'Germany',      flag: '🇩🇪', footprint: 4.7,  co2: 8.0,  waste: 630, selected: false },
  { name: 'Japan',        flag: '🇯🇵', footprint: 4.6,  co2: 8.5,  waste: 340, selected: false },
  { name: 'France',       flag: '🇫🇷', footprint: 4.4,  co2: 4.6,  waste: 530, selected: false },
  { name: 'United Kingdom',flag:'🇬🇧', footprint: 4.2,  co2: 4.7,  waste: 460, selected: true  },
  { name: 'Italy',        flag: '🇮🇹', footprint: 4.2,  co2: 5.5,  waste: 500, selected: false },
  { name: 'Spain',        flag: '🇪🇸', footprint: 3.9,  co2: 5.2,  waste: 470, selected: false },
  { name: 'China',        flag: '🇨🇳', footprint: 3.8,  co2: 8.0,  waste: 210, selected: true  },
  { name: 'Brazil',       flag: '🇧🇷', footprint: 2.8,  co2: 2.3,  waste: 380, selected: false },
  { name: 'World average',flag: '🌍', footprint: 2.6,  co2: 4.7,  waste: 250, selected: true  },
  { name: 'Mexico',       flag: '🇲🇽', footprint: 2.6,  co2: 3.6,  waste: 370, selected: false },
  { name: 'Indonesia',    flag: '🇮🇩', footprint: 1.7,  co2: 2.6,  waste: 230, selected: false },
  { name: 'India',        flag: '🇮🇳', footprint: 1.2,  co2: 2.0,  waste: 150, selected: true  },
  { name: 'Nigeria',      flag: '🇳🇬', footprint: 1.0,  co2: 0.6,  waste: 200, selected: false },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Number of Earths needed if everyone lived like this country.
function earthsFor(c) { return c.footprint / WORLD_BIOCAPACITY; }

// Day of year (1-based) the country crosses its share. Can exceed 365.
function overshootDayOfYear(c) {
  return Math.round(365 * WORLD_BIOCAPACITY / c.footprint);
}

// Turn a 1-based day of year into a readable date, using a non-leap year.
function dayToDate(day) {
  const d = new Date(2025, 0, 1);
  d.setDate(day);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function buildCountryPicker() {
  const picker = document.getElementById('country-picker');
  if (!picker) return;
  picker.innerHTML = '';
  COUNTRIES.forEach((c, i) => {
    const id = `cc-${i}`;
    const label = document.createElement('label');
    label.className = 'country-chip';
    label.innerHTML =
      `<input type="checkbox" id="${id}" ${c.selected ? 'checked' : ''} />` +
      `<span class="chip-flag">${c.flag}</span>` +
      `<span class="chip-name">${c.name}</span>`;
    label.querySelector('input').addEventListener('change', e => {
      c.selected = e.target.checked;
      renderCountryBars();
    });
    picker.appendChild(label);
  });
}

function renderCountryBars() {
  const wrap = document.getElementById('country-bars');
  if (!wrap) return;

  const chosen = COUNTRIES
    .filter(c => c.selected)
    .sort((a, b) => a.footprint - b.footprint); // latest overshoot first (lightest)

  if (!chosen.length) {
    wrap.innerHTML = '<p class="country-empty">Tick a country above to compare.</p>';
    return;
  }

  wrap.innerHTML = '';
  chosen.forEach(c => {
    const day = overshootDayOfYear(c);
    const overshoots = day <= 365;
    const pct = Math.min(100, (day / 365) * 100);
    const earths = earthsFor(c);
    const dateText = overshoots ? dayToDate(day) : 'Never — lives within its share';

    const row = document.createElement('div');
    row.className = 'country-row' + (overshoots ? '' : ' is-safe');
    row.innerHTML =
      `<div class="country-name"><span class="c-flag">${c.flag}</span>${c.name}</div>` +
      `<div class="country-track">` +
        `<div class="country-fill" style="width:${pct}%"></div>` +
        (overshoots ? `<div class="country-mark" style="left:${pct}%"></div>` : '') +
      `</div>` +
      `<div class="country-date">${dateText}` +
        `<span class="country-earths">${earths.toFixed(1)} Earths</span>` +
      `</div>`;
    wrap.appendChild(row);
  });
}

// ---- Where YOU land (personal vs countries) ----
// A person's fair-share carbon budget to stay within planetary limits.
// 1.7 t CO2/yr is the IPCC 1.5°C-aligned per-capita target for ~2030.
// We use it as the "one Earth" line.
const CARBON_BUDGET = 1.7;

function carbonOvershootDay(tonnes) {
  return Math.round(365 * CARBON_BUDGET / tonnes);
}
function carbonEarths(tonnes) { return tonnes / CARBON_BUDGET; }

function renderYouVsWorld(userTons, totalKg) {
  const lead = document.getElementById('you-lead');
  const bars = document.getElementById('you-bars');
  const sec  = document.getElementById('you-secondary');
  if (!lead || !bars || !sec) return;

  // --- Primary: carbon, real per-capita data ---
  const uDay = carbonOvershootDay(userTons);
  const uEarths = carbonEarths(userTons);
  if (userTons > 0 && uDay <= 365) {
    lead.innerHTML =
      `Your carbon works out to <b>${userTons.toFixed(1)} t CO₂</b> a year. ` +
      `If everyone on Earth lived like you, we'd hit overshoot on ` +
      `<b>${dayToDate(uDay)}</b> — that's <b>${uEarths.toFixed(1)} Earths</b>.`;
  } else if (userTons > 0) {
    lead.innerHTML =
      `Your carbon works out to <b>${userTons.toFixed(1)} t CO₂</b> a year — ` +
      `inside a fair share. If everyone lived like you, we'd never overshoot.`;
  } else {
    lead.textContent = 'Set your answers on the Carbon tab to see where you land.';
  }

  const rows = COUNTRIES
    .map(c => ({ name: c.name, flag: c.flag, co2: c.co2, isYou: false }));
  rows.push({ name: 'You', flag: '🫵', co2: userTons, isYou: true });
  rows.sort((a, b) => a.co2 - b.co2); // lightest (latest overshoot) first

  bars.innerHTML = '';
  rows.forEach(c => {
    const day = carbonOvershootDay(c.co2);
    const overshoots = c.co2 > 0 && day <= 365;
    const pct = c.co2 <= 0 ? 0 : Math.min(100, (day / 365) * 100);
    const dateText = overshoots ? dayToDate(day)
                   : (c.co2 <= 0 ? '—' : 'Never — within its share');

    const row = document.createElement('div');
    row.className = 'country-row' + (overshoots ? '' : ' is-safe') +
                    (c.isYou ? ' is-you' : '');
    row.innerHTML =
      `<div class="country-name"><span class="c-flag">${c.flag}</span>${c.name}</div>` +
      `<div class="country-track">` +
        `<div class="country-fill" style="width:${pct}%"></div>` +
        (overshoots ? `<div class="country-mark" style="left:${pct}%"></div>` : '') +
      `</div>` +
      `<div class="country-date">${dateText}` +
        `<span class="country-earths">${c.co2 > 0 ? c.co2.toFixed(1) + ' t CO₂' : ''}</span>` +
      `</div>`;
    bars.appendChild(row);
  });

  // --- Secondary: the whole "all in" total, clearly flagged as rough ---
  const blends = COUNTRIES
    .map(c => ({ name: c.name, flag: c.flag, kg: c.co2 * 1000 + c.waste }))
    .sort((a, b) => a.kg - b.kg);
  let nearest = blends[0];
  blends.forEach(b => {
    if (Math.abs(b.kg - totalKg) < Math.abs(nearest.kg - totalKg)) nearest = b;
  });
  sec.innerHTML =
    `<b>Everything in:</b> your all-in year is about ` +
    `<b>${fmt(totalKg)} kg</b>. Blended with each country's carbon plus ` +
    `everyday waste per person, that lands closest to ` +
    `<b>${nearest.flag} ${nearest.name}</b>. ` +
    `<span class="you-caveat">Rough estimate — carbon is most of this total, ` +
    `so it tracks the carbon picture above; the everyday-waste figures are ` +
    `approximate (World Bank).</span>`;
}

buildCountryPicker();
renderCountryBars();

// initial render
recalc();
