import React, { useState } from 'react';
import { CsvPreviewResult, previewCsvImport } from '../../data/csvHelpers';
import { CatalogItem, formatInr } from '../../data/catalogHelpers';
import { importCatalogBatch } from '../../data/adminApi';

interface CsvModalProps {
  open: boolean;
  mode: 'products' | 'builderParts';
  existingItems: CatalogItem[];
  onClose: () => void;
  onImported: (summary: { created: number; updated: number }) => Promise<void>;
}

export function CsvModal({ open, mode, existingItems, onClose, onImported }: CsvModalProps) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!open) return null;

  const existingIds = new Set(existingItems.map((i) => i.id));
  const existingMap = new Map(existingItems.map((i) => [i.id, i]));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setSubmitError('');
    setFileName(file.name);
    const text = await file.text();
    const result = previewCsvImport(text, mode, existingIds);
    setPreview(result);
  };

  const handleImport = async () => {
    if (!preview || !preview.validRows.length || preview.errors.length) return;
    setBusy(true);
    setSubmitError('');
    try {
      const result = await importCatalogBatch(
        mode,
        preview.validRows.map((r) => r.item),
        existingMap
      );
      await onImported(result);
      setPreview(null);
      setFileName('');
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to import CSV rows.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cg-csv-title">
      <div className="cg-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="cg-csv-title">
            Import {mode === 'products' ? 'Products' : 'Builder Parts'} CSV
          </h2>
          <button type="button" className="cg-btn cg-btn--sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <p className="cg-field-hint">
          Leave <code>id</code> blank to create a new entry, or keep an existing <code>id</code> to update it. Use Export CSV first to get the exact column template.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          className="cg-input"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
          }}
        />

        {fileName && preview && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="cg-checks-row">
              <span className="cg-badge cg-badge--ok">Create: {preview.createCount}</span>
              <span className="cg-badge cg-badge--gold">Update: {preview.updateCount}</span>
              <span className={`cg-badge ${preview.errors.length ? 'cg-badge--bad' : 'cg-badge--muted'}`}>
                Errors: {preview.errors.length}
              </span>
            </div>

            {preview.errors.length > 0 && (
              <div className="cg-alert-error cg-alert-error--light">
                <strong>Fix these row errors before importing (nothing was written):</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', listStyle: 'disc' }}>
                  {preview.errors.slice(0, 12).map((err) => (
                    <li key={`${err.rowNumber}-${err.id}`}>
                      Row {err.rowNumber} ({err.name}): {err.messages.join(' ')}
                    </li>
                  ))}
                  {preview.errors.length > 12 && (
                    <li>...and {preview.errors.length - 12} more rows with errors.</li>
                  )}
                </ul>
              </div>
            )}

            {preview.validRows.length > 0 && preview.errors.length === 0 && (
              <div className="cg-table-wrap" style={{ maxHeight: '16rem' }}>
                <table className="cg-table" style={{ minWidth: '34rem' }}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Action</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.validRows.slice(0, 25).map((r) => (
                      <tr key={r.rowNumber}>
                        <td>{r.rowNumber}</td>
                        <td>
                          <span className={`cg-badge ${r.action === 'create' ? 'cg-badge--ok' : 'cg-badge--gold'}`}>
                            {r.action}
                          </span>
                        </td>
                        <td><code>{r.item.id}</code></td>
                        <td>{r.item.name}</td>
                        <td>{r.item.cat}</td>
                        <td className="tabular">{formatInr(r.item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {submitError && <div className="cg-alert-error cg-alert-error--light">{submitError}</div>}

        <div className="cg-modal__actions">
          <button type="button" className="cg-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="cg-btn cg-btn--primary"
            disabled={busy || !preview || preview.errors.length > 0 || preview.validRows.length === 0}
            onClick={() => void handleImport()}
          >
            {busy ? 'Importing...' : `Import ${preview ? preview.validRows.length : 0} items`}
          </button>
        </div>
      </div>
    </div>
  );
}
