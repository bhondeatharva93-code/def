import { CatalogItem, isBuilderSlotCategory, normalizeCatalogItem } from './catalogHelpers';

const BRAND_NAME = 'Computer Galaxy';
const ALL_SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'];

function item(
  id: string,
  cat: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  specs: string[],
  extra: Partial<CatalogItem> = {},
  sortOrder = 0
): CatalogItem {
  return normalizeCatalogItem({
    id,
    cat,
    brand,
    name,
    price,
    mrp,
    specs,
    tags: [],
    stock: true,
    visible: true,
    featured: false,
    sortOrder,
    ...extra,
  });
}

function pc(
  id: string,
  use: string,
  name: string,
  price: number,
  mrp: number,
  parts: NonNullable<CatalogItem['parts']>,
  tags: string[] = [],
  stock = true,
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'prebuilt',
    BRAND_NAME,
    name,
    price,
    mrp,
    [parts.cpu || '', parts.gpu || '', `${parts.ram || ''}, ${parts.ssd || ''}`],
    {
      use,
      parts,
      tags,
      stock,
      featured: tags.includes('best'),
    },
    sortOrder
  );
}

function cpu(
  id: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  socket: string,
  tdp: number,
  igpu: boolean,
  spec: string,
  tags: string[] = [],
  stock = true,
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'cpu',
    brand,
    name,
    price,
    mrp,
    [spec, `${socket} socket`, `${tdp} W`],
    { socket, tdp, igpu, tags, stock, featured: tags.includes('best') },
    sortOrder
  );
}

function mb(
  id: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  socket: string,
  ramType: string,
  form: string,
  tags: string[] = [],
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'motherboard',
    brand,
    name,
    price,
    mrp,
    [`${socket} socket`, `${ramType} memory`, `${form} size`],
    { socket, ramType, form, tags, featured: tags.includes('best') },
    sortOrder
  );
}

function ram(
  id: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  type: string,
  spec: string,
  tags: string[] = [],
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'ram',
    brand,
    name,
    price,
    mrp,
    [type, spec],
    { type, tags, featured: tags.includes('best') },
    sortOrder
  );
}

function gpu(
  id: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  tdp: number,
  vram: string,
  tags: string[] = [],
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'gpu',
    brand,
    name,
    price,
    mrp,
    [vram, `${tdp} W board power`],
    { tdp, tags, featured: tags.includes('best') },
    sortOrder
  );
}

function psu(
  id: string,
  brand: string,
  name: string,
  price: number,
  mrp: number,
  watt: number,
  tags: string[] = [],
  sortOrder = 0
): CatalogItem {
  return item(
    id,
    'psu',
    brand,
    name,
    price,
    mrp,
    [`${watt} W output`],
    { watt, tags, featured: tags.includes('best') },
    sortOrder
  );
}

