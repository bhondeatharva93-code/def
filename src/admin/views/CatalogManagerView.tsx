import React, { useEffect, useMemo, useState } from 'react';
import {
  BUILDER_SLOTS,
  BuilderSlotId,
  CATEGORIES,
  CAT_BY_ID,
  CatalogItem,
  calcDiscountPct,
  formatInr,
} from '../../data/catalogHelpers';
import { exportCatalogCsv } from '../../data/csvHelpers';
import {
  bulkUpdateCatalogField,
  deleteCatalogDocs,
  quickUpdateCatalogField,
} from '../../data/adminApi';
import { ConfirmState } from '../components/ConfirmAndToast';
import { CsvModal } from '../components/CsvModal';

interface CatalogManagerViewProps {
  mode: 'products' | 'builderParts';
  items: CatalogItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenNew: (defaultCat?: string) => void;
  onOpenEdit: (item: CatalogItem) => void;
  onDuplicate: (item: CatalogItem) => void;
  onAskConfirm: (state: ConfirmState) => void;
  onToast: (message: string, tone?: 'success' | 'error') => void;
}

const PAGE_SIZE = 20;

export function CatalogManagerView({
  mode,
  items,
  loading,
  onRefresh,
  onOpenNew,
  onOpenEdit,
  onDuplicate,
  onAskConfirm,
  onToast,
}: CatalogManagerViewProps) {
  const [slotTab, setSlotTab] = useState<BuilderSlotId>('cpu');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [visibleFilter, setVisibleFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'priceAsc' | 'priceDesc' | 'brand'>('order');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [mode, slotTab, search, catFilter, brandFilter, stockFilter, visibleFilter, sortBy]);

  const slotScopedItems = useMemo(() => {
    if (mode !== 'builderParts') return items;
    return items.filter((i) => i.cat === slotTab);
  }, [items, mode, slotTab]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    slotScopedItems.forEach((i) => i.brand && set.add(i.brand));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [slotScopedItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = slotScopedItems.filter((item) => {
      if (mode === 'products' && catFilter !== 'all' && item.cat !== catFilter) return false;
      if (brandFilter !== 'all' && item.brand !== brandFilter) return false;
      if (stockFilter === 'in' && !item.stock) return false;
      if (stockFilter === 'out' && item.stock) return false;
      if (visibleFilter === 'visible' && item.visible === false) return false;
      if (visibleFilter === 'hidden' && item.visible !== false) return false;
      if (q) {
        const hay = `${item.id} ${item.name} ${item.brand} ${item.cat} ${(item.specs || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'priceAsc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'priceDesc') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'brand') sorted.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
    else sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    return sorted;
  }, [slotScopedItems, mode, catFilter, brandFilter, stockFilter, visibleFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((i) => selectedIds.has(i.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageItems.forEach((i) => next.delete(i.id));
      } else {
        pageItems.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const handleQuickPriceSave = async (item: CatalogItem) => {
    const raw = priceDrafts[item.id];
    if (raw === undefined) return;
    const nextPrice = Math.round(Number(raw));
    if (!Number.isFinite(nextPrice) || nextPrice < 0 || nextPrice > 10000000) {
      onToast('Price must be between 0 and 1,00,00,000.', 'error');
      return;
    }
    if (nextPrice === item.price) {
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      return;
    }
    setBusyId(item.id);
    try {
      await quickUpdateCatalogField(mode, item.id, 'price', nextPrice);
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      await onRefresh();
      onToast(`Updated price for ${item.name}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update price.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuickToggle = async (item: CatalogItem, field: 'stock' | 'visible', nextVal: boolean) => {
    setBusyId(item.id);
    try {
      await quickUpdateCatalogField(mode, item.id, field, nextVal);
      await onRefresh();
      onToast(
        field === 'stock'
          ? `${item.name} marked ${nextVal ? 'in stock' : 'out of stock'}.`
          : `${item.name} is now ${nextVal ? 'visible' : 'hidden'}.`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSingleDelete = (item: CatalogItem) => {
    onAskConfirm({
      title: `Delete "${item.name}"?`,
      message: `This permanently deletes "${item.name}" (${item.id}) from Firestore. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
      danger: true,
      onConfirm: async () => {
        await deleteCatalogDocs(mode, [item.id]);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        await onRefresh();
        onToast(`Deleted ${item.name}.`);
      },
    });
  };

  const handleBulkAction = async (action: 'show' | 'hide' | 'inStock' | 'outStock' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === 'delete') {
      onAskConfirm({
        title: `Delete ${ids.length} selected items?`,
        message: `Are you sure you want to permanently delete ${ids.length} items from Firestore?`,
        confirmLabel: `Delete ${ids.length} items`,
        danger: true,
        onConfirm: async () => {
          await deleteCatalogDocs(mode, ids);
          setSelectedIds(new Set());
          await onRefresh();
          onToast(`Deleted ${ids.length} items.`);
        },
      });
      return;
    }

    const field = action === 'show' || action === 'hide' ? 'visible' : 'stock';
    const val = action === 'show' || action === 'inStock';
    try {
      await bulkUpdateCatalogField(mode, ids, field, val);
      setSelectedIds(new Set());
      await onRefresh();
      onToast(`Updated ${ids.length} items.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Bulk update failed.', 'error');
    }
  };

  const handleDownloadCsv = () => {
    const csv = exportCatalogCsv(mode === 'builderParts' ? items : filtered, mode);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `computer-galaxy-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Exported CSV file.');
  };

  const renderCompatSummary = (item: CatalogItem) => {
    if (item.cat === 'cpu') return `${item.socket || '-'} · ${item.tdp ?? 0}W${item.igpu ? ' · iGPU' : ''}`;
    if (item.cat === 'motherboard') return `${item.socket || '-'} · ${item.ramType || '-'} · ${item.form || '-'}`;
    if (item.cat === 'ram') return item.type || '-';
    if (item.cat === 'gpu') return `${item.tdp ?? 0}W TDP`;
    if (item.cat === 'psu') return `${item.watt ?? 0}W`;
    if (item.cat === 'cooler') return (item.sockets || []).join(', ') || '-';
    if (item.cat === 'case') return (item.supports || []).join(', ') || '-';
    return CAT_BY_ID[item.cat]?.label || item.cat;
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {mode === 'builderParts' && (
        <div className="cg-slot-tabs" role="tablist" aria-label="Builder part types">
          {BUILDER_SLOTS.map((slot) => {
            const count = items.filter((i) => i.cat === slot.id).length;
            return (
              <button
                key={slot.id}
                type="button"
                role="tab"
                aria-selected={slotTab === slot.id}
                className={`cg-tab${slotTab === slot.id ? ' is-active' : ''}`}
                onClick={() => setSlotTab(slot.id)}
              >
                <span>{slot.label}</span>
                <span className="cg-badge cg-badge--muted">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="cg-panel" style={{ display: 'grid', gap: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="cg-btn cg-btn--primary"
              onClick={() => onOpenNew(mode === 'builderParts' ? slotTab : 'prebuilt')}
            >
              + Add {mode === 'builderParts' ? CAT_BY_ID[slotTab]?.label || 'part' : 'product'}
            </button>
            <button type="button" className="cg-btn" onClick={handleDownloadCsv}>
              Export CSV
            </button>
            <button type="button" className="cg-btn" onClick={() => setCsvOpen(true)}>
              Import CSV
            </button>
          </div>
          <span className="cg-field-hint tabular">
            Showing {pageItems.length} of {filtered.length} items
          </span>
        </div>

        <div className="cg-toolbar">
          <input
            type="search"
            className="cg-input"
            placeholder="Search by name, brand, specs, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search catalog"
          />

          {mode === 'products' ? (
            <select
              className="cg-select"
              aria-label="Filter by category"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="cg-select"
              aria-label="Sort parts"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="order">Sort: Default order</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="priceAsc">Sort: Price low to high</option>
              <option value="priceDesc">Sort: Price high to low</option>
              <option value="brand">Sort: Brand</option>
            </select>
          )}

          <select
            className="cg-select"
            aria-label="Filter by brand"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="cg-select"
            aria-label="Filter by stock"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          >
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>

          <select
            className="cg-select"
            aria-label="Filter by visibility"
            value={visibleFilter}
            onChange={(e) => setVisibleFilter(e.target.value as typeof visibleFilter)}
          >
            <option value="all">All visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>

          {mode === 'products' && (
            <select
              className="cg-select"
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="order">Sort: Default order</option>
              <option value="name">Sort: Name A-Z</option>
              <option value="priceAsc">Sort: Price low to high</option>
              <option value="priceDesc">Sort: Price high to low</option>
              <option value="brand">Sort: Brand</option>
            </select>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="cg-bulk-bar">
          <strong>{selectedIds.size} selected</strong>
          <div className="cg-bulk-bar__actions">
            <button type="button" className="cg-btn cg-btn--sm" onClick={() => void handleBulkAction('show')}>
              Show
            </button>
            <button type="button" className="cg-btn cg-btn--sm" onClick={() => void handleBulkAction('hide')}>
              Hide
            </button>
            <button type="button" className="cg-btn cg-btn--sm" onClick={() => void handleBulkAction('inStock')}>
              Mark in stock
            </button>
            <button type="button" className="cg-btn cg-btn--sm" onClick={() => void handleBulkAction('outStock')}>
              Mark out of stock
            </button>
            <button type="button" className="cg-btn cg-btn--sm cg-btn--danger" onClick={() => void handleBulkAction('delete')}>
              Delete
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="cg-empty">
          <div className="cg-boot-spinner" aria-hidden="true" />
          <p>Loading catalog from Firestore...</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="cg-empty">
          <h3>No matching items found</h3>
          <p>Try clearing filters, or add a new {mode === 'builderParts' ? slotTab : 'product'}.</p>
          <button
            type="button"
            className="cg-btn cg-btn--primary"
            onClick={() => onOpenNew(mode === 'builderParts' ? slotTab : 'prebuilt')}
          >
            + Add item
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="cg-table-wrap">
            <table className="cg-table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all items on this page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectPage}
                    />
                  </th>
                  <th>Item</th>
                  <th>{mode === 'builderParts' ? 'Compatibility' : 'Category'}</th>
                  <th>Brand</th>
                  <th>Price (INR)</th>
                  <th>Old Price</th>
                  <th>Stock</th>
                  <th>Visible</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const draftPrice = priceDrafts[item.id];
                  const off = calcDiscountPct(item.price, item.mrp);
                  return (
                    <tr key={item.id} className={item.visible === false ? 'is-hidden-row' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.name}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td>
                        <div className="cg-item-cell">
                          <div className="cg-thumb">
                            {item.img ? (
                              <img src={item.img} alt="" loading="lazy" />
                            ) : (
                              <span>{(item.brand || 'CG').slice(0, 3).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="cg-item-meta">
                            <span className="cg-item-name">{item.name}</span>
                            <span className="cg-item-sub">
                              <code>{item.id}</code>
                              {item.featured && <span className="cg-badge cg-badge--gold">Featured</span>}
                              {off >= 5 && <span className="cg-badge cg-badge--ok">{off}% off</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{mode === 'builderParts' ? renderCompatSummary(item) : CAT_BY_ID[item.cat]?.label || item.cat}</td>
                      <td>{item.brand}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <input
                            type="number"
                            min={0}
                            max={10000000}
                            className="cg-input cg-input--inline"
                            aria-label={`Quick edit price for ${item.name}`}
                            value={draftPrice !== undefined ? draftPrice : String(item.price)}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                void handleQuickPriceSave(item);
                              }
                            }}
                          />
                          {draftPrice !== undefined && Number(draftPrice) !== item.price && (
                            <button
                              type="button"
                              className="cg-btn cg-btn--sm cg-btn--primary"
                              disabled={busyId === item.id}
                              onClick={() => void handleQuickPriceSave(item)}
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="tabular">{item.mrp > item.price ? formatInr(item.mrp) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={`cg-badge ${item.stock ? 'cg-badge--ok' : 'cg-badge--bad'}`}
                          style={{ border: 0, cursor: 'pointer' }}
                          disabled={busyId === item.id}
                          onClick={() => void handleQuickToggle(item, 'stock', !item.stock)}
                        >
                          {item.stock ? 'In stock' : 'Out of stock'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`cg-badge ${item.visible !== false ? 'cg-badge--gold' : 'cg-badge--muted'}`}
                          style={{ border: 0, cursor: 'pointer' }}
                          disabled={busyId === item.id}
                          onClick={() => void handleQuickToggle(item, 'visible', item.visible === false)}
                        >
                          {item.visible !== false ? 'Visible' : 'Hidden'}
                        </button>
                      </td>
                      <td>
                        <div className="cg-row-actions">
                          <button type="button" className="cg-btn cg-btn--sm" onClick={() => onOpenEdit(item)}>
                            Edit
                          </button>
                          <button type="button" className="cg-btn cg-btn--sm" onClick={() => onDuplicate(item)}>
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="cg-btn cg-btn--sm cg-btn--danger"
                            onClick={() => handleSingleDelete(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="cg-mobile-cards">
            {pageItems.map((item) => {
              const draftPrice = priceDrafts[item.id];
              return (
                <article key={item.id} className="cg-mobile-card">
                  <div className="cg-mobile-card__top">
                    <div className="cg-item-cell" style={{ minWidth: 0 }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                      <div className="cg-thumb">
                        {item.img ? (
                          <img src={item.img} alt="" loading="lazy" />
                        ) : (
                          <span>{(item.brand || 'CG').slice(0, 3).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="cg-item-meta">
                        <span className="cg-item-name">{item.name}</span>
                        <span className="cg-item-sub">
                          <span>{item.brand}</span>
                          <span>·</span>
                          <span>{mode === 'builderParts' ? renderCompatSummary(item) : CAT_BY_ID[item.cat]?.label || item.cat}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cg-mobile-card__fields">
                    <div className="cg-field">
                      <label>Quick price (INR)</label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          type="number"
                          className="cg-input"
                          value={draftPrice !== undefined ? draftPrice : String(item.price)}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                        />
                        {draftPrice !== undefined && Number(draftPrice) !== item.price && (
                          <button
                            type="button"
                            className="cg-btn cg-btn--sm cg-btn--primary"
                            onClick={() => void handleQuickPriceSave(item)}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="cg-field">
                      <label>Status</label>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="cg-btn cg-btn--sm"
                          onClick={() => void handleQuickToggle(item, 'stock', !item.stock)}
                        >
                          {item.stock ? 'In stock' : 'Out'}
                        </button>
                        <button
                          type="button"
                          className="cg-btn cg-btn--sm"
                          onClick={() => void handleQuickToggle(item, 'visible', item.visible === false)}
                        >
                          {item.visible !== false ? 'Visible' : 'Hidden'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="cg-row-actions">
                    <button type="button" className="cg-btn cg-btn--sm" onClick={() => onOpenEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="cg-btn cg-btn--sm" onClick={() => onDuplicate(item)}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="cg-btn cg-btn--sm cg-btn--danger"
                      onClick={() => handleSingleDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="cg-pagination">
          <span className="cg-field-hint">
            Page {safePage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="cg-btn cg-btn--sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="cg-btn cg-btn--sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CsvModal
        open={csvOpen}
        mode={mode}
        existingItems={items}
        onClose={() => setCsvOpen(false)}
        onImported={async (res) => {
          await onRefresh();
          onToast(`CSV import complete: ${res.created} created, ${res.updated} updated.`);
        }}
      />
    </div>
  );
}
