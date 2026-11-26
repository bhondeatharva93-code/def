import {
  CatalogItem,
  isBuilderSlotCategory,
  normalizeCatalogItem,
  slugifyId,
  validateCatalogItem,
} from './catalogHelpers';

const PRODUCT_COLUMNS = [
  'id',
  'cat',
  'subcategory',
  'brand',
  'name',
  'price',
  'mrp',
  'stock',
  'visible',
  'featured',
  'sortOrder',
  'use',
  'specs',
  'tags',
  'img',
  'images',
  'description',
  'part_cpu',
  'part_gpu',
  'part_ram',
  'part_ssd',
  'part_psu',
  'part_case',
] as const;

const BUILDER_COLUMNS = [
  'id',
  'cat',
  'brand',
  'name',
  'price',
  'mrp',
  'stock',
  'visible',
  'featured',
  'sortOrder',
  'specs',
  'tags',
  'img',
  'images',
  'description',
  'socket',
  'ramType',
  'type',
  'form',
  'tdp',
  'igpu',
  'watt',
  'sockets',
  'supports',
] as const;

export function escapeCsvCell(value: unknown): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeCsv(headers: readonly string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(','));
  }
  return lines.join('\r\n');
}

export function exportCatalogCsv(items: CatalogItem[], mode: 'products' | 'builderParts'): string {
  if (mode === 'builderParts') {
    const rows = items.map((p) => ({
      id: p.id,
      cat: p.cat,
      brand: p.brand,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock ? 'true' : 'false',
      visible: p.visible !== false ? 'true' : 'false',
      featured: p.featured ? 'true' : 'false',
      sortOrder: p.sortOrder ?? 0,
      specs: (p.specs || []).join(' | '),
      tags: (p.tags || []).join(', '),
      img: p.img || '',
      images: (p.images || []).join(' | '),
      description: p.description || '',
      socket: p.socket || '',
      ramType: p.ramType || '',
      type: p.type || '',
      form: p.form || '',
      tdp: p.tdp ?? '',
      igpu: p.igpu === undefined ? '' : p.igpu ? 'true' : 'false',
      watt: p.watt ?? '',
      sockets: (p.sockets || []).join(', '),
      supports: (p.supports || []).join(', '),
    }));
    return serializeCsv(BUILDER_COLUMNS, rows);
  }

  const rows = items.map((p) => ({
    id: p.id,
    cat: p.cat,
    subcategory: p.subcategory || '',
    brand: p.brand,
    name: p.name,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock ? 'true' : 'false',
    visible: p.visible !== false ? 'true' : 'false',
    featured: p.featured ? 'true' : 'false',
    sortOrder: p.sortOrder ?? 0,
    use: p.use || '',
    specs: (p.specs || []).join(' | '),
    tags: (p.tags || []).join(', '),
    img: p.img || '',
    images: (p.images || []).join(' | '),
    description: p.description || '',
    part_cpu: p.parts?.cpu || '',
    part_gpu: p.parts?.gpu || '',
    part_ram: p.parts?.ram || '',
    part_ssd: p.parts?.ssd || '',
    part_psu: p.parts?.psu || '',
    part_case: p.parts?.case || '',
  }));
  return serializeCsv(PRODUCT_COLUMNS, rows);
}

/**
 * RFC-4180 compliant CSV parser handling quoted cells, escaped quotes (""), and CRLF/LF.
 */
export function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  const input = text.replace(/^\uFEFF/, '');
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function parseBoolCell(raw: string | undefined, defaultVal: boolean): boolean {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return defaultVal;
  if (['false', '0', 'no', 'n', 'off', 'hidden', 'out'].includes(v)) return false;
  if (['true', '1', 'yes', 'y', 'on', 'visible', 'in'].includes(v)) return true;
  return defaultVal;
}

