/* ==========================================================================
   Catalogue
   Sample products and prices. Replace them with your own.

   Every product needs: id (unique, never changes), cat, brand, name, price,
   mrp (the crossed-out price; use the same number as price for no discount)
   and specs (short lines shown on the card).

   Optional fields: tags ['best' | 'hot' | 'new' | 'rgb'], stock (false hides
   the add-to-cart button), use (prebuilt PCs only) and parts (prebuilt PCs).
   The custom builder also reads socket, ramType, form, supports, sockets,
   watt, tdp and igpu. Brands other than AMD, Intel and NVIDIA are made up.
   ========================================================================== */
(function (PCS) {
  'use strict';
  var cfg = PCS.config;

  PCS.groups = [
    { id: 'systems', label: 'PCs and laptops' },
    { id: 'parts', label: 'Components' },
    { id: 'gear', label: 'Peripherals' },
    { id: 'office', label: 'Office and security' }
  ];

  /* kw = extra words people may search for */
  PCS.categories = [
    { id: 'prebuilt', label: 'Prebuilt PCs', group: 'systems', icon: 'tower', kw: 'pc computer desktop' },
    { id: 'laptop', label: 'Laptops', group: 'systems', icon: 'laptop', kw: 'notebook' },
    { id: 'cpu', label: 'Processors', group: 'parts', icon: 'cpu', kw: 'cpu ryzen core intel amd' },
    { id: 'motherboard', label: 'Motherboards', group: 'parts', icon: 'board', kw: 'mobo board' },
    { id: 'ram', label: 'Memory (RAM)', group: 'parts', icon: 'ram', kw: 'ram ddr4 ddr5 memory' },
    { id: 'gpu', label: 'Graphics cards', group: 'parts', icon: 'gpu', kw: 'gpu video geforce radeon rtx nvidia' },
    { id: 'ssd', label: 'SSD and storage', group: 'parts', icon: 'ssd', kw: 'ssd nvme hdd hard disk drive' },
    { id: 'cooler', label: 'CPU coolers', group: 'parts', icon: 'fan', kw: 'cooler fan aio liquid heatsink' },
    { id: 'case', label: 'Cabinets', group: 'parts', icon: 'case', kw: 'case cabinet chassis' },
    { id: 'psu', label: 'Power supplies', group: 'parts', icon: 'psu', kw: 'psu smps power supply' },
    { id: 'monitor', label: 'Monitors', group: 'gear', icon: 'monitor', kw: 'display screen' },
    { id: 'keyboard', label: 'Keyboards', group: 'gear', icon: 'keyboard', kw: 'keyboard mechanical' },
    { id: 'mouse', label: 'Mice', group: 'gear', icon: 'mouse', kw: 'mouse' },
    { id: 'headset', label: 'Headsets', group: 'gear', icon: 'headset', kw: 'headphone headphones' },
    { id: 'speaker', label: 'Speakers', group: 'gear', icon: 'speaker', kw: 'speaker soundbar audio' },
    { id: 'gamepad', label: 'Controllers', group: 'gear', icon: 'gamepad', kw: 'gamepad joystick' },
    { id: 'ups', label: 'UPS', group: 'office', icon: 'ups', kw: 'ups battery backup inverter' },
    { id: 'printer', label: 'Printers', group: 'office', icon: 'printer', kw: 'printer inkjet laser' },
    { id: 'cctv', label: 'CCTV cameras', group: 'office', icon: 'cctv', kw: 'camera security surveillance' }
  ];

  /* One colour per use. The hue tints the PC art and the home page tuner. */
  PCS.uses = [
    { id: 'gaming', label: 'Gaming', hue: '#8b3dff', text: '#ffffff', icon: 'gamepad',
      blurb: 'High frame rates in Valorant, GTA V and Cyberpunk.' },
    { id: 'editing', label: 'Editing', hue: '#ff7a1a', text: '#1a0f00', icon: 'film',
      blurb: 'Smooth timelines in Premiere Pro, DaVinci Resolve and After Effects.' },
    { id: 'trading', label: 'Trading', hue: '#16a765', text: '#02180d', icon: 'chart',
      blurb: 'Many monitors, fast charts and no lag when the market moves.' },
    { id: 'office', label: 'Office and study', hue: '#2760f0', text: '#ffffff', icon: 'briefcase',
      blurb: 'Tally, billing, online classes, coding and family use.' }
  ];

  var products = (PCS.products = []);

  function add(id, cat, brand, name, price, mrp, specs, extra) {
    var p = { id: id, cat: cat, brand: brand, name: name, price: price, mrp: mrp, specs: specs, tags: [], stock: true };
    for (var k in (extra || {})) p[k] = extra[k];
    products.push(p);
    return p;
  }

  /* ---- Prebuilt PCs (house builds, so the brand is the store name) ---- */
  function pc(id, use, name, price, mrp, parts, tags, stock) {
    add(id, 'prebuilt', cfg.name, name, price, mrp,
      [parts.cpu, parts.gpu, parts.ram + ', ' + parts.ssd],
      { use: use, parts: parts, tags: tags || [], stock: stock !== false });
  }
  pc('pc-office-i3', 'office', 'Office Starter', 21499, 24999,
    { cpu: 'Core i3-12100', gpu: 'Integrated graphics', ram: '8 GB DDR4', ssd: '256 GB NVMe', psu: '450 W', case: 'Compact cabinet' });
  pc('pc-office-r5', 'office', 'Office Plus', 26999, 31499,
    { cpu: 'Ryzen 5 5600G', gpu: 'Integrated graphics', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '450 W', case: 'Compact cabinet' }, ['best']);
  pc('pc-study-i5', 'office', 'Study and Code', 31999, 36999,
    { cpu: 'Core i5-12400', gpu: 'Integrated graphics', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W', case: 'Mesh-front cabinet' }, ['best']);
  pc('pc-gaming-1', 'gaming', 'Esports Starter', 42999, 49999,
    { cpu: 'Ryzen 5 5600', gpu: 'GeForce RTX 3050 6 GB', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W Bronze', case: 'ARGB glass cabinet' }, ['rgb', 'best']);
  pc('pc-gaming-2', 'gaming', '1080p Gamer', 68999, 79999,
    { cpu: 'Ryzen 5 7600', gpu: 'GeForce RTX 5060 8 GB', ram: '16 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'ARGB glass cabinet' }, ['rgb', 'best', 'hot']);
  pc('pc-gaming-3', 'gaming', '1440p Gamer', 84999, 99999,
    { cpu: 'Core i5-14400F', gpu: 'GeForce RTX 5060 Ti 16 GB', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '750 W Gold', case: 'Mesh-front ARGB cabinet' }, ['rgb']);
  pc('pc-gaming-4', 'gaming', '4K Ready', 129999, 149999,
    { cpu: 'Ryzen 7 9700X', gpu: 'GeForce RTX 5070 12 GB', ram: '32 GB DDR5', ssd: '2 TB NVMe', psu: '850 W Gold', case: 'Dual-chamber glass cabinet' }, ['rgb', 'new']);
  pc('pc-edit-1', 'editing', 'Edit Starter', 74999, 86999,
    { cpu: 'Ryzen 5 7600', gpu: 'GeForce RTX 4060 8 GB', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'Mesh-front cabinet' }, ['best']);
  pc('pc-edit-2', 'editing', 'Edit Pro', 119999, 139999,
    { cpu: 'Core i7-14700F', gpu: 'GeForce RTX 5060 Ti 16 GB', ram: '32 GB DDR5', ssd: '2 TB NVMe', psu: '750 W Gold', case: 'Mesh-front cabinet' });
  pc('pc-edit-3', 'editing', 'Studio', 159999, 184999,
    { cpu: 'Ryzen 7 9700X', gpu: 'GeForce RTX 5070 12 GB', ram: '64 GB DDR5', ssd: '2 TB NVMe', psu: '850 W Gold', case: 'Dual-chamber glass cabinet' }, ['rgb'], false);
  pc('pc-trade-1', 'trading', 'Trader, 4 screens', 36999, 42999,
    { cpu: 'Core i5-12400', gpu: 'Quad-display graphics card', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W', case: 'Mesh-front cabinet' }, ['best']);
  pc('pc-trade-2', 'trading', 'Trader Pro, 6 screens', 62999, 73999,
    { cpu: 'Ryzen 5 7600', gpu: 'Six-display graphics card', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'Mesh-front cabinet' });

  /* ---- Laptops ---- */
  add('lap-student', 'laptop', 'Orbit', '15.6 inch student laptop', 34990, 42990, ['Core i3, 8 GB, 512 GB SSD', '15.6 inch Full HD'], { tags: ['best'] });
  add('lap-work', 'laptop', 'Orbit', '14 inch everyday laptop', 52990, 62990, ['Ryzen 5, 16 GB, 512 GB SSD', '14 inch, 1.4 kg']);
  add('lap-gaming', 'laptop', 'Orbit', '15.6 inch gaming laptop', 78990, 94990, ['Core i5, RTX 4050, 16 GB', '144 Hz display'], { tags: ['rgb'] });

  /* ---- Processors ---- */
  function cpu(id, brand, name, price, mrp, socket, tdp, igpu, spec, tags, stock) {
    add(id, 'cpu', brand, name, price, mrp, [spec, socket + ' socket', tdp + ' W'],
      { socket: socket, tdp: tdp, igpu: igpu, tags: tags || [], stock: stock !== false });
  }
  cpu('cpu-r5-5600', 'AMD', 'Ryzen 5 5600', 8999, 11999, 'AM4', 65, false, '6 cores, 12 threads', ['best']);
  cpu('cpu-r5-5600g', 'AMD', 'Ryzen 5 5600G', 11499, 13999, 'AM4', 65, true, '6 cores, built-in graphics');
  cpu('cpu-r5-7600', 'AMD', 'Ryzen 5 7600', 17999, 22999, 'AM5', 65, true, '6 cores, 12 threads', ['best']);
  cpu('cpu-r7-7700', 'AMD', 'Ryzen 7 7700', 25499, 31999, 'AM5', 65, true, '8 cores, 16 threads');
  cpu('cpu-r7-9700x', 'AMD', 'Ryzen 7 9700X', 32999, 38999, 'AM5', 65, true, '8 cores, 16 threads', ['new']);
  cpu('cpu-i3-12100f', 'Intel', 'Core i3-12100F', 6799, 8499, 'LGA1700', 58, false, '4 cores, 8 threads');
  cpu('cpu-i5-12400f', 'Intel', 'Core i5-12400F', 10799, 13499, 'LGA1700', 65, false, '6 cores, 12 threads', ['best']);
  cpu('cpu-i5-14400f', 'Intel', 'Core i5-14400F', 18499, 22999, 'LGA1700', 65, false, '10 cores, 16 threads');
  cpu('cpu-i7-14700f', 'Intel', 'Core i7-14700F', 32499, 39999, 'LGA1700', 65, false, '20 cores, 28 threads');
  cpu('cpu-cu5-245k', 'Intel', 'Core Ultra 5 245K', 29999, 34999, 'LGA1851', 125, true, '14 cores, unlocked', ['new']);

  /* ---- Motherboards ---- */
  function mb(id, brand, name, price, mrp, socket, ramType, form, tags) {
    add(id, 'motherboard', brand, name, price, mrp, [socket + ' socket', ramType + ' memory', form + ' size'],
      { socket: socket, ramType: ramType, form: form, tags: tags || [] });
  }
  mb('mb-a520m', 'Nimbus', 'A520M board', 4999, 6499, 'AM4', 'DDR4', 'mATX');
  mb('mb-b550m', 'Nimbus', 'B550M board', 8499, 10499, 'AM4', 'DDR4', 'mATX', ['best']);
  mb('mb-b650m', 'Orbit', 'B650M board', 11999, 14999, 'AM5', 'DDR5', 'mATX', ['best']);
  mb('mb-b650-atx', 'Orbit', 'B650 board with Wi-Fi', 17499, 20999, 'AM5', 'DDR5', 'ATX');
  mb('mb-b650i', 'Axiom', 'B650 mini-ITX board', 19999, 23999, 'AM5', 'DDR5', 'ITX');
  mb('mb-h610m', 'Nimbus', 'H610M board', 6499, 7999, 'LGA1700', 'DDR4', 'mATX');
  mb('mb-b760m-d4', 'Orbit', 'B760M board', 9999, 12499, 'LGA1700', 'DDR4', 'mATX');
  mb('mb-b760-d5', 'Axiom', 'B760 board with Wi-Fi', 14999, 17999, 'LGA1700', 'DDR5', 'ATX');
  mb('mb-z890', 'Axiom', 'Z890 board with Wi-Fi', 27999, 32999, 'LGA1851', 'DDR5', 'ATX', ['new']);

  /* ---- Memory ---- */
  function ram(id, brand, name, price, mrp, type, spec, tags) {
    add(id, 'ram', brand, name, price, mrp, [type, spec], { type: type, tags: tags || [] });
  }
  ram('ram-d4-8', 'Kestrel', 'DDR4 3200 MHz, 8 GB', 1899, 2499, 'DDR4', '1 x 8 GB');
  ram('ram-d4-16', 'Kestrel', 'DDR4 3200 MHz, 16 GB', 3499, 4499, 'DDR4', '2 x 8 GB kit', ['best']);
  ram('ram-d4-32', 'Kestrel', 'DDR4 3600 MHz, 32 GB', 6299, 7999, 'DDR4', '2 x 16 GB kit');
  ram('ram-d5-16', 'Lumen', 'DDR5 5600 MHz, 16 GB', 5299, 6799, 'DDR5', '2 x 8 GB kit');
  ram('ram-d5-32', 'Lumen', 'DDR5 6000 MHz, 32 GB, RGB', 9499, 12499, 'DDR5', '2 x 16 GB kit', ['rgb', 'best']);
  ram('ram-d5-64', 'Lumen', 'DDR5 6000 MHz, 64 GB, RGB', 18999, 23999, 'DDR5', '2 x 32 GB kit', ['rgb']);

  /* ---- Graphics cards ---- */
  function gpu(id, brand, name, price, mrp, tdp, vram, tags) {
    add(id, 'gpu', brand, name, price, mrp, [vram, tdp + ' W board power'], { tdp: tdp, tags: tags || [] });
  }
  gpu('gpu-3050', 'NVIDIA', 'GeForce RTX 3050 6 GB', 14299, 17999, 70, '6 GB GDDR6');
  gpu('gpu-4060', 'NVIDIA', 'GeForce RTX 4060 8 GB', 27999, 33999, 115, '8 GB GDDR6');
  gpu('gpu-5060', 'NVIDIA', 'GeForce RTX 5060 8 GB', 31499, 36999, 145, '8 GB GDDR7', ['best', 'new']);
  gpu('gpu-5060ti', 'NVIDIA', 'GeForce RTX 5060 Ti 16 GB', 44999, 52999, 180, '16 GB GDDR7', ['new']);
  gpu('gpu-5070', 'NVIDIA', 'GeForce RTX 5070 12 GB', 57999, 66999, 250, '12 GB GDDR7');
  gpu('gpu-rx7600', 'AMD', 'Radeon RX 7600 8 GB', 25499, 31999, 165, '8 GB GDDR6');
  gpu('gpu-rx9060xt', 'AMD', 'Radeon RX 9060 XT 16 GB', 38999, 45999, 160, '16 GB GDDR6', ['new']);

  /* ---- Storage ---- */
  add('ssd-500-g3', 'ssd', 'Kestrel', 'NVMe SSD, 500 GB', 2999, 3999, ['500 GB', 'NVMe, PCIe 3.0']);
  add('ssd-1t-g4', 'ssd', 'Kestrel', 'NVMe SSD, 1 TB', 5999, 7999, ['1 TB', 'NVMe, PCIe 4.0'], { tags: ['best'] });
  add('ssd-2t-g4', 'ssd', 'Kestrel', 'NVMe SSD, 2 TB', 11999, 15499, ['2 TB', 'NVMe, PCIe 4.0']);
  add('ssd-512-sata', 'ssd', 'Nimbus', 'SATA SSD, 512 GB', 2799, 3499, ['512 GB', 'SATA, 2.5 inch']);
  add('hdd-1t', 'ssd', 'Nimbus', 'Hard drive, 1 TB', 3499, 4299, ['1 TB', '3.5 inch, 7200 rpm']);

  /* ---- CPU coolers (sockets = the sockets each cooler can mount on) ---- */
  var ALL = ['AM4', 'AM5', 'LGA1700', 'LGA1851'];
  add('cool-lowp', 'cooler', 'Nimbus', 'Low-profile CPU cooler', 799, 1199, ['For 65 W processors', 'AM4, AM5, LGA1700'], { sockets: ['AM4', 'AM5', 'LGA1700'] });
  add('cool-tower', 'cooler', 'Nimbus', 'Single-tower air cooler', 1799, 2499, ['4 heat pipes', '120 mm fan'], { sockets: ALL, tags: ['best'] });
  add('cool-dual', 'cooler', 'Nimbus', 'Dual-tower air cooler', 3999, 5499, ['6 heat pipes', 'Two 120 mm fans'], { sockets: ALL });
  add('cool-aio240', 'cooler', 'Lumen', '240 mm liquid cooler, ARGB', 6999, 9499, ['240 mm radiator', 'ARGB pump and fans'], { sockets: ALL, tags: ['rgb'] });
  add('cool-aio360', 'cooler', 'Lumen', '360 mm liquid cooler, ARGB', 10999, 14999, ['360 mm radiator', 'ARGB pump and fans'], { sockets: ALL, tags: ['rgb'] });

  /* ---- Cabinets (supports = motherboard sizes that fit) ---- */
  add('case-matx', 'case', 'Orbit', 'Micro-ATX cabinet', 2499, 3499, ['Fits mATX and mini-ITX', '1 fan included'], { supports: ['mATX', 'ITX'] });
  add('case-mesh', 'case', 'Orbit', 'Mesh-front airflow cabinet', 4299, 5799, ['Fits ATX and smaller', '3 fans included'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['best'] });
  add('case-argb', 'case', 'Lumen', 'Glass ARGB cabinet', 5499, 7499, ['Fits ATX and smaller', '4 ARGB fans, glass panel'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['rgb', 'best'] });
  add('case-dual', 'case', 'Lumen', 'Dual-chamber glass cabinet', 8999, 11999, ['Fits ATX and smaller', 'Glass front and side'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['rgb'] });
  add('case-itx', 'case', 'Axiom', 'Compact mini-ITX cabinet', 7499, 8999, ['Fits mini-ITX only', 'Small footprint'], { supports: ['ITX'] });

  /* ---- Power supplies ---- */
  function psu(id, brand, name, price, mrp, watt, tags) {
    add(id, 'psu', brand, name, price, mrp, [watt + ' W output'], { watt: watt, tags: tags || [] });
  }
  psu('psu-450', 'Nimbus', '450 W power supply', 1999, 2799, 450);
  psu('psu-550', 'Nimbus', '550 W, 80+ Bronze', 3299, 4499, 550);
  psu('psu-650', 'Orbit', '650 W, 80+ Bronze', 4299, 5799, 650, ['best']);
  psu('psu-750g', 'Orbit', '750 W, 80+ Gold, modular', 7299, 9499, 750);
  psu('psu-850g', 'Orbit', '850 W, 80+ Gold, modular', 9999, 12999, 850);

  /* ---- Monitors ---- */
  add('mon-24-100', 'monitor', 'Orbit', '24 inch Full HD, 100 Hz', 7499, 9999, ['IPS panel', '1920 x 1080'], { tags: ['best'] });
  add('mon-24-180', 'monitor', 'Orbit', '24 inch Full HD, 180 Hz', 10999, 14499, ['Fast IPS panel', '1920 x 1080']);
  add('mon-27-165', 'monitor', 'Axiom', '27 inch QHD, 165 Hz', 17999, 23999, ['IPS panel', '2560 x 1440']);
  add('mon-27-4k', 'monitor', 'Axiom', '27 inch 4K, 60 Hz', 24999, 32999, ['IPS panel', '3840 x 2160']);
  add('mon-34-uw', 'monitor', 'Axiom', '34 inch ultrawide, curved', 31999, 41999, ['165 Hz', '3440 x 1440'], { tags: ['new'], stock: false });

  /* ---- Keyboards, mice, headsets, speakers, controllers ---- */
  add('kb-tkl', 'keyboard', 'Kestrel', 'Mechanical keyboard, TKL', 2499, 3499, ['RGB backlight', 'Hot-swap switches'], { tags: ['rgb', 'best'] });
  add('kb-combo', 'keyboard', 'Kestrel', 'Keyboard and mouse combo', 899, 1299, ['Wired, quiet keys', 'Spill-resistant']);
  add('kb-75', 'keyboard', 'Kestrel', '75% wireless keyboard', 4499, 5999, ['Bluetooth and 2.4 GHz', 'Mechanical switches'], { tags: ['new'] });
  add('ms-rgb', 'mouse', 'Kestrel', 'Gaming mouse, RGB', 899, 1499, ['7200 DPI', '6 buttons'], { tags: ['rgb', 'best'] });
  add('ms-lite', 'mouse', 'Kestrel', 'Lightweight wireless mouse', 2799, 3799, ['2.4 GHz wireless', 'Under 70 g']);
  add('ms-office', 'mouse', 'Kestrel', 'Wireless office mouse', 449, 699, ['2.4 GHz wireless', 'Silent clicks']);
  add('hs-stereo', 'headset', 'Kestrel', 'Stereo gaming headset', 1499, 2499, ['RGB earcups', 'Detachable mic'], { tags: ['rgb'] });
  add('hs-71', 'headset', 'Kestrel', 'Wireless 7.1 headset', 3999, 5499, ['2.4 GHz wireless', '30 hour battery']);
  add('sp-20', 'speaker', 'Nimbus', '2.0 USB speakers', 899, 1299, ['USB powered', '6 W output']);
  add('sp-21', 'speaker', 'Nimbus', '2.1 speakers with subwoofer', 2499, 3299, ['40 W output', 'Bluetooth'], { tags: ['best'] });
  add('sp-bar', 'speaker', 'Lumen', 'RGB soundbar', 3299, 4499, ['USB and Bluetooth', 'RGB lighting'], { tags: ['rgb'] });
  add('gp-wireless', 'gamepad', 'Kestrel', 'Wireless gamepad', 1899, 2499, ['PC and Android', 'Rechargeable']);

  /* ---- UPS, printers, CCTV ---- */
  add('ups-600', 'ups', 'Orbit', '600 VA UPS', 2799, 3699, ['For one PC', 'Short backup']);
  add('ups-1100', 'ups', 'Orbit', '1100 VA UPS', 5899, 7499, ['PC and monitor', 'Long backup'], { tags: ['best'] });
  add('ups-1k-online', 'ups', 'Orbit', '1 kVA online UPS', 17999, 22999, ['Zero transfer time', 'For servers and workstations']);
  add('pr-inkjet', 'printer', 'Axiom', 'All-in-one inkjet printer', 8499, 10999, ['Print, scan, copy', 'Wi-Fi']);
  add('pr-tank', 'printer', 'Axiom', 'Wireless ink-tank printer', 14499, 17999, ['Low cost per page', 'Print, scan, copy'], { tags: ['best'] });
  add('pr-laser', 'printer', 'Axiom', 'Mono laser printer', 10999, 13999, ['Fast text printing', 'Duplex']);
  add('cc-dome', 'cctv', 'Nimbus', '2 MP Wi-Fi dome camera', 1499, 2199, ['1080p video', 'Night vision']);
  add('cc-kit', 'cctv', 'Nimbus', '4-channel DVR kit, 2 cameras', 7999, 10999, ['Recorder and 2 cameras', '1 TB storage'], { tags: ['best'] });
  add('cc-bullet', 'cctv', 'Nimbus', '4 MP outdoor bullet camera', 3499, 4799, ['Weatherproof', 'Night vision']);

  /* ---- Lookups and helpers ---- */
  PCS.byId = {};
  PCS.catById = {};
  PCS.useById = {};
  PCS.categories.forEach(function (c) { PCS.catById[c.id] = c; });
  PCS.uses.forEach(function (u) { PCS.useById[u.id] = u; });

  products.forEach(function (p) {
    PCS.byId[p.id] = p;
    var cat = PCS.catById[p.cat];
    var use = p.use ? PCS.useById[p.use].label : '';
    var parts = p.parts ? Object.keys(p.parts).map(function (k) { return p.parts[k]; }).join(' ') : '';
    p._hay = [p.name, p.brand, cat.label, cat.kw, use, p.specs.join(' '), parts].join(' ').toLowerCase();
  });

  /* Discount percentage, 0 when there is none */
  PCS.discount = function (p) {
    return p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  };

  /* Products that contain every word in q, best matches first */
  PCS.search = function (q) {
    var words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return products
      .filter(function (p) { return words.every(function (w) { return p._hay.indexOf(w) !== -1; }); })
      .map(function (p) {
        var inName = words.every(function (w) { return p.name.toLowerCase().indexOf(w) !== -1; });
        return { p: p, score: (inName ? 2 : 0) + (p.tags.indexOf('best') !== -1 ? 1 : 0) };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (r) { return r.p; });
  };

  /* Cheapest prebuilt PC for a use, for "from" prices */
  PCS.cheapestPc = function (use) {
    return products.filter(function (p) { return p.cat === 'prebuilt' && p.use === use; })
      .sort(function (a, b) { return a.price - b.price; })[0];
  };

  PCS.brands = Object.keys(products.reduce(function (m, p) { m[p.brand] = 1; return m; }, {})).sort();
})(window.PCS);
