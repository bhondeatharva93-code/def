import React, { useEffect, useState } from 'react';
import {
  AdminUserRecord,
  addAdminEditor,
  exportFullBackupJson,
  fetchAdmins,
  importSeedDataToFirestore,
  removeAdminEditor,
} from '../../data/adminApi';
import { OWNER_EMAILS } from '../../config/firebase';
import { ConfirmState } from '../components/ConfirmAndToast';

interface SettingsViewProps {
  currentAdmin: AdminUserRecord;
  existingProductCount: number;
  existingPartCount: number;
  onRefreshCatalog: () => Promise<void>;
  onAskConfirm: (state: ConfirmState) => void;
  onToast: (message: string, tone?: 'success' | 'error') => void;
}

export function SettingsView({
  currentAdmin,
  existingProductCount,
  existingPartCount,
  onRefreshCatalog,
  onAskConfirm,
  onToast,
}: SettingsViewProps) {
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [importingSeed, setImportingSeed] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  const isOwner = currentAdmin.role === 'owner';

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const list = await fetchAdmins();
      setAdmins(list);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not load admins.', 'error');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  const runSeedImport = async (overwrite: boolean) => {
    setImportingSeed(true);
    try {
      const res = await importSeedDataToFirestore(overwrite);
      await onRefreshCatalog();
      onToast(`Imported ${res.productsWritten} products and ${res.partsWritten} builder parts.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Seed import failed.', 'error');
    } finally {
      setImportingSeed(false);
    }
  };

  const handleSeedClick = () => {
    const hasExisting = existingProductCount > 0 || existingPartCount > 0;
    if (hasExisting) {
      onAskConfirm({
        title: 'Overwrite existing items by ID?',
        message: `Firestore already has ${existingProductCount} products and ${existingPartCount} builder parts. Continuing will reset any matching starter IDs back to the bundled data while keeping custom items intact.`,
        confirmLabel: 'Overwrite matching IDs',
        danger: true,
        onConfirm: () => runSeedImport(true),
      });
    } else {
      onAskConfirm({
        title: 'Import current website catalog?',
        message: 'This copies all 41 storefront products and 52 custom PC builder parts into Firestore so you can manage them from this panel.',
        confirmLabel: 'Import current data',
        onConfirm: () => runSeedImport(true),
      });
    }
  };

  const handleExportBackup = async () => {
    setExportingJson(true);
    try {
      const data = await exportFullBackupJson(true);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `computer-galaxy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('Downloaded full JSON backup.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Export failed.', 'error');
    } finally {
      setExportingJson(false);
    }
  };

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAdmin(true);
    try {
      await addAdminEditor(newEmail, newName, currentAdmin.email);
      setNewEmail('');
      setNewName('');
      await loadAdmins();
      onToast('Added editor account.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not add editor.', 'error');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = (record: AdminUserRecord) => {
    onAskConfirm({
      title: `Remove admin access for ${record.email}?`,
      message: 'This Google account will immediately lose permission to open or edit the admin panel.',
      confirmLabel: 'Remove access',
      danger: true,
      onConfirm: async () => {
        await removeAdminEditor(record.email);
        await loadAdmins();
        onToast(`Removed ${record.email}.`);
      },
    });
  };

  return (
    <div className="cg-settings-grid">
      <section className="cg-panel" style={{ display: 'grid', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem' }}>Import &amp; Backup</h2>
        <p className="cg-field-hint">
          Copy the store's initial bundled catalog into Firestore once, or download a complete JSON backup of your database.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isOwner && (
            <button
              type="button"
              className="cg-btn cg-btn--primary"
              disabled={importingSeed}
              onClick={handleSeedClick}
            >
              {importingSeed ? 'Importing...' : 'Import current data'}
            </button>
          )}
          <button
            type="button"
            className="cg-btn"
            disabled={exportingJson}
            onClick={() => void handleExportBackup()}
          >
            {exportingJson ? 'Preparing backup...' : 'Export backup'}
          </button>
        </div>
        {!isOwner && (
          <span className="cg-field-hint">Only the store owner ({OWNER_EMAILS.join(', ')}) can run initial catalog imports.</span>
        )}
      </section>

      <section className="cg-panel" style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem' }}>Admins</h2>
          <p className="cg-field-hint">
            Google accounts permitted to sign in to the Computer Galaxy admin panel.
          </p>
        </div>

        {loadingAdmins ? (
          <p className="cg-field-hint">Loading admins...</p>
        ) : (
          <div>
            {admins.map((a) => (
              <div key={a.email} className="cg-admin-row">
                <div>
                  <strong>{a.email}</strong>
                  <div className="cg-item-sub">
                    <span className={`cg-badge ${a.role === 'owner' ? 'cg-badge--gold' : 'cg-badge--muted'}`}>
                      {a.role}
                    </span>
                    {a.displayName && <span>{a.displayName}</span>}
                  </div>
                </div>
                {isOwner && !OWNER_EMAILS.includes(a.email) && (
                  <button
                    type="button"
                    className="cg-btn cg-btn--sm cg-btn--danger"
                    onClick={() => handleRemoveAdmin(a)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <form onSubmit={(e) => void handleAddEditor(e)} className="cg-form-grid" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <div className="cg-field">
              <label htmlFor="cg-add-email">Add editor Google email</label>
              <input
                id="cg-add-email"
                type="email"
                required
                className="cg-input"
                placeholder="staff@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="cg-field">
              <label htmlFor="cg-add-name">Name (optional)</label>
              <input
                id="cg-add-name"
                type="text"
                className="cg-input"
                placeholder="Store staff name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="cg-field cg-field--full">
              <div>
                <button type="submit" className="cg-btn cg-btn--primary" disabled={addingAdmin}>
                  {addingAdmin ? 'Adding...' : 'Add editor'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