export const SEED_ALL_ITEMS: CatalogItem[] = [
  // Prebuilt PCs
  pc('pc-office-i3', 'office', 'Office Starter', 21499, 24999, { cpu: 'Core i3-12100', gpu: 'Integrated graphics', ram: '8 GB DDR4', ssd: '256 GB NVMe', psu: '450 W', case: 'Compact cabinet' }, [], true, 1),
  pc('pc-office-r5', 'office', 'Office Plus', 26999, 31499, { cpu: 'Ryzen 5 5600G', gpu: 'Integrated graphics', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '450 W', case: 'Compact cabinet' }, ['best'], true, 2),
  pc('pc-study-i5', 'office', 'Study and Code', 31999, 36999, { cpu: 'Core i5-12400', gpu: 'Integrated graphics', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W', case: 'Mesh-front cabinet' }, ['best'], true, 3),
  pc('pc-gaming-1', 'gaming', 'Esports Starter', 42999, 49999, { cpu: 'Ryzen 5 5600', gpu: 'GeForce RTX 3050 6 GB', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W Bronze', case: 'ARGB glass cabinet' }, ['rgb', 'best'], true, 4),
  pc('pc-gaming-2', 'gaming', '1080p Gamer', 68999, 79999, { cpu: 'Ryzen 5 7600', gpu: 'GeForce RTX 5060 8 GB', ram: '16 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'ARGB glass cabinet' }, ['rgb', 'best', 'hot'], true, 5),
  pc('pc-gaming-3', 'gaming', '1440p Gamer', 84999, 99999, { cpu: 'Core i5-14400F', gpu: 'GeForce RTX 5060 Ti 16 GB', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '750 W Gold', case: 'Mesh-front ARGB cabinet' }, ['rgb'], true, 6),
  pc('pc-gaming-4', 'gaming', '4K Ready', 129999, 149999, { cpu: 'Ryzen 7 9700X', gpu: 'GeForce RTX 5070 12 GB', ram: '32 GB DDR5', ssd: '2 TB NVMe', psu: '850 W Gold', case: 'Dual-chamber glass cabinet' }, ['rgb', 'new'], true, 7),
  pc('pc-edit-1', 'editing', 'Edit Starter', 74999, 86999, { cpu: 'Ryzen 5 7600', gpu: 'GeForce RTX 4060 8 GB', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'Mesh-front cabinet' }, ['best'], true, 8),
  pc('pc-edit-2', 'editing', 'Edit Pro', 119999, 139999, { cpu: 'Core i7-14700F', gpu: 'GeForce RTX 5060 Ti 16 GB', ram: '32 GB DDR5', ssd: '2 TB NVMe', psu: '750 W Gold', case: 'Mesh-front cabinet' }, [], true, 9),
  pc('pc-edit-3', 'editing', 'Studio', 159999, 184999, { cpu: 'Ryzen 7 9700X', gpu: 'GeForce RTX 5070 12 GB', ram: '64 GB DDR5', ssd: '2 TB NVMe', psu: '850 W Gold', case: 'Dual-chamber glass cabinet' }, ['rgb'], false, 10),
  pc('pc-trade-1', 'trading', 'Trader, 4 screens', 36999, 42999, { cpu: 'Core i5-12400', gpu: 'Quad-display graphics card', ram: '16 GB DDR4', ssd: '512 GB NVMe', psu: '550 W', case: 'Mesh-front cabinet' }, ['best'], true, 11),
  pc('pc-trade-2', 'trading', 'Trader Pro, 6 screens', 62999, 73999, { cpu: 'Ryzen 5 7600', gpu: 'Six-display graphics card', ram: '32 GB DDR5', ssd: '1 TB NVMe', psu: '650 W Bronze', case: 'Mesh-front cabinet' }, [], true, 12),

  // Laptops
  item('lap-student', 'laptop', 'Orbit', '15.6 inch student laptop', 34990, 42990, ['Core i3, 8 GB, 512 GB SSD', '15.6 inch Full HD'], { tags: ['best'], featured: true }, 13),
  item('lap-work', 'laptop', 'Orbit', '14 inch everyday laptop', 52990, 62990, ['Ryzen 5, 16 GB, 512 GB SSD', '14 inch, 1.4 kg'], {}, 14),
  item('lap-gaming', 'laptop', 'Orbit', '15.6 inch gaming laptop', 78990, 94990, ['Core i5, RTX 4050, 16 GB', '144 Hz display'], { tags: ['rgb'] }, 15),

  // Processors
  cpu('cpu-r5-5600', 'AMD', 'Ryzen 5 5600', 8999, 11999, 'AM4', 65, false, '6 cores, 12 threads', ['best'], true, 1),
  cpu('cpu-r5-5600g', 'AMD', 'Ryzen 5 5600G', 11499, 13999, 'AM4', 65, true, '6 cores, built-in graphics', [], true, 2),
  cpu('cpu-r5-7600', 'AMD', 'Ryzen 5 7600', 17999, 22999, 'AM5', 65, true, '6 cores, 12 threads', ['best'], true, 3),
  cpu('cpu-r7-7700', 'AMD', 'Ryzen 7 7700', 25499, 31999, 'AM5', 65, true, '8 cores, 16 threads', [], true, 4),
  cpu('cpu-r7-9700x', 'AMD', 'Ryzen 7 9700X', 32999, 38999, 'AM5', 65, true, '8 cores, 16 threads', ['new'], true, 5),
  cpu('cpu-i3-12100f', 'Intel', 'Core i3-12100F', 6799, 8499, 'LGA1700', 58, false, '4 cores, 8 threads', [], true, 6),
  cpu('cpu-i5-12400f', 'Intel', 'Core i5-12400F', 10799, 13499, 'LGA1700', 65, false, '6 cores, 12 threads', ['best'], true, 7),
  cpu('cpu-i5-14400f', 'Intel', 'Core i5-14400F', 18499, 22999, 'LGA1700', 65, false, '10 cores, 16 threads', [], true, 8),
  cpu('cpu-i7-14700f', 'Intel', 'Core i7-14700F', 32499, 39999, 'LGA1700', 65, false, '20 cores, 28 threads', [], true, 9),
  cpu('cpu-cu5-245k', 'Intel', 'Core Ultra 5 245K', 29999, 34999, 'LGA1851', 125, true, '14 cores, unlocked', ['new'], true, 10),

  // Motherboards
  mb('mb-a520m', 'Nimbus', 'A520M board', 4999, 6499, 'AM4', 'DDR4', 'mATX', [], 11),
  mb('mb-b550m', 'Nimbus', 'B550M board', 8499, 10499, 'AM4', 'DDR4', 'mATX', ['best'], 12),
  mb('mb-b650m', 'Orbit', 'B650M board', 11999, 14999, 'AM5', 'DDR5', 'mATX', ['best'], 13),
  mb('mb-b650-atx', 'Orbit', 'B650 board with Wi-Fi', 17499, 20999, 'AM5', 'DDR5', 'ATX', [], 14),
  mb('mb-b650i', 'Axiom', 'B650 mini-ITX board', 19999, 23999, 'AM5', 'DDR5', 'ITX', [], 15),
  mb('mb-h610m', 'Nimbus', 'H610M board', 6499, 7999, 'LGA1700', 'DDR4', 'mATX', [], 16),
  mb('mb-b760m-d4', 'Orbit', 'B760M board', 9999, 12499, 'LGA1700', 'DDR4', 'mATX', [], 17),
  mb('mb-b760-d5', 'Axiom', 'B760 board with Wi-Fi', 14999, 17999, 'LGA1700', 'DDR5', 'ATX', [], 18),
  mb('mb-z890', 'Axiom', 'Z890 board with Wi-Fi', 27999, 32999, 'LGA1851', 'DDR5', 'ATX', ['new'], 19),

  // Memory
  ram('ram-d4-8', 'Kestrel', 'DDR4 3200 MHz, 8 GB', 1899, 2499, 'DDR4', '1 x 8 GB', [], 20),
  ram('ram-d4-16', 'Kestrel', 'DDR4 3200 MHz, 16 GB', 3499, 4499, 'DDR4', '2 x 8 GB kit', ['best'], 21),
  ram('ram-d4-32', 'Kestrel', 'DDR4 3600 MHz, 32 GB', 6299, 7999, 'DDR4', '2 x 16 GB kit', [], 22),
  ram('ram-d5-16', 'Lumen', 'DDR5 5600 MHz, 16 GB', 5299, 6799, 'DDR5', '2 x 8 GB kit', [], 23),
  ram('ram-d5-32', 'Lumen', 'DDR5 6000 MHz, 32 GB, RGB', 9499, 12499, 'DDR5', '2 x 16 GB kit', ['rgb', 'best'], 24),
  ram('ram-d5-64', 'Lumen', 'DDR5 6000 MHz, 64 GB, RGB', 18999, 23999, 'DDR5', '2 x 32 GB kit', ['rgb'], 25),

  // Graphics cards
  gpu('gpu-3050', 'NVIDIA', 'GeForce RTX 3050 6 GB', 14299, 17999, 70, '6 GB GDDR6', [], 26),
  gpu('gpu-4060', 'NVIDIA', 'GeForce RTX 4060 8 GB', 27999, 33999, 115, '8 GB GDDR6', [], 27),
  gpu('gpu-5060', 'NVIDIA', 'GeForce RTX 5060 8 GB', 31499, 36999, 145, '8 GB GDDR7', ['best', 'new'], 28),
  gpu('gpu-5060ti', 'NVIDIA', 'GeForce RTX 5060 Ti 16 GB', 44999, 52999, 180, '16 GB GDDR7', ['new'], 29),
  gpu('gpu-5070', 'NVIDIA', 'GeForce RTX 5070 12 GB', 57999, 66999, 250, '12 GB GDDR7', [], 30),
  gpu('gpu-rx7600', 'AMD', 'Radeon RX 7600 8 GB', 25499, 31999, 165, '8 GB GDDR6', [], 31),
  gpu('gpu-rx9060xt', 'AMD', 'Radeon RX 9060 XT 16 GB', 38999, 45999, 160, '16 GB GDDR6', ['new'], 32),

  // Storage
  item('ssd-500-g3', 'ssd', 'Kestrel', 'NVMe SSD, 500 GB', 2999, 3999, ['500 GB', 'NVMe, PCIe 3.0'], {}, 33),
  item('ssd-1t-g4', 'ssd', 'Kestrel', 'NVMe SSD, 1 TB', 5999, 7999, ['1 TB', 'NVMe, PCIe 4.0'], { tags: ['best'], featured: true }, 34),
  item('ssd-2t-g4', 'ssd', 'Kestrel', 'NVMe SSD, 2 TB', 11999, 15499, ['2 TB', 'NVMe, PCIe 4.0'], {}, 35),
  item('ssd-512-sata', 'ssd', 'Nimbus', 'SATA SSD, 512 GB', 2799, 3499, ['512 GB', 'SATA, 2.5 inch'], {}, 36),
  item('hdd-1t', 'ssd', 'Nimbus', 'Hard drive, 1 TB', 3499, 4299, ['1 TB', '3.5 inch, 7200 rpm'], {}, 37),

  // Coolers
  item('cool-lowp', 'cooler', 'Nimbus', 'Low-profile CPU cooler', 799, 1199, ['For 65 W processors', 'AM4, AM5, LGA1700'], { sockets: ['AM4', 'AM5', 'LGA1700'] }, 38),
  item('cool-tower', 'cooler', 'Nimbus', 'Single-tower air cooler', 1799, 2499, ['4 heat pipes', '120 mm fan'], { sockets: ALL_SOCKETS, tags: ['best'], featured: true }, 39),
  item('cool-dual', 'cooler', 'Nimbus', 'Dual-tower air cooler', 3999, 5499, ['6 heat pipes', 'Two 120 mm fans'], { sockets: ALL_SOCKETS }, 40),
  item('cool-aio240', 'cooler', 'Lumen', '240 mm liquid cooler, ARGB', 6999, 9499, ['240 mm radiator', 'ARGB pump and fans'], { sockets: ALL_SOCKETS, tags: ['rgb'] }, 41),
  item('cool-aio360', 'cooler', 'Lumen', '360 mm liquid cooler, ARGB', 10999, 14999, ['360 mm radiator', 'ARGB pump and fans'], { sockets: ALL_SOCKETS, tags: ['rgb'] }, 42),

  // Cabinets
  item('case-matx', 'case', 'Orbit', 'Micro-ATX cabinet', 2499, 3499, ['Fits mATX and mini-ITX', '1 fan included'], { supports: ['mATX', 'ITX'] }, 43),
  item('case-mesh', 'case', 'Orbit', 'Mesh-front airflow cabinet', 4299, 5799, ['Fits ATX and smaller', '3 fans included'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['best'], featured: true }, 44),
  item('case-argb', 'case', 'Lumen', 'Glass ARGB cabinet', 5499, 7499, ['Fits ATX and smaller', '4 ARGB fans, glass panel'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['rgb', 'best'], featured: true }, 45),
  item('case-dual', 'case', 'Lumen', 'Dual-chamber glass cabinet', 8999, 11999, ['Fits ATX and smaller', 'Glass front and side'], { supports: ['ATX', 'mATX', 'ITX'], tags: ['rgb'] }, 46),
  item('case-itx', 'case', 'Axiom', 'Compact mini-ITX cabinet', 7499, 8999, ['Fits mini-ITX only', 'Small footprint'], { supports: ['ITX'] }, 47),

  // Power supplies
  psu('psu-450', 'Nimbus', '450 W power supply', 1999, 2799, 450, [], 48),
  psu('psu-550', 'Nimbus', '550 W, 80+ Bronze', 3299, 4499, 550, [], 49),
  psu('psu-650', 'Orbit', '650 W, 80+ Bronze', 4299, 5799, 650, ['best'], 50),
  psu('psu-750g', 'Orbit', '750 W, 80+ Gold, modular', 7299, 9499, 750, [], 51),
  psu('psu-850g', 'Orbit', '850 W, 80+ Gold, modular', 9999, 12999, 850, [], 52),

  // Monitors
  item('mon-24-100', 'monitor', 'Orbit', '24 inch Full HD, 100 Hz', 7499, 9999, ['IPS panel', '1920 x 1080'], { tags: ['best'], featured: true }, 16),
  item('mon-24-180', 'monitor', 'Orbit', '24 inch Full HD, 180 Hz', 10999, 14499, ['Fast IPS panel', '1920 x 1080'], {}, 17),
  item('mon-27-165', 'monitor', 'Axiom', '27 inch QHD, 165 Hz', 17999, 23999, ['IPS panel', '2560 x 1440'], {}, 18),
  item('mon-27-4k', 'monitor', 'Axiom', '27 inch 4K, 60 Hz', 24999, 32999, ['IPS panel', '3840 x 2160'], {}, 19),
  item('mon-34-uw', 'monitor', 'Axiom', '34 inch ultrawide, curved', 31999, 41999, ['165 Hz', '3440 x 1440'], { tags: ['new'], stock: false }, 20),

  // Keyboards, mice, headsets, speakers, controllers
  item('kb-tkl', 'keyboard', 'Kestrel', 'Mechanical keyboard, TKL', 2499, 3499, ['RGB backlight', 'Hot-swap switches'], { tags: ['rgb', 'best'], featured: true }, 21),
  item('kb-combo', 'keyboard', 'Kestrel', 'Keyboard and mouse combo', 899, 1299, ['Wired, quiet keys', 'Spill-resistant'], {}, 22),
  item('kb-75', 'keyboard', 'Kestrel', '75% wireless keyboard', 4499, 5999, ['Bluetooth and 2.4 GHz', 'Mechanical switches'], { tags: ['new'] }, 23),
  item('ms-rgb', 'mouse', 'Kestrel', 'Gaming mouse, RGB', 899, 1499, ['7200 DPI', '6 buttons'], { tags: ['rgb', 'best'], featured: true }, 24),
  item('ms-lite', 'mouse', 'Kestrel', 'Lightweight wireless mouse', 2799, 3799, ['2.4 GHz wireless', 'Under 70 g'], {}, 25),
  item('ms-office', 'mouse', 'Kestrel', 'Wireless office mouse', 449, 699, ['2.4 GHz wireless', 'Silent clicks'], {}, 26),
  item('hs-stereo', 'headset', 'Kestrel', 'Stereo gaming headset', 1499, 2499, ['RGB earcups', 'Detachable mic'], { tags: ['rgb'] }, 27),
  item('hs-71', 'headset', 'Kestrel', 'Wireless 7.1 headset', 3999, 5499, ['2.4 GHz wireless', '30 hour battery'], {}, 28),
  item('sp-20', 'speaker', 'Nimbus', '2.0 USB speakers', 899, 1299, ['USB powered', '6 W output'], {}, 29),
  item('sp-21', 'speaker', 'Nimbus', '2.1 speakers with subwoofer', 2499, 3299, ['40 W output', 'Bluetooth'], { tags: ['best'], featured: true }, 30),
  item('sp-bar', 'speaker', 'Lumen', 'RGB soundbar', 3299, 4499, ['USB and Bluetooth', 'RGB lighting'], { tags: ['rgb'] }, 31),
  item('gp-wireless', 'gamepad', 'Kestrel', 'Wireless gamepad', 1899, 2499, ['PC and Android', 'Rechargeable'], {}, 32),

  // UPS, printers, CCTV
  item('ups-600', 'ups', 'Orbit', '600 VA UPS', 2799, 3699, ['For one PC', 'Short backup'], {}, 33),
  item('ups-1100', 'ups', 'Orbit', '1100 VA UPS', 5899, 7499, ['PC and monitor', 'Long backup'], { tags: ['best'], featured: true }, 34),
  item('ups-1k-online', 'ups', 'Orbit', '1 kVA online UPS', 17999, 22999, ['Zero transfer time', 'For servers and workstations'], {}, 35),
  item('pr-inkjet', 'printer', 'Axiom', 'All-in-one inkjet printer', 8499, 10999, ['Print, scan, copy', 'Wi-Fi'], {}, 36),
  item('pr-tank', 'printer', 'Axiom', 'Wireless ink-tank printer', 14499, 17999, ['Low cost per page', 'Print, scan, copy'], { tags: ['best'], featured: true }, 37),
  item('pr-laser', 'printer', 'Axiom', 'Mono laser printer', 10999, 13999, ['Fast text printing', 'Duplex'], {}, 38),
  item('cc-dome', 'cctv', 'Nimbus', '2 MP Wi-Fi dome camera', 1499, 2199, ['1080p video', 'Night vision'], {}, 39),
  item('cc-kit', 'cctv', 'Nimbus', '4-channel DVR kit, 2 cameras', 7999, 10999, ['Recorder and 2 cameras', '1 TB storage'], { tags: ['best'], featured: true }, 40),
  item('cc-bullet', 'cctv', 'Nimbus', '4 MP outdoor bullet camera', 3499, 4799, ['Weatherproof', 'Night vision'], {}, 41),
];

export const SEED_STOREFRONT_PRODUCTS: CatalogItem[] = SEED_ALL_ITEMS.filter(
  (i) => !isBuilderSlotCategory(i.cat)
);

export const SEED_BUILDER_PARTS: CatalogItem[] = SEED_ALL_ITEMS.filter((i) =>
  isBuilderSlotCategory(i.cat)
);