function splitPipeOrSemicolon(raw: string | undefined): string[] {
  return String(raw || '')
    .split(/\s*[|;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitComma(raw: string | undefined): string[] {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface CsvPreviewRow {
  rowNumber: number;
  action: 'create' | 'update';
  item: CatalogItem;
}

export interface CsvRowError {
  rowNumber: number;
  id: string;
  name: string;
  messages: string[];
}

export interface CsvPreviewResult {
  validRows: CsvPreviewRow[];
  errors: CsvRowError[];
  createCount: number;
  updateCount: number;
}

export function previewCsvImport(
  csvText: string,
  mode: 'products' | 'builderParts',
  existingIds: Set<string>
): CsvPreviewResult {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) {
    return {
      validRows: [],
      errors: [{ rowNumber: 1, id: '', name: '', messages: ['CSV file must contain a header row and at least one data row.'] }],
      createCount: 0,
      updateCount: 0,
    };
  }

  const headers = matrix[0].map((h) => h.trim());
  const requiredHeaders = ['cat', 'brand', 'name', 'price'];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 1,
          id: '',
          name: '',
          messages: [`Missing required CSV columns: ${missingHeaders.join(', ')}`],
        },
      ],
      createCount: 0,
      updateCount: 0,
    };
  }

  const validRows: CsvPreviewRow[] = [];
  const errors: CsvRowError[] = [];
  let createCount = 0;
  let updateCount = 0;
  const seenIdsInCsv = new Set<string>();

  for (let i = 1; i < matrix.length; i++) {
    const rowNum = i + 1;
    const rawCells = matrix[i];
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = (rawCells[idx] ?? '').trim();
    });

    const cat = rec.cat || '';
    const rawId = rec.id || '';
    const id = rawId || slugifyId(rec.name || cat, cat || 'item');
    const action: 'create' | 'update' = rawId && existingIds.has(rawId) ? 'update' : 'create';

    const rowErrors: string[] = [];
    if (seenIdsInCsv.has(id)) {
      rowErrors.push(`Duplicate id "${id}" in CSV.`);
    }
    seenIdsInCsv.add(id);

    const priceNum = Number(rec.price);
    if (rec.price === '' || !Number.isFinite(priceNum)) {
      rowErrors.push('Invalid price.');
    }
    const mrpNum = rec.mrp ? Number(rec.mrp) : priceNum;
    if (rec.mrp && !Number.isFinite(mrpNum)) {
      rowErrors.push('Invalid mrp (old price).');
    }

    const sortNum = rec.sortOrder ? Number(rec.sortOrder) : 0;
    if (rec.sortOrder && !Number.isFinite(sortNum)) {
      rowErrors.push('Invalid sortOrder.');
    }

    const parts: Record<string, string> = {};
    if (rec.part_cpu) parts.cpu = rec.part_cpu;
    if (rec.part_gpu) parts.gpu = rec.part_gpu;
    if (rec.part_ram) parts.ram = rec.part_ram;
    if (rec.part_ssd) parts.ssd = rec.part_ssd;
    if (rec.part_psu) parts.psu = rec.part_psu;
    if (rec.part_case) parts.case = rec.part_case;

    const candidate = normalizeCatalogItem({
      id,
      cat,
      subcategory: rec.subcategory || undefined,
      brand: rec.brand || '',
      name: rec.name || '',
      price: Number.isFinite(priceNum) ? priceNum : -1,
      mrp: Number.isFinite(mrpNum) ? mrpNum : -1,
      stock: parseBoolCell(rec.stock, true),
      visible: parseBoolCell(rec.visible, true),
      featured: parseBoolCell(rec.featured, false),
      sortOrder: Number.isFinite(sortNum) ? sortNum : 0,
      use: rec.use || undefined,
      specs: splitPipeOrSemicolon(rec.specs),
      tags: splitComma(rec.tags),
      img: rec.img || undefined,
      images: splitPipeOrSemicolon(rec.images),
      description: rec.description || undefined,
      parts: Object.keys(parts).length ? parts : undefined,
      socket: rec.socket || undefined,
      ramType: rec.ramType || undefined,
      type: rec.type || undefined,
      form: rec.form || undefined,
      tdp: rec.tdp !== '' && rec.tdp !== undefined ? Number(rec.tdp) : undefined,
      igpu: rec.igpu !== '' && rec.igpu !== undefined ? parseBoolCell(rec.igpu, false) : undefined,
      watt: rec.watt !== '' && rec.watt !== undefined ? Number(rec.watt) : undefined,
      sockets: rec.sockets ? splitComma(rec.sockets) : undefined,
      supports: rec.supports ? splitComma(rec.supports) : undefined,
    });

    if (mode === 'builderParts' && !isBuilderSlotCategory(candidate.cat)) {
      rowErrors.push(`Category "${candidate.cat}" is not a valid builder part type.`);
    }

    const fieldErrors = validateCatalogItem(candidate, mode);
    Object.values(fieldErrors).forEach((m) => rowErrors.push(m));

    if (rowErrors.length) {
      errors.push({
        rowNumber: rowNum,
        id,
        name: candidate.name || '(unnamed)',
        messages: Array.from(new Set(rowErrors)),
      });
    } else {
      validRows.push({ rowNumber: rowNum, action, item: candidate });
      if (action === 'update') updateCount++;
      else createCount++;
    }
  }

  return { validRows, errors, createCount, updateCount };
}
