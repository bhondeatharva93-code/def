/* ==========================================================================
   Store assistant: the brain
   Reads a message, works out what the shopper wants and builds a reply from the
   catalogue (js/data.js), the settings (js/config.js), the fit rules (js/compat.js)
   and the general answers in js/assistant-kb.js.
   There is no DOM in this file, so it also runs in Node for testing.
   js/assistant.js draws the chat window and calls PCS.brain.reply().
   ========================================================================== */
(function (PCS) {
  'use strict';

  const cfg = PCS.config, by = PCS.byId, money = PCS.util.money, products = PCS.products;
  const KB = PCS.kb || [];

  /* ---------- Small helpers ---------- */
  const lc = s => String(s).toLowerCase();
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const tokens = s => lc(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const useLabel = id => (PCS.useById[id] ? PCS.useById[id].label : id).toLowerCase();
  const catName = id => (PCS.catById[id] ? PCS.catById[id].label : id).toLowerCase();
  const joinAnd = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const say = (text, o) => {
    o = o || {};
    return { text: text, cards: o.cards || [], chips: o.chips || [], actions: o.actions || [], after: o.after || '', conf: o.conf || 'high' };
  };
  const monthly = (amount, months) => PCS.util.emi(amount, months, cfg.emi.annualInterestPct);
  const wordsOnly = a => a.filter(w => !/\d/.test(w));

  function initialState() { return { use: [], cat: '', budget: null, focusId: '', last: null, terms: [], brand: '', noHdd: false }; }

  /* Lower-case the message and tidy the bits that confuse matching */
  function normalize(raw) {
    return lc(raw)
      .replace(/[‘’]/g, "'")
      .replace(/(\d),(?=\d{2,3}(?!\d))/g, '$1')                  // 60,000 -> 60000
      .replace(/\bvideo cards?\b/g, 'videocard')
      .replace(/\b(rtx|gtx|rx|gt|ryzen)(\d)/g, '$1 $2')          // rtx4060 -> rtx 4060
      .replace(/(\d)(gb|tb|mhz|ghz|hz|va|kva|w)\b/g, '$1 $2')    // 16gb -> 16 gb
      .replace(/\bpcs? (?=cases?\b|cabinets?\b|power\b|psu\b|monitors?\b|keyboards?\b|mice\b|mouse\b|headsets?\b|speakers?\b|fans?\b|coolers?\b|parts?\b|components?\b)/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  /* ---------- Budget: "under 60k", "1.5 lakh", "40 to 60k", "around 50,000" ---------- */
  const MULT = { k: 1e3, thousand: 1e3, hazaar: 1e3, l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5 };
  const mult = w => (w ? MULT[w] : 1);
  const CUR = '(?:₹|rs\\.?|inr|rupees?)?';
  const NUM = '(\\d+(?:\\.\\d+)?)';
  const SFX = '(?:\\s*(lakhs?|lacs?|k|thousand|hazaar)|(l))?';
  const RANGE_RE = new RegExp(CUR + '\\s*' + NUM + SFX + '\\s*(?:to|-|–|and|till)\\s*' + CUR + '\\s*' + NUM + SFX + '(?![a-z0-9])');
  const MONEY_RE = '(₹|rs\\.?|inr|rupees?)?\\s*' + NUM + SFX + '(?![a-z0-9])';
  const CUE_MAX = /(?:under|below|within|upto|up to|max(?:imum)?|less than|not more than|at most|budget(?: of| is)?)\s*(?:rs\.?|₹|inr|rupees?)?\s*$/;
  const CUE_MIN = /(?:above|over|more than|at least|min(?:imum)?|starting(?: from)?|from)\s*(?:rs\.?|₹|inr|rupees?)?\s*$/;
  const CUE_NEAR = /(?:around|about|approx(?:imately)?|nearly|roughly|near)\s*(?:rs\.?|₹|inr|rupees?)?\s*$/;
  const CUE_WEAK = /(?:have|got|spend|afford|for|of|is|at|pc|laptop|computer|desktop)\s*$/;

  /* Returns { min, max, used } where 0 means "no limit", or null when there is no amount */
  function parseBudget(s) {
    let m = RANGE_RE.exec(s);
    if (m) {
      let a = parseFloat(m[1]), b = parseFloat(m[4]), ma = mult(m[2] || m[3]), mb = mult(m[5] || m[6]);
      if (ma === 1 && mb > 1 && a < 1000) ma = mb;               // "40 to 60k": the k covers both numbers
      if (mb === 1 && ma > 1 && b < 1000) mb = ma;
      a *= ma; b *= mb;
      const cur = /₹|rs\.?|inr|rupee/.test(m[0]);
      if (a >= 500 && b > a && (ma > 1 || cur || a >= 5000)) {
        return { min: Math.round(a), max: Math.round(b), used: tokens(m[0]) };
      }
    }
    const re = new RegExp(MONEY_RE, 'g');
    const cands = [];
    while ((m = re.exec(s))) {
      const num = parseFloat(m[2]), suf = m[3] || m[4], val = num * mult(suf);
      if (!(val >= 500 && val <= 3e6)) continue;
      const before = s.slice(Math.max(0, m.index - 28), m.index);
      const after = s.slice(re.lastIndex).trim();
      const cue = CUE_MAX.test(before) ? 'max' : CUE_MIN.test(before) ? 'min' : CUE_NEAR.test(before) ? 'near' : CUE_WEAK.test(before) ? 'weak' : '';
      const strong = cue === 'max' || cue === 'min' || cue === 'near';
      if (suf === 'k' && [2, 4, 8].indexOf(num) !== -1 && !m[1] && !strong) continue;        // "4k monitor" is a resolution
      const unitAfter = /^(gb|tb|mb|mhz|ghz|hz|w|watts?|inch|mp|fps|cores?|threads?|va|kva|dpi|rpm|x\b|mm|months?|years?|days?|hours?)/.test(after);
      if (unitAfter && !suf) continue;                                                       // "650 w" is not a price
      const modelBefore = /(rtx|gtx|rx|gt|ryzen|core|ultra|i[3579]|radeon|geforce)\s*$/.test(before);
      if (!(suf || m[1] || cue || (val >= 15000 && !modelBefore))) continue;
      cands.push({ val: Math.round(val), cue: cue, used: tokens(m[0]) });
    }
    if (!cands.length) return null;
    const mx = cands.filter(c => c.cue === 'max')[0], mn = cands.filter(c => c.cue === 'min')[0];
    const used = [].concat.apply([], cands.map(c => c.used));
    if (mx || mn) return { min: mn ? mn.val : 0, max: mx ? mx.val : 0, used: used };
    const c = cands[0];
    if (c.cue === 'near') return { min: Math.round(c.val * 0.75), max: Math.round(c.val * 1.15), used: c.used };
    return { min: 0, max: c.val, used: c.used };
  }

  /* ---------- What is the PC for, and which kind of product? ---------- */
  const USE_RE = {
    gaming: /\b(gam(?:e|es|ing|er|ers)|valorant|bgmi|pubg|gta|fortnite|cs ?2|csgo|counter ?strike|call of duty|apex|fps|esports?|minecraft|cyberpunk|elden ring|twitch)\b/,
    editing: /\b(edit(?:ing|or|ors|s)?|premiere|davinci|resolve|after ?effects|photoshop|lightroom|video|render(?:ing)?|youtub(?:e|er)|vlog(?:ging)?|creator|content creation|animation|blender|3d|cad|autocad|solidworks|graphic design|designer|designing|photography|motion graphics)\b/,
    trading: /\b(trad(?:e|es|er|ers|ing)|share ?market|stock market|stock trading|forex|crypto|nifty|intraday|multi[- ]?(?:monitor|screen|display)s?|(?:2|3|4|5|6|two|three|four|five|six|dual|triple|quad) (?:monitors?|screens?|displays?))\b/,
    office: /\b(office|work from home|wfh|accounts?|accounting|tally|excel|billing|business|school|college|student|study|studying|classes|class|online class|coding|programming|programmer|developer|code|python|browsing|zoom|family|home use|daily use|basic use|kids?)\b/
  };
  const CAT_RE = [
    ['laptop', /\b(laptops?|notebooks?)\b/],
    ['gpu', /\b(gpus?|graphics? cards?|videocards?|geforce|radeon|rtx|gtx|nvidia)\b/],
    ['cpu', /\b(cpus?|processors?|ryzen|core i[3579]|core ultra|intel core|i[3579] ?-?\d{4,5})\b/],
    ['motherboard', /\b(motherboards?|mobos?|mainboards?|chipsets?|[abhxz]\d{3}m?)\b/],
    ['ram', /\b(rams?|memory|ddr[45])\b/],
    ['ssd', /\b(ssds?|nvme|hdds?|hard (?:disk|drive)s?|storage|m\.?2)\b/],
    ['cooler', /\b(coolers?|aio|liquid cool(?:er|ing)?|heat ?sinks?|cpu fan)\b/],
    ['psu', /\b(psus?|smps|power supply|power supplies)\b/],
    ['case', /\b(cabinets?|chassis|cases?)\b/],
    ['monitor', /\b(monitors?|displays?|screens?)\b/],
    ['keyboard', /\b(keyboards?)\b/],
    ['mouse', /\b(mouse|mice)\b/],
    ['headset', /\b(headsets?|headphones?)\b/],
    ['speaker', /\b(speakers?|soundbars?)\b/],
    ['gamepad', /\b(gamepads?|controllers?|joysticks?)\b/],
    ['ups', /\b(ups|inverter|power backup|battery backup)\b/],
    ['printer', /\b(printers?|inkjet|laser)\b/],
    ['cctv', /\b(cctv|cameras?|surveillance|dvr)\b/],
    ['prebuilt', /\b(pcs?|computers?|desktops?|prebuilt|pre-built|rigs?|towers?|systems?|setups?)\b/]
  ];
  const BRANDS = (PCS.brands || []).map(lc);

  function detectUse(s, consumed) {
    const found = [];
    Object.keys(USE_RE).forEach(id => {
      const ms = s.match(new RegExp(USE_RE[id].source, 'g'));
      if (ms) {
        found.push({ id: id, n: ms.length });
        ms.forEach(x => wordsOnly(tokens(x)).forEach(w => consumed.add(w)));
      }
    });
    return found.sort((a, b) => b.n - a.n).slice(0, 2).map(f => f.id);
  }

  /* The category mentioned first wins: "ram for my gaming pc" is about RAM */
  function detectCat(s, consumed) {
    let best = null;
    CAT_RE.forEach(pair => {
      const m = pair[1].exec(s);
      if (m && (!best || m.index < best.at)) best = { id: pair[0], at: m.index, word: m[0] };
    });
    if (best) wordsOnly(tokens(best.word)).forEach(w => consumed.add(w));
    return best;
  }

  /* ---------- Finding a specific product in the message ---------- */
  const STOP = new Set(('a an the and or of for to in on at is are was be it its this that these those me my i we you your with what which who how do does did can could would ' +
    'should will tell about please pls show give any some best good better than from into under below above over within upto up around approx rs inr rupees rupee lakh lac lakhs k ' +
    'have has had get want need looking suggest recommend find options option much many more most also just like then so if not no yes ok okay hi hello').split(' '));
  const GENERIC = new Set(('price cost specs spec details detail info information review reviews available availability stock buy compare comparison compatible compatibility work works fit fits ' +
    'support supports processor cpu board motherboard card graphics gpu ram memory ssd drive cabinet case cooler monitor keyboard mouse headset laptop pc computer desktop vs versus difference between').split(' '));
  const UNITISH = /^\d+(gb|tb|mb|mhz|ghz|hz|w|va|kva|mp|p|x|mm)$/;
  const NAME_TK = {};
  products.forEach(p => { NAME_TK[p.id] = tokens(p.name); });

  /* The words that describe each product, padded with spaces for whole-word tests.
     (data.js adds category search keywords to _hay, which would make every RAM kit match "ddr4".) */
  const HAY = {};
  products.forEach(p => {
    const parts = p.parts ? Object.keys(p.parts).map(k => p.parts[k]).join(' ') : '';
    HAY[p.id] = ' ' + tokens([p.name, p.brand, p.specs.join(' '), parts, p.use ? useLabel(p.use) : ''].join(' ')).join(' ') + ' ';
  });
  const hasTerm = (p, t) => HAY[p.id].indexOf(' ' + t + ' ') !== -1;

  const TECH = /^(ddr\d|am[45]|lga\d{3,4}|pcie\d*|gen\d|usb\d*|hdmi\d*|wifi\d*|sata\d*|nvme\d*)$/;      // standards, not model numbers
  const modelTokens = (tk, consumed) => tk.filter(w =>
    /\d/.test(w) && w.length >= 3 && !UNITISH.test(w) && !TECH.test(w) && !consumed.has(w) && !(/^\d+$/.test(w) && Number(w) >= 15000));
  const tokMatch = (m, nt) => nt.some(n => n === m || (n.length === m.length + 1 && n.indexOf(m) === 0 && /[a-z]/.test(n.charAt(n.length - 1))));

  /* Products named in s, best match first. Needs a model number ("5060") or the full product name. */
  function findProducts(s, consumed) {
    consumed = consumed || new Set();
    const tk = tokens(s), model = modelTokens(tk, consumed), joined = ' ' + tk.join(' ') + ' ';
    const out = [];
    products.forEach(p => {
      const nt = NAME_TK[p.id], name = nt.join(' ');
      let score = 0;
      if (name.length >= 9 && joined.indexOf(' ' + name + ' ') !== -1) score = 3;
      else if (model.length && model.every(m => tokMatch(m, nt))) {
        const rest = tk.filter(w => !STOP.has(w) && model.indexOf(w) === -1 && !consumed.has(w));
        score = 2 + rest.filter(w => nt.indexOf(w) !== -1).length * 0.1 - rest.filter(w => nt.indexOf(w) === -1 && !GENERIC.has(w)).length * 0.3;
      }
      if (score >= 1.5) out.push({ p: p, score: score, len: nt.length });
    });
    return out.sort((a, b) => b.score - a.score || a.len - b.len).map(r => r.p);
  }

  /* One product per part of the sentence: "ryzen 5 7600 with b550m board" -> two products */
  function perSegment(s, consumed) {
    const segs = s.split(/\b(?:vs|versus|or|and|with|than|compared|compare|between|for|to|on|in)\b|[,+&\/]/).map(x => x.trim()).filter(x => x.length > 1);
    const ids = uniq(segs.map(x => { const f = findProducts(x, consumed)[0]; return f ? f.id : ''; }).filter(Boolean));
    return ids.map(id => by[id]);
  }

  /* ---------- Understanding one message ---------- */
  function understand(raw) {
    const t = normalize(raw), tk = tokens(t), consumed = new Set();
    const budget = parseBudget(t);
    if (budget) budget.used.forEach(w => consumed.add(w));
    const use = detectUse(t, consumed);
    const catInfo = detectCat(t, consumed);
    return {
      raw: raw, t: t, tk: tk, consumed: consumed, budget: budget, use: use, catInfo: catInfo,
      brand: tk.filter(w => BRANDS.indexOf(w) !== -1)[0] || '',
      model: modelTokens(tk, consumed),
      cheap: /\b(cheap|cheapest|lowest|affordable|low cost|economical|least expensive)\b/.test(t),
      top: /\b(premium|flagship|highest|most powerful|top end|top of the line|costliest)\b/.test(t)
    };
  }

  /* ---------- Ranking and presenting products ---------- */
  const tagScore = p => (p.tags.indexOf('best') !== -1 ? 0.15 : p.tags.indexOf('hot') !== -1 ? 0.1 : 0);
  const inBudget = (p, b) => !b || ((!b.min || p.price >= b.min) && (!b.max || p.price <= b.max));
  const instock = p => p.stock !== false;

  function ranker(budget, e, uses) {
    const max = (budget && budget.max) || 0;
    const bonus = p => (uses || []).some(u => p.cat !== 'prebuilt' && HAY[p.id].indexOf(useLabel(u).split(' ')[0]) !== -1) ? 0.3 : 0;
    return (a, b) => {
      if (e && e.cheap) return a.price - b.price;
      if (e && e.top) return b.price - a.price;
      if (!max) return (tagScore(b) + bonus(b) - tagScore(a) - bonus(a)) || (a.price - b.price);
      const score = p => p.price / max + tagScore(p) + PCS.discount(p) / 400 + bonus(p);
      return score(b) - score(a);
    };
  }

  /* Pick up to three that show the range, cheapest to dearest */
  function spread(sorted) {
    const n = sorted.length;
    if (n <= 3) return sorted;
    return uniq([0, Math.floor((n - 1) / 2), n - 1]).map(i => sorted[i]);
  }

  function nice(v) {
    const p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p;
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
    for (let i = 0; i < steps.length; i++) if (f <= steps[i] + 1e-9) return steps[i] * p;
    return 10 * p;
  }
  function budgetChips(pool) {
    const prices = pool.map(p => p.price).sort((a, b) => a - b);
    if (prices.length < 2) return [];
    const n = prices.length;
    return uniq([0, 0.4, 0.75, 1].map(q => nice(prices[Math.floor(q * (n - 1))] * 1.02))).map(v => 'Under ' + money(v));
  }

  function budgetText(b) {
    if (!b) return '';
    if (b.min && b.max) return 'between ' + money(b.min) + ' and ' + money(b.max);
    if (b.max) return 'under ' + money(b.max);
    if (b.min) return 'from ' + money(b.min);
    return '';
  }

  /* Words in the message that narrow a list, such as "nvme", "wireless" or "1 tb". They are kept
     in the conversation, so "cheaper" and "under 5000" still mean "cheaper NVMe" and "NVMe under 5000". */
  const QUAL = new Set(['nvme', 'hdd', 'hdds', 'sata', 'rtx', 'gtx', 'rx', 'geforce', 'radeon', 'ryzen', 'aio', 'liquid']);
  const FOLLOW_WORDS = new Set('cheaper lower lesser costlier expensive powerful faster stronger higher bigger upgrade another other others next else all'.split(' '));
  function termFilter(pool, e, st) {
    const vocab = new Set();
    pool.forEach(p => HAY[p.id].trim().split(' ').forEach(w => vocab.add(w)));
    let terms = e.tk.filter(w => vocab.has(w) && !STOP.has(w) && !FOLLOW_WORDS.has(w) && !GENERIC.has(w) && !/^\d{1,2}$/.test(w) &&
      !/^(gb|tb|mb|mhz)$/.test(w) && (!e.consumed.has(w) || QUAL.has(w)));
    e.t.replace(/\b(\d+) (gb|tb)\b/g, (all, n, u) => { terms.push(n + ' ' + u); return all; });    // "1 tb" must match as a pair
    if (e.carry && st && st.terms) terms = st.terms.concat(terms);
    terms = uniq(terms);
    if (!terms.length) return { pool: pool, terms: [] };
    const narrowed = pool.filter(p => terms.every(t => hasTerm(p, t)));
    return narrowed.length ? { pool: narrowed, terms: terms } : { pool: pool, terms: [] };
  }

  const PART_TIPS = {
    cpu: 'Check that the socket matches your motherboard, and whether the processor has built-in graphics if you will not add a graphics card.',
    motherboard: 'The socket must match your processor, and the memory type (DDR4 or DDR5) must match your RAM.',
    ram: 'The memory type (DDR4 or DDR5) must match your motherboard. Two sticks run faster than one.',
    gpu: 'Make sure your power supply has enough watts and the cabinet has room for the card.',
    ssd: 'NVMe drives are the fastest. Check that your motherboard has an M.2 slot.',
    psu: 'Choose about 1.5 times your estimated load. The PC builder estimates it for you.',
    cooler: 'Check that the cooler mounts on your socket and fits in your cabinet.',
    case: 'The cabinet must hold your motherboard size (ATX, mATX or mini-ITX).',
    monitor: 'For games, look at the refresh rate as well as the size and resolution.'
  };
  const USE_TIPS = {
    gaming: 'For games the graphics card matters most, then the processor. 16 GB of RAM is the minimum I would suggest, and 32 GB helps in newer games and when streaming.',
    editing: 'For editing, look at processor cores, 32 GB of RAM and a fast NVMe SSD. A mid-range graphics card speeds up effects and exports.',
    trading: 'For trading, the number of monitor outputs matters more than raw power. 16 GB of RAM and an SSD are plenty. A UPS stops a power cut from dropping your screens mid-trade.',
    office: 'For office work, study and coding, a modern 6-core processor, 16 GB of RAM and an SSD are plenty. You do not need a graphics card.'
  };

  const NOUN = { prebuilt: 'PCs', laptop: 'laptops', cpu: 'processors', motherboard: 'motherboards', ram: 'RAM', gpu: 'graphics cards', ssd: 'SSDs',
    cooler: 'CPU coolers', case: 'cabinets', psu: 'power supplies', monitor: 'monitors', keyboard: 'keyboards', mouse: 'mice', headset: 'headsets',
    speaker: 'speakers', gamepad: 'controllers', ups: 'UPS units', printer: 'printers', cctv: 'CCTV cameras' };
  const ONE = { prebuilt: 'PC', laptop: 'laptop', cpu: 'processor', motherboard: 'motherboard', ram: 'RAM kit', gpu: 'graphics card', ssd: 'drive', cooler: 'CPU cooler',
    case: 'cabinet', psu: 'power supply', monitor: 'monitor', keyboard: 'keyboard', mouse: 'mouse', headset: 'headset', speaker: 'speaker', gamepad: 'controller',
    ups: 'UPS', printer: 'printer', cctv: 'CCTV camera' };
  const noun = (cat, st) => (cat === 'ssd' && st && !st.noHdd ? 'storage drives' : NOUN[cat] || catName(cat));
  const one = cat => ONE[cat] || 'product';

  const cardsFor = (list, notes) => list.map((p, i) => ({ id: p.id, note: (notes && notes[i]) || '' }));

  function shopLink(cat, b, extra) {
    const q = [];
    if (cat) q.push('cat=' + cat);
    if (extra && extra.use) q.push('use=' + extra.use);
    if (b && b.min) q.push('min=' + b.min);
    if (b && b.max) q.push('max=' + b.max);
    if (extra && extra.brand) q.push('brand=' + encodeURIComponent(extra.brand));
    return 'shop.html' + (q.length ? '?' + q.join('&') : '');
  }

  /* Cards for a ranked list: label the cheapest and the strongest when a budget is set */
  function labelled(shown, hasBudget) {
    if (!hasBudget || shown.length < 2) return shown.map(p => (p.tags.indexOf('best') !== -1 ? 'Popular' : ''));
    const lo = Math.min.apply(null, shown.map(p => p.price)), hi = Math.max.apply(null, shown.map(p => p.price));
    return shown.map((p, i) => (i === 0 ? 'Top pick' : p.price === lo ? 'Lowest price' : p.price === hi ? 'Most powerful here' : ''));
  }

  /* ---------- Recommending ---------- */

  /* The products a request is about, before the budget is applied */
  function basePool(e, st) {
    const cat = st.cat || 'prebuilt';
    let pool = products.filter(p => p.cat === cat && (cat !== 'prebuilt' || !st.use.length || st.use.indexOf(p.use) !== -1));
    const wantBrand = e.brand || (e.carry ? st.brand : '');
    let brand = '';
    if (cat !== 'prebuilt' && wantBrand) {
      const bp = pool.filter(p => lc(p.brand) === wantBrand);
      if (bp.length) { pool = bp; brand = bp[0].brand; }
    }
    st.brand = brand ? wantBrand : '';
    if (cat === 'ssd') {
      if (/\b(ssds?|nvme)\b/.test(e.t) && !/\b(hdd|hard)\b/.test(e.t)) st.noHdd = true;
      else if (/\b(hdd|hard)\b/.test(e.t)) st.noHdd = false;
      if (st.noHdd) pool = pool.filter(p => !/\b(hard (?:disk|drive)|hdd)\b/i.test(p.name));
    } else st.noHdd = false;
    const tf = termFilter(pool, e, st);
    st.terms = tf.terms;
    return { cat: cat, pool: tf.pool, brand: brand };
  }

  function recommend(e, st) {
    const bp = basePool(e, st);
    return bp.cat === 'prebuilt' ? recPcs(bp, e, st) : recParts(bp, e, st);
  }

  function recPcs(bp, e, st) {
    const uses = st.use, b = st.budget, pool = bp.pool;
    const names = joinAnd(uses.map(useLabel)), kind = (names ? names + ' ' : '') + 'PCs';
    if (!uses.length && !b && !e.cheap && !e.top && !st.terms.length) {
      return say('What will the PC be used for? Pick one, or tell me in your own words and add your budget if you have one.',
        { chips: PCS.uses.map(u => (u.label === 'Office and study' ? 'Office and study PC' : u.label + ' PC')) });
    }
    const avail = pool.filter(instock);
    const soldOut = pool.filter(p => !instock(p) && inBudget(p, b));
    const note = soldOut.length ? 'The ' + joinAnd(soldOut.map(p => p.name)) + (soldOut.length > 1 ? ' are' : ' is') + ' out of stock at the moment.' : '';
    const after = [note, uses.length ? USE_TIPS[uses[0]] : ''].filter(Boolean).join('\n\n');
    const link = [{ label: 'See all in the shop', href: shopLink('prebuilt', b, { use: uses.length === 1 ? uses[0] : '' }) }];
    if (!avail.length) {
      return say('I do not have ' + kind + ' in stock right now. Ask the team on WhatsApp, or build one yourself.',
        { actions: contactActions(st).concat([{ label: 'Open the PC builder', href: 'build.html' }]) });
    }

    if (!b && !e.cheap && !e.top) {                           // no budget yet: show the range, then ask
      const sorted = avail.slice().sort((x, y) => x.price - y.price), shown = spread(sorted);
      st.last = { kind: 'rec', ids: sorted.map(p => p.id), offset: shown.length };
      st.focusId = shown[0].id;
      return say(cap(kind) + ' here start at ' + money(sorted[0].price) + ' and go up to ' + money(sorted[sorted.length - 1].price) + '. Here is a spread. Tell me your budget and I will narrow it down.',
        { cards: cardsFor(shown, shown.map(p => (p.tags.indexOf('best') !== -1 ? 'Popular' : ''))), after: after, chips: budgetChips(avail), actions: link });
    }

    const hits = avail.filter(p => inBudget(p, b)).sort(ranker(b, e, uses));
    if (!hits.length) {                                       // nothing in the budget
      const sorted = avail.slice().sort((x, y) => x.price - y.price);
      const nearest = (b && b.max ? sorted.filter(p => p.price > b.max)[0] : null) || sorted[sorted.length - 1];
      const gap = b && b.max ? nearest.price - b.max : 0;
      st.last = { kind: 'rec', ids: [nearest.id], offset: 1 };
      st.focusId = nearest.id;
      return say('I do not have ' + kind + ' ' + budgetText(b) + '. The closest is the ' + nearest.name + ' at ' + money(nearest.price) + (gap > 0 ? ', which is ' + money(gap) + ' more' : '') +
        '. EMI can spread that cost, or you can build a leaner PC yourself.',
        { cards: cardsFor([nearest], ['Closest']), after: note, chips: ['EMI on this', 'Show all ' + kind], actions: [{ label: 'Open the PC builder', href: 'build.html' }] });
    }

    const shown = hits.slice(0, 3);
    st.last = { kind: 'rec', ids: hits.map(p => p.id), offset: shown.length };
    st.focusId = shown[0].id;
    const more = hits.length > shown.length ? ' (' + (hits.length - shown.length) + ' more match)' : '';
    const intro = !b && e.cheap ? 'Here are the lowest-priced ' + kind + more + ':'
      : !b && e.top ? 'Here are the most powerful ' + kind + more + ':'
      : 'For ' + (names || 'your needs') + (b ? ' ' + budgetText(b) : '') + ', ' + (shown.length === 1 ? 'this is the best fit' : 'these ' + shown.length + ' look like the best fit') + more + ':';
    return say(intro, { cards: cardsFor(shown, labelled(shown, !!b)), after: after, chips: ['EMI on the first one', 'Show cheaper', 'Show more powerful'], actions: link });
  }

  function recParts(bp, e, st) {
    const cat = bp.cat, b = st.budget, uses = st.use, pool = bp.pool;
    const what = (bp.brand ? bp.brand + ' ' : '') + noun(cat, st);
    const avail = pool.filter(instock);
    const hits = avail.filter(p => inBudget(p, b)).sort(ranker(b, e, uses));
    const soldOut = pool.filter(p => !instock(p) && inBudget(p, b));
    const note = soldOut.length ? 'The ' + joinAnd(soldOut.map(p => p.name)) + (soldOut.length > 1 ? ' are' : ' is') + ' out of stock at the moment.' : '';
    const after = [note, PART_TIPS[cat] || ''].filter(Boolean).join('\n\n');
    const actions = [{ label: 'See all in the shop', href: shopLink(cat, b, { brand: bp.brand }) }];
    if (!avail.length) return say('I do not have ' + what + ' in stock right now. Ask the team on WhatsApp and they can check.', { actions: contactActions(st) });

    if (!hits.length) {
      const sorted = avail.slice().sort((x, y) => x.price - y.price);
      const nearest = (b && b.max ? sorted.filter(p => p.price > b.max)[0] : null) || sorted[sorted.length - 1];
      st.last = { kind: 'rec', ids: [nearest.id], offset: 1 };
      st.focusId = nearest.id;
      return say('I do not have ' + what + ' ' + budgetText(b) + '. The closest is the ' + nearest.name + ' at ' + money(nearest.price) + '.',
        { cards: cardsFor([nearest], ['Closest']), after: note, actions: actions, chips: budgetChips(avail) });
    }
    const shown = hits.slice(0, 3), one = shown.length === 1;
    st.last = { kind: 'rec', ids: hits.map(p => p.id), offset: shown.length };
    st.focusId = shown[0].id;
    const more = hits.length > shown.length ? ' (' + (hits.length - shown.length) + ' more in the shop)' : '';
    const intro = b ? (one ? 'The best match ' + budgetText(b) + ' is:' : 'Here are the best ' + what + ' ' + budgetText(b) + more + ':')
      : e.cheap ? (one ? 'The lowest-priced one is:' : 'Here are the lowest-priced ' + what + more + ':')
      : e.top ? (one ? 'The most powerful one is:' : 'Here are the most powerful ' + what + more + ':')
      : (one ? 'The only option I have is:' : 'Here are popular ' + what + more + '. Tell me your budget to narrow it down.');
    return say(intro, { cards: cardsFor(shown, labelled(shown, !!b)), after: after, actions: actions, chips: b ? ['Show cheaper', 'Show more powerful'] : budgetChips(avail) });
  }

  /* ---------- Contact and policy answers ---------- */
  function waText(st) {
    let t = 'Hi ' + cfg.name + ', I was chatting on your website.';
    if (st && st.use && st.use.length) t += ' I am looking for a ' + joinAnd(st.use.map(useLabel)) + ' PC' + (st.budget && budgetText(st.budget) ? ' ' + budgetText(st.budget) : '') + '.';
    return t;
  }
  function contactActions(st) {
    return [
      { label: 'Chat on WhatsApp', href: PCS.wa(waText(st)), external: true },
      { label: 'Call ' + cfg.phone, href: 'tel:' + cfg.phoneTel }
    ];
  }
  const faqAnswer = re => { const f = (cfg.faq || []).filter(x => re.test(lc(x.q)))[0]; return f ? f.a.replace(/^Yes[.,]\s*/, '') : ''; };

  const TOPICS = [
    ['delivery', /\b(deliver(?:y|ies|ed)?|ship(?:ping|ped|s)?|courier|dispatch|pincode|pin code|tracking|track (?:my )?order|how long will|when will it arrive|free shipping)\b/],
    ['payment', /\b(payments?|pay|paying|upi|cod|cash on delivery|net ?banking|bank transfer|credit card|debit card|cheque|gpay|phonepe|paytm)\b/],
    ['warranty', /\b(warranty|warranties|guarantee|repair|service cent(?:re|er)|defective|stopped working|not working|rma)\b/],
    ['returns', /\b(returns?|returned|refunds?|replace(?:ment)?|exchange|cancel(?:lation)?|money back)\b/],
    ['gst', /\b(gst|gstin|invoice|tax invoice)\b/],
    ['store', /\b(address|location|located|showroom|visit|timings?|opening hours|opening time|working hours|directions|google map|maps?|where are you|where is (?:your|the) (?:shop|store|showroom|office)|nearest (?:shop|store))\b/],
    ['contact', /\b(phone number|mobile number|contact number|whatsapp|e-?mail|contact (?:you|us|the store|details)|customer (?:care|support)|tech support|talk to|speak to|chat with|human|real person|someone|your team|the team|agent|call (?:me|you|us|back)|give me a call)\b/]
  ];

  function topicSection(id, st) {
    const s = cfg.shipping || {};
    switch (id) {
      case 'delivery': {
        const fee = s.freeAbove ? 'Shipping is free on orders of ' + money(s.freeAbove) + ' and above, and ' + money(s.flat) + ' below that.' : '';
        return { title: 'Delivery', body: [fee, faqAnswer(/deliver|ship/)].filter(Boolean).join(' '), link: { label: 'Shipping policy', href: 'policies.html#shipping' } };
      }
      case 'payment':
        return { title: 'Payment', body: 'At checkout you can choose UPI or bank transfer, EMI, or pay on delivery where it is available for your pincode. For UPI and EMI we send the details on WhatsApp. ' + faqAnswer(/pay|emi/) };
      case 'warranty':
        return { title: 'Warranty', body: faqAnswer(/warranty/) || 'Parts carry the brand warranty. Contact us with your invoice and we will guide you.', link: { label: 'Warranty policy', href: 'policies.html#warranty' } };
      case 'returns':
        return { title: 'Returns', body: faqAnswer(/return|refund/) || 'Please read the return policy for the rules.', link: { label: 'Return policy', href: 'policies.html#returns' } };
      case 'gst':
        return { title: 'GST invoice', body: faqAnswer(/gst|invoice/) || 'Add your GST number at checkout to get a GST invoice.' };
      case 'store':
        return { title: 'Visit the store', body: (cfg.address || []).join(', ') + '. Open ' + lc(cfg.hours) + '.', link: { label: 'Open in Maps', href: cfg.mapsUrl, external: true } };
      default:
        return { title: 'Talk to the team', body: 'The team is on WhatsApp and the phone, ' + lc(cfg.hours) + '. Phone: ' + cfg.phone + '. Email: ' + cfg.email + '.' };
    }
  }

  function faqTalk(e, st) {
    if (e.use.length && e.budget) return null;                  // a full shopping request, not a policy question
    const hit = TOPICS.filter(t => t[1].test(e.t)).map(t => t[0]).slice(0, 3);
    if (!hit.length) return null;
    const secs = hit.map(id => topicSection(id, st));
    const actions = secs.filter(s => s.link).map(s => s.link);
    if (hit.indexOf('contact') !== -1 || hit.indexOf('store') !== -1) contactActions(st).forEach(a => actions.push(a));
    const chips = ['delivery', 'payment', 'warranty', 'returns'].filter(x => hit.indexOf(x) === -1).slice(0, 2)
      .map(x => ({ delivery: 'Delivery charges', payment: 'Payment options', warranty: 'Warranty rules', returns: 'Return policy' }[x]));
    return say(secs.map(s => '**' + s.title + '**\n' + s.body).join('\n\n'), { actions: actions.slice(0, 3), chips: chips.concat(['Talk to the team']).slice(0, 3) });
  }

  /* ---------- EMI and cart ---------- */
  function cartSummary() {
    if (!PCS.store) return null;
    const items = PCS.store.cart.items();
    if (!items.length) return { items: items, total: 0 };
    return { items: items, subtotal: PCS.store.cart.subtotal(), shipping: PCS.store.cart.shipping(), total: PCS.store.cart.total(), gst: PCS.store.cart.gst() };
  }

  function emiTalk(e, st, env) {
    if (!/\b(emi|emis|instal+ments?|monthly|per month|a month|no[- ]?cost|finance)\b/.test(e.t)) return null;
    const tenures = (cfg.emi && cfg.emi.tenures) || [3, 6, 9, 12];
    const rate = cfg.emi.annualInterestPct || 0;
    let amount = 0, label = '';
    const cart = /\b(my cart|the cart|cart)\b/.test(e.t) ? cartSummary() : null;
    const named = findProducts(e.t, e.consumed)[0];
    const pron = /\b(this|it|that|first one|the first|same)\b/.test(e.t);
    const focus = pron ? by[(env && env.pageProductId) || st.focusId] : null;
    if (cart && cart.total) { amount = cart.total; label = 'your cart'; }
    else if (named) { amount = named.price; label = named.name; st.focusId = named.id; }
    else if (e.budget) { amount = e.budget.max || e.budget.min; }
    else if (focus) { amount = focus.price; label = focus.name; }
    if (!amount) {
      return say('You can pay in ' + joinAnd(tenures.map(String)) + ' month instalments' + (rate ? '' : ' with no extra cost') + '. Tell me a price or budget, for example "EMI on ₹60,000", or say "EMI on my cart".' +
        ' Your bank or EMI partner decides the final terms and approval.', { chips: ['EMI on ₹30,000', 'EMI on ₹60,000', 'EMI on my cart'] });
    }
    const lines = tenures.map(m => '- ' + m + ' months: ' + money(monthly(amount, m)) + ' a month');
    const how = rate ? 'These use ' + rate + '% interest a year.' : 'These are no-cost figures: the price divided by the number of months.';
    return say('**EMI on ' + money(amount) + (label ? ' (' + label + ')' : '') + '**\n' + lines.join('\n') + '\n\n' + how + ' Your bank or EMI partner decides the final terms and approval.',
      { chips: ['Show PCs under ' + money(nice(amount * 1.02)), 'Talk to the team'] });
  }

  function cartTalk(e) {
    if (!/\b(my cart|in (?:my )?cart|cart total|my basket|view cart|show cart)\b/.test(e.t)) return null;
    const c = cartSummary();
    if (!c || !c.items.length) return say('Your cart is empty right now. Tell me what the PC is for and I will suggest something.', { chips: startChips({}) });
    const lines = c.items.map(i => '- ' + i.qty + ' x ' + i.product.name + ': ' + money(i.product.price * i.qty));
    const n = c.items.reduce((s, i) => s + i.qty, 0);
    return say('**Your cart** (' + n + (n === 1 ? ' item' : ' items') + ')\n' + lines.join('\n') + '\n\nSubtotal ' + money(c.subtotal) + '. Shipping: ' + (c.shipping ? money(c.shipping) : 'free') +
      '. Total ' + money(c.total) + ', including ' + money(c.gst) + ' GST.' + (c.total >= 10000 ? ' EMI from ' + money(monthly(c.total, 12)) + ' a month over 12 months.' : ''),
      { actions: [{ label: 'Go to your cart', href: 'cart.html' }], chips: ['EMI on my cart', 'Delivery charges'] });
  }

  /* ---------- Specific products: info, comparing, fit checks, alternatives ---------- */
  const PART_LABEL = { cpu: 'Processor', gpu: 'Graphics', ram: 'Memory', ssd: 'Storage', psu: 'Power supply', case: 'Cabinet' };
  const specLines = p => (p.parts ? Object.keys(p.parts).map(k => '- ' + (PART_LABEL[k] || cap(k)) + ': ' + p.parts[k]) : p.specs.map(s => '- ' + s));

  function infoReply(list, st) {
    const p = list[0], off = PCS.discount(p);
    st.focusId = p.id;
    st.last = null;                                              // "cheaper" now means cheaper than this one
    const head = '**' + p.name + '** is ' + money(p.price) + (off >= 5 ? ' (' + off + '% off the ' + money(p.mrp) + ' MRP)' : '') + '.' + (p.use ? '\nBuilt for ' + useLabel(p.use) + '.' : '');
    const tail = (instock(p) ? 'In stock.' : 'Out of stock right now.') + (p.price >= 10000 ? ' EMI from ' + money(monthly(p.price, 12)) + ' a month over 12 months.' : '');
    const others = list.slice(1, 3);
    return say(head + '\n\n' + specLines(p).join('\n') + '\n\n' + tail + (others.length ? '\n\nClose matches are shown below too.' : ''),
      { cards: cardsFor(list.slice(0, 3)), chips: ['EMI on this', 'Show cheaper options'].concat(p.cat === 'prebuilt' ? ['Is it good for gaming?'] : []).slice(0, 3) });
  }

  function compareReply(a, b, st) {
    st.focusId = a.id;
    const diff = Math.abs(a.price - b.price), cheaper = a.price <= b.price ? a : b;
    const block = p => '**' + p.name + '** (' + money(p.price) + ')\n' + specLines(p).join('\n');
    return say(block(a) + '\n\n' + block(b) + '\n\n' + (diff ? 'The ' + cheaper.name + ' costs ' + money(diff) + ' less.' : 'They cost the same.') +
      (a.cat === b.cat ? ' Tell me what you will use it for and I can say which suits you better.' : ' These are different kinds of product, so compare what each does for you.'),
      { cards: cardsFor([a, b]), chips: ['EMI on the first one', 'Talk to the team'] });
  }

  const SLOT_CATS = ['cpu', 'motherboard', 'ram', 'gpu', 'ssd', 'cooler', 'psu', 'case'];

  function compatPair(list, st) {
    const sel = {};
    list.forEach(p => { sel[p.cat] = p.id; });
    st.focusId = list[0].id;
    const rep = PCS.compat.check(sel);
    const lines = rep.checks.filter(c => !/No CPU cooler|No display output/.test(c.text));
    const bad = lines.filter(c => c.level === 'error'), warn = lines.filter(c => c.level === 'warn');
    let text;
    if (bad.length) text = '**No, these will not work together.** ' + bad.map(c => c.text).join(' ');
    else if (lines.length) text = '**Yes, they are compatible.** ' + lines.map(c => c.text).join(' ');
    else text = 'I do not see a direct fit rule between these two parts, so either should work with the other. The PC builder checks the whole set at once.';
    if (!bad.length && warn.length) text += ' Note: ' + warn.map(c => c.text).join(' ');
    return say(text, { cards: cardsFor(list), actions: [{ label: 'Check a full build', href: 'build.html' }], chips: ['Talk to the team'] });
  }

  /* Which parts the fit rules in compat.js can check: target slot -> the parts it is checked against */
  const LINKS = { motherboard: ['cpu', 'ram', 'case'], cpu: ['motherboard'], ram: ['motherboard'], cooler: ['cpu', 'motherboard'], case: ['motherboard'] };
  const BUILD_LINK = { label: 'Check a full build', href: 'build.html' };

  function compatList(p, target, st, e) {
    st.focusId = p.id;
    const all = products.filter(c => c.cat === target && instock(c));
    const best = list => list.slice().sort(ranker(null, null, [])).slice(0, 3);
    if (target === 'ram') {                                      // memory follows the motherboard, or the boards that suit the processor
      const types = p.cat === 'motherboard' ? [p.ramType]
        : uniq(products.filter(b => b.cat === 'motherboard' && b.socket === p.socket).map(b => b.ramType));
      const asked = (/ddr ?([45])/.exec(e ? e.t : '') || [])[1];
      const reason = p.cat === 'motherboard' ? 'The ' + p.name + ' takes ' + joinAnd(types) + ' memory.'
        : 'The ' + p.name + ' uses the ' + p.socket + ' socket, and boards for it take ' + joinAnd(types) + ' memory.';
      const okAll = all.filter(c => types.indexOf(c.type) !== -1);
      if (asked && types.indexOf('DDR' + asked) === -1) {
        return say('**No.** ' + reason + ' DDR' + asked + ' memory will not fit. These kits do:', { cards: cardsFor(best(okAll)), after: PART_TIPS.ram, actions: [BUILD_LINK] });
      }
      const fits = asked ? okAll.filter(c => c.type === 'DDR' + asked) : okAll;
      if (!fits.length) return say(reason + ' I do not have a matching kit in stock right now.', { actions: contactActions(st) });
      return say((asked ? '**Yes.** ' : '') + reason + ' These kits will work:', { cards: cardsFor(best(fits)), after: PART_TIPS.ram, actions: [BUILD_LINK] });
    }
    const sel = {};
    sel[p.cat] = p.id;
    const fits = all.filter(c => !PCS.compat.conflict(target, c, sel));
    if (!fits.length) return say('I could not find any ' + noun(target) + ' in stock that fit with the ' + p.name + '.', { actions: contactActions(st) });
    const shown = best(fits);
    return say(fits.length + ' of ' + all.length + ' ' + noun(target) + ' fit with the ' + p.name + '. Here ' + (shown.length === 1 ? 'is the match' : 'are the best-known ones') + ':',
      { cards: cardsFor(shown), after: PART_TIPS[target] || '', actions: [BUILD_LINK] });
  }

  function alternatives(p, dir, st) {
    let pool = products.filter(x => x.cat === p.cat && x.id !== p.id && instock(x) && (!p.use || x.use === p.use));
    pool = pool.filter(x => (dir < 0 ? x.price < p.price : x.price > p.price));
    pool.sort((a, b) => (dir < 0 ? b.price - a.price : a.price - b.price));
    st.focusId = p.id;
    st.cat = p.cat === 'prebuilt' ? '' : p.cat;                  // so "show more" and "cheaper" carry on from here
    st.use = p.use ? [p.use] : [];
    st.budget = null; st.terms = []; st.brand = '';
    if (!pool.length) {
      return say('The ' + p.name + ' is already the ' + (dir < 0 ? 'lowest-priced ' : 'most powerful ') + (p.use ? useLabel(p.use) + ' ' : '') + one(p.cat) + ' I have.',
        { chips: dir < 0 ? ['Show more powerful', 'EMI on this'] : ['Show cheaper options', 'EMI on this'], actions: contactActions(st) });
    }
    const shown = pool.slice(0, 3);
    st.last = { kind: 'rec', ids: pool.map(x => x.id), offset: shown.length };
    return say((dir < 0 ? 'Cheaper' : 'Higher-priced') + ' options than the ' + p.name + ' (' + money(p.price) + '):', { cards: cardsFor(shown), chips: ['EMI on the first one'] });
  }

  function fitReply(p, uses, st) {
    st.focusId = p.id;
    if (p.cat !== 'prebuilt') return say('The ' + p.name + ' is a ' + one(p.cat) + ', not a full PC, so it does not decide how well games or editing run on its own. Tell me what the PC is for and I can suggest a full PC.', { chips: ['Gaming PC', 'Video editing PC'] });
    const u = uses[0];
    if (p.use === u) return say('Yes. The **' + p.name + '** is built for ' + useLabel(u) + '.\n\n' + specLines(p).join('\n') + '\n\n' + USE_TIPS[u], { cards: cardsFor([p]), chips: ['EMI on this', 'Show cheaper options'] });
    const better = products.filter(x => x.cat === 'prebuilt' && x.use === u && instock(x) && x.price <= p.price * 1.3).sort((a, b) => b.price - a.price).slice(0, 2);
    return say('The **' + p.name + '** is tuned for ' + useLabel(p.use) + ', so it is not the best fit for ' + useLabel(u) + '.' + (better.length ? ' These suit ' + useLabel(u) + ' better at a similar price:' : ' Ask me for ' + useLabel(u) + ' PCs and a budget.'),
      { cards: cardsFor(better), chips: [cap(useLabel(u)) + ' PC under ' + money(nice(p.price * 1.2))] });
  }

  function otherCat(s, exclude) {
    let best = null;
    CAT_RE.forEach(pair => {
      if (pair[0] === exclude || pair[0] === 'prebuilt') return;
      const m = pair[1].exec(s);
      if (m && (!best || m.index < best.at)) best = { id: pair[0], at: m.index };
    });
    return best ? best.id : '';
  }

  function productTalk(e, st, env) {
    const all = findProducts(e.t, e.consumed);
    const found = perSegment(e.t, e.consumed);
    const pron = /\b(this|it|that one|this one|the same|first one|the first)\b/.test(e.t);
    const pageId = env && env.page === 'product' ? env.pageProductId : '';
    const onPage = pageId && !e.catInfo && !e.use.length && !e.budget ? by[pageId] : null;
    const loose = !pron && !onPage && !st.last && st.focusId && !e.catInfo && !e.use.length && !e.budget &&
      /\b(cheaper|costlier|powerful|better|upgrade|faster|lower|higher)\b/.test(e.t) ? by[st.focusId] : null;
    const focus = (pron ? by[pageId || st.focusId] : null) || onPage || loose;
    const cmp = /\b(vs|versus|compare|comparison|difference|differences|better|or)\b/.test(e.t);
    const fitWord = /\b(compatible|compatibility|work with|works with|fit|fits|go with|goes with|match|pair|support|supports|suit|suits)\b/.test(e.t);

    const priceWord = /\b(price|prices|cost|specs?|details?|rate)\b/.test(e.t);

    if (found.length >= 2) {
      const slots = found.every(p => SLOT_CATS.indexOf(p.cat) !== -1) && uniq(found.map(p => p.cat)).length === found.length;
      if (PCS.compat && slots && (fitWord || (!cmp && !priceWord))) return compatPair(found.slice(0, 4), st);
      return compareReply(found[0], found[1], st);
    }
    const base = found[0] || all[0] || focus;
    if (base && PCS.compat && SLOT_CATS.indexOf(base.cat) !== -1) {      // "which motherboard for ryzen 5 7600"
      const target = otherCat(e.t, base.cat);
      if (target && LINKS[target] && (LINKS[target].indexOf(base.cat) !== -1 || (target === 'ram' && base.cat === 'cpu'))) return compatList(base, target, st, e);
    }
    if (base && e.catInfo && e.catInfo.id !== base.cat && e.catInfo.id !== 'prebuilt' &&
        /\b(which|what|suggest|recommend|best|need|needs|want|show|good|enough|for)\b/.test(e.t)) {       // "which psu for rtx 5060"
      st.focusId = base.id;
      if (e.catInfo.id === 'psu' && (base.cat === 'gpu' || base.cat === 'cpu')) {
        const watts = (base.cat === 'cpu' ? base.tdp : 65) + (base.cat === 'gpu' ? base.tdp : 0) + 100, rec = Math.ceil(watts * 1.5 / 50) * 50;
        const pick = products.filter(x => x.cat === 'psu' && instock(x) && x.watt >= rec).sort((a, b) => a.price - b.price).slice(0, 3);
        if (pick.length) {
          st.cat = 'psu'; st.budget = null; st.terms = []; st.brand = '';
          st.last = { kind: 'rec', ids: pick.map(x => x.id), offset: pick.length };
          return say('The ' + base.name + ' draws about ' + base.tdp + ' W. With ' + (base.cat === 'gpu' ? 'a typical 65 W processor' : 'no graphics card') + ' the whole PC is roughly ' + watts +
            ' W, so choose ' + rec + ' W or more. These power supplies cover it:', { cards: cardsFor(pick), after: PART_TIPS.psu, actions: [BUILD_LINK] });
        }
      }
      st.cat = e.catInfo.id; st.budget = null; st.terms = []; st.brand = '';
      return recommend(Object.assign({}, e, { tk: [], model: [] }), st);
    }
    if (focus && !all.length) {                                  // "this" or "it" on a product page or after a result
      if (/\b(cheaper|lower|less expensive|cheap|budget)\b/.test(e.t)) return alternatives(focus, -1, st);
      if (/\b(better|upgrade|faster|powerful|higher|premium|costlier)\b/.test(e.t)) return alternatives(focus, 1, st);
      if (e.use.length && /\b(good|suitable|enough|ok|okay|fine|best|right|work|run|handle)\b/.test(e.t)) return fitReply(focus, e.use, st);
      if (/\b(tell|about|details|specs?|info|what|features?)\b/.test(e.t)) return infoReply([focus], st);
    }
    if (all.length && (!e.catInfo || e.model.length)) return infoReply(all, st);
    if (e.model.length && !all.length && e.catInfo && e.catInfo.id !== 'prebuilt') {
      st.cat = e.catInfo.id;
      st.budget = null;
      const r = recommend(Object.assign({}, e, { tk: [], model: [] }), st);
      r.text = 'I could not find "' + e.model[0].toUpperCase() + '" in the catalogue. ' + r.text;
      return r;
    }
    if (e.catInfo && SLOT_CATS.indexOf(e.catInfo.id) !== -1 && !all.length &&
        /\b(compatible|compatibility|works? with|goes? with|fits?|match(?:es)?)\b/.test(e.t) && /\b(my|the|this|a)\s+(board|motherboard|cpu|processor|ram|cabinet|case|cooler)\b/.test(e.t)) {
      return say('Which part do you already have? For example "RAM for B650M board" or "motherboard for Ryzen 5 7600", and I will show what fits.',
        { chips: ['RAM for B650M board', 'Motherboard for Ryzen 5 7600', 'Cooler for Core i5 14400F'] });
    }
    return null;
  }

  /* ---------- General knowledge ---------- */
  function kbTalk(e) {
    for (let i = 0; i < KB.length; i++) {
      if (KB[i].re.test(e.t)) return say(KB[i].text, { chips: KB[i].chips, actions: KB[i].actions });
    }
    return null;
  }

  /* ---------- Follow-ups: "more", "cheaper", "something better" ---------- */
  function followTalk(e, st) {
    const last = st.last;
    if (!last || last.kind !== 'rec' || e.catInfo || e.use.length || e.budget) return null;
    const more = /\b(more|another|others?|next|else)\b/.test(e.t);
    const cheaper = /\b(cheaper|lower|less expensive|lesser)\b/.test(e.t);
    const better = /\b(better|faster|powerful|stronger|higher|upgrade|bigger|costlier|expensive)\b/.test(e.t);
    if (!(more || cheaper || better || e.cheap || e.top)) return null;
    e.carry = true;                                            // keep the words and brand from the search being refined
    if (e.cheap || e.top) { st.budget = null; return recommend(e, st); }       // "cheapest", "most powerful"
    const shown = last.ids.slice(Math.max(0, last.offset - 3), last.offset).map(id => by[id]).filter(Boolean);
    if ((cheaper || better) && shown.length) {
      const pool = basePool(e, st).pool.filter(instock);
      const prices = shown.map(p => p.price);
      if (cheaper) {
        const low = Math.min.apply(null, prices);
        if (!pool.some(p => p.price < low)) {
          return say('The ' + shown.filter(p => p.price === low)[0].name + ' is already the lowest-priced one I have for this search.', { chips: ['Show more powerful', 'EMI on this'], actions: contactActions(st) });
        }
        st.budget = { min: 0, max: low - 1 };
      } else {
        const high = Math.max.apply(null, prices);
        if (!pool.some(p => p.price > high)) {
          return say('The ' + shown.filter(p => p.price === high)[0].name + ' is already the most powerful one I have for this search.', { chips: ['Show cheaper', 'EMI on this'], actions: contactActions(st) });
        }
        st.budget = { min: high + 1, max: 0 };
      }
      return recommend(e, st);
    }
    const next = last.ids.slice(last.offset, last.offset + 3).map(id => by[id]).filter(Boolean);
    if (!next.length) return say('That is everything I have for this search. Try a different budget, or ask the team on WhatsApp.', { chips: ['Show cheaper', 'Show more powerful'], actions: contactActions(st) });
    last.offset += next.length;
    return say('Here are ' + next.length + ' more:', { cards: cardsFor(next), chips: last.offset < last.ids.length ? ['Show more'] : ['Show cheaper', 'Show more powerful'] });
  }

  /* ---------- Shopping requests ---------- */
  const RECWORDS = /\b(suggest|recommend|recommendation|best|good|which|show|need|want|looking|buy|get|options?|list|cheap|cheapest|affordable|top|premium)\b/;

  function recTalk(e, st) {
    const ask = e.use.length || e.catInfo || e.budget || e.cheap || e.top || (RECWORDS.test(e.t) && (st.use.length || st.cat || st.budget));
    if (!ask) return null;
    if (e.budget && !e.catInfo && !e.use.length) e.carry = true;     // "under 5000" refines the last search
    if (e.use.length) { st.use = e.use; if (!e.catInfo) st.cat = ''; }
    if (e.catInfo) {
      if (e.catInfo.id !== st.cat && !(e.catInfo.id === 'prebuilt' && !st.cat)) {
        st.cat = e.catInfo.id === 'prebuilt' ? '' : e.catInfo.id;
        if (!e.budget) st.budget = null;
      }
    }
    if (e.budget) st.budget = e.budget;
    else if (e.cheap || e.top || /\bshow all\b/.test(e.t)) st.budget = null;
    return recommend(e, st);
  }

  /* A question that matches the shop's own FAQ list */
  function faqSearch(e) {
    const q = e.tk.filter(w => w.length > 3 && !STOP.has(w));
    let best = null;
    (cfg.faq || []).forEach(f => {
      const ft = tokens(f.q + ' ' + f.a);
      const score = q.filter(w => ft.indexOf(w) !== -1).length;
      if (score >= 2 && (!best || score > best.score)) best = { f: f, score: score };
    });
    return best ? say(best.f.a, { chips: ['Talk to the team'] }) : null;
  }

  /* ---------- Small talk, resets and the fallback ---------- */
  function startChips(env) {
    const page = env && env.page;
    if (page === 'product' && env.pageProductId) return ['Tell me about this one', 'Show cheaper options', 'EMI on this', 'Show more powerful'];
    if (page === 'cart') return ['EMI on my cart', 'Delivery charges', 'Payment options'];
    if (page === 'build') return ['Which RAM fits my board?', 'How much power supply do I need?', 'AMD or Intel?'];
    if (page === 'contact' || page === 'policies') return ['Talk to the team', 'Warranty rules', 'Return policy'];
    return ['Suggest a gaming PC under ₹70,000', 'Best PC for video editing', 'PC for trading with 4 screens', 'How does EMI work?', 'Delivery and warranty'];
  }

  function socialTalk(e, st, env) {
    if (/^(hi+|hello+|hey+|hii+|namaste|hola|good (morning|afternoon|evening))\b/.test(e.t) && e.tk.length <= 5) {
      return say('Hello. What can I help you with?', { chips: startChips(env) });
    }
    if (/\b(thanks|thank you|thx|thanku|shukriya|dhanyavad)\b/.test(e.t) && e.tk.length <= 6) {
      return say('You are welcome. Ask me anything else, or I can pass you to the team on WhatsApp.', { actions: contactActions(st) });
    }
    if (/^(bye|goodbye|see you|ok bye|that is all|thats all)\b/.test(e.t)) return say('Goodbye. I will be here if you need anything.');
    if (/\b(start over|reset|new search|clear (?:all|everything|filters)|forget (?:it|that))\b/.test(e.t)) {
      Object.assign(st, initialState());
      return say('Okay, starting fresh. What is the PC for?', { chips: startChips(env) });
    }
    return null;
  }

  function fallback(e, st, env) {
    return say('I am not sure I understood that. I can suggest PCs and parts for your budget, compare products, check if parts fit together, work out EMI, and answer questions about delivery, warranty and returns. You can also ask the team on WhatsApp.',
      { chips: startChips(env), actions: contactActions(st), conf: 'low' });
  }

  /* ---------- The one function the chat window calls ---------- */
  function reply(raw, state, env) {
    env = env || {};
    const st = Object.assign(initialState(), state || {});
    st.use = (st.use || []).slice();
    st.terms = (st.terms || []).slice();
    if (st.last) st.last = Object.assign({}, st.last);
    const text = String(raw || '').trim().slice(0, 300);
    if (!text) return { message: say('Type a question, or pick one of the options below.', { chips: startChips(env) }), state: st, conf: 'high' };
    const e = understand(text);
    const steps = [socialTalk, emiTalk, cartTalk, faqTalk, productTalk, kbTalk, followTalk, recTalk, faqSearch];
    let out = null;
    for (let i = 0; i < steps.length && !out; i++) out = steps[i](e, st, env);
    if (!out) out = fallback(e, st, env);
    return { message: out, state: st, conf: out.conf };
  }

  PCS.brain = {
    reply: reply, initialState: initialState, startChips: startChips,
    parseBudget: parseBudget, normalize: normalize, findProducts: findProducts, contactActions: contactActions, waText: waText
  };
})(window.PCS);
