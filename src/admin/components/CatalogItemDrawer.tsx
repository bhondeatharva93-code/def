import React, { useEffect, useMemo, useState } from 'react';
import {
  AVAILABLE_TAGS,
  BUILDER_SLOTS,
  CATEGORIES,
  CAT_BY_ID,
  CatalogItem,
  CompatOptionPools,
  USES,
  calcDiscountPct,
  calcEmi,
  formatInr,
  isBuilderSlotCategory,
  normalizeCatalogItem,
  slugifyId,
  validateCatalogItem,
} from '../../data/catalogHelpers';
import { saveCatalogDoc } from '../../data/adminApi';
import { ImageField } from './ImageField';

interface CatalogItemDrawerProps {
  open: boolean;
  mode: 'products' | 'builderParts';
  initialItem: CatalogItem | null;
  isNew: boolean;
  compatPools: CompatOptionPools;
  onCloseRequest: (isDirty: boolean, forceClose: () => void) => void;
  onSaved: (saved: CatalogItem, wasNew: boolean) => Promise<void>;
}

function CompatSelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  error?: string;
  onChange: (next: string) => void;
}) {
  const isKnown = !value || options.includes(value);
  const [customMode, setCustomMode] = useState(!isKnown);

  useEffect(() => {
    if (value && !options.includes(value)) {
      setCustomMode(true);
    }
  }, [value, options]);

  const showNewWarning = Boolean(value.trim() && !options.includes(value.trim()));

  return (
    <div className="cg-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="cg-select"
        value={customMode ? '__custom__' : value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__custom__') {
            setCustomMode(true);
            if (options.includes(value)) onChange('');
          } else {
            setCustomMode(false);
            onChange(val);
          }
        }}
      >
        <option value="">Select {label.toLowerCase()}...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__custom__">+ Type custom value...</option>
      </select>

      {customMode && (
        <input
          type="text"
          className="cg-input"
          placeholder={`Enter custom ${label.toLowerCase()}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {showNewWarning && (
        <div className="cg-alert-warn">
          <strong>New compatibility value:</strong> "{value.trim()}" is not used by other parts yet. Make sure matching parts use the exact same spelling so the PC builder pairs them properly.
        </div>
      )}

      {error && <span className="cg-field-err">{error}</span>}
    </div>
  );
}

function CompatMultiField({
  label,
  selected,
  options,
  error,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState('');
  const unknownSelected = selected.filter((v) => !options.includes(v));

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const addCustom = () => {
    const tokens = customInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tokens.length) return;
    onChange(Array.from(new Set([...selected, ...tokens])));
    setCustomInput('');
  };

  return (
    <div className="cg-field cg-field--full">
      <label>{label}</label>
      <div className="cg-checks-row">
        {Array.from(new Set([...options, ...selected])).map((opt) => (
          <label key={opt} className="cg-check">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggleOption(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <input
          type="text"
          className="cg-input"
          placeholder="Add custom value (e.g. TR5 or E-ATX)"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="cg-btn cg-btn--sm" onClick={addCustom}>
          Add
        </button>
      </div>
      {unknownSelected.length > 0 && (
        <div className="cg-alert-warn">
          <strong>New compatibility value(s):</strong> {unknownSelected.join(', ')} will only pair with parts using the exact same label.
        </div>
      )}
      {error && <span className="cg-field-err">{error}</span>}
    </div>
  );
}

export function CatalogItemDrawer({
  open,
  mode,
  initialItem,
  isNew,
  compatPools,
  onCloseRequest,
  onSaved,
}: CatalogItemDrawerProps) {
  const [draft, setDraft] = useState<CatalogItem>(() =>
    normalizeCatalogItem(initialItem || { cat: mode === 'builderParts' ? 'cpu' : 'prebuilt', stock: true, visible: true })
  );
  const [specsText, setSpecsText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = normalizeCatalogItem(
      initialItem || {
        id: '',
        cat: mode === 'builderParts' ? 'cpu' : 'prebuilt',
        brand: '',
        name: '',
        price: 0,
        mrp: 0,
        stock: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        specs: [],
        tags: [],
      }
    );
    setDraft(base);
    setSpecsText((base.specs || []).join('\n'));
    setErrors({});
    setSubmitError('');
    setIsDirty(false);
  }, [open, initialItem, mode]);

  useEffect(() => {
    if (!open || !isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [open, isDirty]);

  const previewItem = useMemo(() => {
    const specs = specsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return normalizeCatalogItem({
      ...draft,
      specs,
      id: draft.id.trim() || 'preview-id',
    });
  }, [draft, specsText]);

  if (!open) return null;

  const updateDraft = (patch: Partial<CatalogItem>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const updateParts = (slot: keyof NonNullable<CatalogItem['parts']>, value: string) => {
    setDraft((prev) => ({
      ...prev,
      parts: {
        ...(prev.parts || {}),
        [slot]: value,
      },
    }));
    setIsDirty(true);
  };

  const toggleTag = (tag: string) => {
    const cur = draft.tags || [];
    const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
    updateDraft({ tags: next });
  };

  const showCompat = mode === 'builderParts' || isBuilderSlotCategory(draft.cat);
  const discountPct = calcDiscountPct(previewItem.price, previewItem.mrp);
  const monthlyEmi = calcEmi(previewItem.price, 12, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const specs = specsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const resolvedId = draft.id.trim() || slugifyId(draft.name || draft.cat, draft.cat || 'item');
    const candidate = normalizeCatalogItem({
      ...draft,
      id: resolvedId,
      specs,
      mrp: draft.mrp > 0 ? draft.mrp : draft.price,
    });

    const validation = validateCatalogItem(candidate, mode);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await saveCatalogDoc(
        mode,
        candidate,
        isNew ? undefined : initialItem?.createdAt
      );
      setIsDirty(false);
      await onSaved(candidate, isNew);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  const categoryChoices =
    mode === 'builderParts'
      ? BUILDER_SLOTS.map((s) => ({ id: s.id, label: CAT_BY_ID[s.id]?.label || s.label }))
      : CATEGORIES.map((c) => ({ id: c.id, label: c.label }));

  return (
    <div
      className="cg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cg-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onCloseRequest(isDirty, () => {});
        }
      }}
    >
      <form className="cg-drawer" onSubmit={(e) => void handleSubmit(e)}>
        <div className="cg-drawer__head">
          <div>
            <h2 id="cg-drawer-title">
              {isNew ? 'Add' : 'Edit'} {mode === 'builderParts' ? 'Builder Part' : 'Product'}
            </h2>
            {isDirty && <span className="cg-badge cg-badge--warn">Unsaved changes</span>}
          </div>
          <button
            type="button"
            className="cg-btn cg-btn--sm"
            disabled={saving}
            onClick={() => onCloseRequest(isDirty, () => {})}
          >
            Close
          </button>
        </div>

        <div className="cg-drawer__body">
          <div className="cg-form-grid">
            <div className="cg-field cg-field--full">
              <label htmlFor="cg-f-name">Product / Part Name *</label>
              <input
                id="cg-f-name"
                type="text"
                className="cg-input"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                placeholder="e.g. Ryzen 5 7600 + RTX 4060 Gaming PC"
              />
              {errors.name && <span className="cg-field-err">{errors.name}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-cat">Category *</label>
              <select
                id="cg-f-cat"
                className="cg-select"
                value={draft.cat}
                onChange={(e) => updateDraft({ cat: e.target.value })}
              >
                {categoryChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.id})
                  </option>
                ))}
              </select>
              {errors.cat && <span className="cg-field-err">{errors.cat}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-brand">Brand *</label>
              <input
                id="cg-f-brand"
                type="text"
                className="cg-input"
                value={draft.brand}
                onChange={(e) => updateDraft({ brand: e.target.value })}
                placeholder="e.g. AMD, Intel, ASUS, Custom"
              />
              {errors.brand && <span className="cg-field-err">{errors.brand}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-id">Document ID</label>
              <input
                id="cg-f-id"
                type="text"
                className="cg-input"
                value={draft.id}
                readOnly={!isNew}
                placeholder="Auto-generated if left blank"
                onChange={(e) => updateDraft({ id: e.target.value })}
              />
              {!isNew && <span className="cg-field-hint">Existing product IDs are locked so store URLs stay valid.</span>}
              {errors.id && <span className="cg-field-err">{errors.id}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-subcat">Subcategory</label>
              <input
                id="cg-f-subcat"
                type="text"
                className="cg-input"
                value={draft.subcategory || ''}
                onChange={(e) => updateDraft({ subcategory: e.target.value })}
                placeholder="Optional sub-label (e.g. 27-inch IPS)"
              />
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-price">Selling Price (INR) *</label>
              <input
                id="cg-f-price"
                type="number"
                min={0}
                max={10000000}
                className="cg-input tabular"
                value={draft.price}
                onChange={(e) => updateDraft({ price: Number(e.target.value) || 0 })}
              />
              {errors.price && <span className="cg-field-err">{errors.price}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-mrp">Old Price / MRP (INR)</label>
              <input
                id="cg-f-mrp"
                type="number"
                min={0}
                max={10000000}
                className="cg-input tabular"
                value={draft.mrp}
                onChange={(e) => updateDraft({ mrp: Number(e.target.value) || 0 })}
              />
              {errors.mrp && <span className="cg-field-err">{errors.mrp}</span>}
            </div>

            <div className="cg-field">
              <label htmlFor="cg-f-sort">Display Order</label>
              <input
                id="cg-f-sort"
                type="number"
                className="cg-input tabular"
                value={draft.sortOrder ?? 0}
                onChange={(e) => updateDraft({ sortOrder: Number(e.target.value) || 0 })}
              />
            </div>

            {draft.cat === 'prebuilt' && (
              <div className="cg-field">
                <label htmlFor="cg-f-use">Primary Use Case (Prebuilt PC)</label>
                <select
                  id="cg-f-use"
                  className="cg-select"
                  value={draft.use || ''}
                  onChange={(e) => updateDraft({ use: e.target.value || undefined })}
                >
                  <option value="">Not specified</option>
                  {USES.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="cg-field cg-field--full">
              <label>Availability & Badges</label>
              <div className="cg-checks-row">
                <label className="cg-check">
                  <input
                    type="checkbox"
                    checked={draft.stock}
                    onChange={(e) => updateDraft({ stock: e.target.checked })}
                  />
                  <span>In Stock</span>
                </label>
                <label className="cg-check">
                  <input
                    type="checkbox"
                    checked={draft.visible}
                    onChange={(e) => updateDraft({ visible: e.target.checked })}
                  />
                  <span>Visible on public website</span>
                </label>
                <label className="cg-check">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.featured)}
                    onChange={(e) => updateDraft({ featured: e.target.checked })}
                  />
                  <span>Featured</span>
                </label>
              </div>
            </div>

            <div className="cg-field cg-field--full">
              <label>Tags</label>
              <div className="cg-checks-row">
                {AVAILABLE_TAGS.map((t) => (
                  <label key={t} className="cg-check">
                    <input
                      type="checkbox"
                      checked={(draft.tags || []).includes(t)}
                      onChange={() => toggleTag(t)}
                    />
                    <span style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {showCompat && (
              <div className="cg-field cg-field--full">
                <div className="cg-panel" style={{ padding: '1rem', background: '#fffcf5' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                    PC Builder Compatibility Fields ({CAT_BY_ID[draft.cat]?.label || draft.cat})
                  </h3>
                  <div className="cg-form-grid">
                    {draft.cat === 'cpu' && (
                      <>
                        <CompatSelectField
                          id="cg-c-socket"
                          label="Socket *"
                          value={draft.socket || ''}
                          options={compatPools.sockets}
                          error={errors.socket}
                          onChange={(val) => updateDraft({ socket: val })}
                        />
                        <div className="cg-field">
                          <label htmlFor="cg-c-tdp">TDP (Watts) *</label>
                          <input
                            id="cg-c-tdp"
                            type="number"
                            min={0}
                            max={2000}
                            className="cg-input tabular"
                            value={draft.tdp ?? ''}
                            onChange={(e) =>
                              updateDraft({ tdp: e.target.value === '' ? undefined : Number(e.target.value) })
                            }
                          />
                          {errors.tdp && <span className="cg-field-err">{errors.tdp}</span>}
                        </div>
                        <div className="cg-field cg-field--full">
                          <label className="cg-check">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.igpu)}
                              onChange={(e) => updateDraft({ igpu: e.target.checked })}
                            />
                            <span>Includes integrated graphics (no separate GPU required)</span>
                          </label>
                        </div>
                      </>
                    )}

                    {draft.cat === 'motherboard' && (
                      <>
                        <CompatSelectField
                          id="cg-m-socket"
                          label="Socket *"
                          value={draft.socket || ''}
                          options={compatPools.sockets}
                          error={errors.socket}
                          onChange={(val) => updateDraft({ socket: val })}
                        />
                        <CompatSelectField
                          id="cg-m-ram"
                          label="Memory Type *"
                          value={draft.ramType || ''}
                          options={compatPools.ramTypes}
                          error={errors.ramType}
                          onChange={(val) => updateDraft({ ramType: val })}
                        />
                        <CompatSelectField
                          id="cg-m-form"
                          label="Board Form Factor *"
                          value={draft.form || ''}
                          options={compatPools.forms}
                          error={errors.form}
                          onChange={(val) => updateDraft({ form: val })}
                        />
                      </>
                    )}

                    {draft.cat === 'ram' && (
                      <CompatSelectField
                        id="cg-r-type"
                        label="Memory Type *"
                        value={draft.type || ''}
                        options={compatPools.ramTypes}
                        error={errors.type}
                        onChange={(val) => updateDraft({ type: val })}
                      />
                    )}

                    {draft.cat === 'gpu' && (
                      <div className="cg-field">
                        <label htmlFor="cg-g-tdp">Power Draw / TDP (Watts) *</label>
                        <input
                          id="cg-g-tdp"
                          type="number"
                          min={0}
                          max={2000}
                          className="cg-input tabular"
                          value={draft.tdp ?? ''}
                          onChange={(e) =>
                            updateDraft({ tdp: e.target.value === '' ? undefined : Number(e.target.value) })
                          }
                        />
                        {errors.tdp && <span className="cg-field-err">{errors.tdp}</span>}
                      </div>
                    )}

                    {draft.cat === 'psu' && (
                      <div className="cg-field">
                        <label htmlFor="cg-p-watt">PSU Wattage (W) *</label>
                        <input
                          id="cg-p-watt"
                          type="number"
                          min={1}
                          max={5000}
                          className="cg-input tabular"
                          value={draft.watt ?? ''}
                          onChange={(e) =>
                            updateDraft({ watt: e.target.value === '' ? undefined : Number(e.target.value) })
                          }
                        />
                        {errors.watt && <span className="cg-field-err">{errors.watt}</span>}
                      </div>
                    )}

                    {draft.cat === 'cooler' && (
                      <CompatMultiField
                        label="Supported CPU Sockets *"
                        selected={draft.sockets || []}
                        options={compatPools.sockets}
                        error={errors.sockets}
                        onChange={(next) => updateDraft({ sockets: next })}
                      />
                    )}

                    {draft.cat === 'case' && (
                      <CompatMultiField
                        label="Supported Motherboard Sizes *"
                        selected={draft.supports || []}
                        options={compatPools.forms}
                        error={errors.supports}
                        onChange={(next) => updateDraft({ supports: next })}
                      />
                    )}

                    {draft.cat === 'ssd' && (
                      <p className="cg-field-hint cg-field--full">
                        SSD storage fits all motherboards. Add capacity and interface details in Key Specs below.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {draft.cat === 'prebuilt' && (
              <div className="cg-field cg-field--full">
                <div className="cg-panel" style={{ padding: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Prebuilt PC Included Components</h3>
                  <div className="cg-form-grid">
                    {(['cpu', 'gpu', 'ram', 'ssd', 'psu', 'case'] as const).map((slot) => (
                      <div key={slot} className="cg-field">
                        <label htmlFor={`cg-part-${slot}`}>{slot.toUpperCase()}</label>
                        <input
                          id={`cg-part-${slot}`}
                          type="text"
                          className="cg-input"
                          value={draft.parts?.[slot] || ''}
                          onChange={(e) => updateParts(slot, e.target.value)}
                          placeholder={`Installed ${slot.toUpperCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="cg-field cg-field--full">
              <label htmlFor="cg-f-specs">Key Specs (one per line)</label>
              <textarea
                id="cg-f-specs"
                className="cg-textarea"
                value={specsText}
                onChange={(e) => {
                  setSpecsText(e.target.value);
                  setIsDirty(true);
                }}
                placeholder={'Ryzen 5 5500 (6 cores)\nRadeon RX 6600 8 GB\n16 GB DDR4 3200 MHz'}
              />
            </div>

            <div className="cg-field cg-field--full">
              <label htmlFor="cg-f-desc">Description</label>
              <textarea
                id="cg-f-desc"
                className="cg-textarea"
                style={{ minHeight: '4.5rem' }}
                value={draft.description || ''}
                onChange={(e) => updateDraft({ description: e.target.value })}
                placeholder="Optional detailed summary shown on product detail page"
              />
              {errors.description && <span className="cg-field-err">{errors.description}</span>}
            </div>

            <ImageField
              img={draft.img || ''}
              images={draft.images || []}
              error={errors.img}
              onChange={(nextImg, nextImages) => updateDraft({ img: nextImg, images: nextImages })}
            />
          </div>

          <aside className="cg-preview-box" aria-label="Live product preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Live Card Preview</strong>
              <span className="cg-badge cg-badge--muted">{CAT_BY_ID[previewItem.cat]?.label || previewItem.cat}</span>
            </div>

            <div className="cg-preview-card-wrap">
              <article className="card">
                <div className="card__media">
                  <div className="card__art" style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', background: '#141418', overflow: 'hidden' }}>
                    {previewItem.img ? (
                      <img
                        src={previewItem.img}
                        alt={previewItem.name || 'Preview'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#e8b948', fontWeight: 700, fontSize: '0.85rem' }}>
                        {previewItem.brand || 'Computer Galaxy'}
                      </span>
                    )}
                  </div>
                  {!previewItem.stock ? (
                    <span className="card__badge card__badge--sold">Sold out</span>
                  ) : discountPct >= 5 ? (
                    <span className="card__badge card__badge--off">{discountPct}% off</span>
                  ) : null}
                </div>
                <div className="card__body">
                  <h3 className="card__name">{previewItem.name || 'Untitled Product'}</h3>
                  {previewItem.specs.length > 0 && (
                    <p className="card__spec">{previewItem.specs.slice(0, 2).join(' · ')}</p>
                  )}
                  <p className="price">
                    <strong className="tabular">{formatInr(previewItem.price)}</strong>
                    {previewItem.mrp > previewItem.price && (
                      <s className="tabular">{formatInr(previewItem.mrp)}</s>
                    )}
                  </p>
                  <p className="card__emi">Or {formatInr(monthlyEmi)}/mo for 12 mo</p>
                </div>
              </article>
            </div>

            <div className="cg-preview-metrics">
              <div className="cg-metric-mini">
                <span>Discount</span>
                <strong>{discountPct}%</strong>
              </div>
              <div className="cg-metric-mini">
                <span>Est. 12-mo EMI</span>
                <strong>{formatInr(monthlyEmi)}/mo</strong>
              </div>
            </div>

            {!previewItem.visible && (
              <div className="cg-alert-warn">
                Hidden from shoppers — this item is saved in Admin only until "Visible on public website" is checked.
              </div>
            )}

            {submitError && <div className="cg-alert-error cg-alert-error--light">{submitError}</div>}
          </aside>
        </div>

        <div className="cg-drawer__foot">
          <span className="cg-field-hint">Public storefront cache refreshes automatically within 2 minutes of saving.</span>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              type="button"
              className="cg-btn"
              disabled={saving}
              onClick={() => onCloseRequest(isDirty, () => {})}
            >
              Cancel
            </button>
            <button type="submit" className="cg-btn cg-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create Item' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
