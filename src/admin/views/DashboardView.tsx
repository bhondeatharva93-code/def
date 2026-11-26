import React from 'react';
import { CatalogItem } from '../../data/catalogHelpers';

interface DashboardViewProps {
  products: CatalogItem[];
  builderParts: CatalogItem[];
  loading: boolean;
  onAddProduct: () => void;
  onNavigateTab: (tab: 'products' | 'builderParts' | 'settings') => void;
}

export function DashboardView({
  products,
  builderParts,
  loading,
  onAddProduct,
  onNavigateTab,
}: DashboardViewProps) {
  const allItems = [...products, ...builderParts];
  const inStockCount = allItems.filter((i) => i.stock).length;
  const outStockCount = allItems.filter((i) => !i.stock).length;
  const hiddenCount = allItems.filter((i) => i.visible === false).length;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <section className="cg-stats-grid" aria-label="Catalog summary">
        <div className="cg-stat-card">
          <span className="cg-stat-card__label">Total products</span>
          <strong className="cg-stat-card__value">{loading ? '...' : products.length}</strong>
          <span className="cg-stat-card__hint">Storefront PCs, laptops, displays &amp; gear</span>
        </div>

        <div className="cg-stat-card">
          <span className="cg-stat-card__label">In stock</span>
          <strong className="cg-stat-card__value" style={{ color: 'var(--ok)' }}>
            {loading ? '...' : inStockCount}
          </strong>
          <span className="cg-stat-card__hint">Across products &amp; builder parts</span>
        </div>

        <div className="cg-stat-card">
          <span className="cg-stat-card__label">Out of stock</span>
          <strong className="cg-stat-card__value" style={{ color: outStockCount ? 'var(--bad)' : 'inherit' }}>
            {loading ? '...' : outStockCount}
          </strong>
          <span className="cg-stat-card__hint">Marked as Sold out on store</span>
        </div>

        <div className="cg-stat-card">
          <span className="cg-stat-card__label">Hidden</span>
          <strong className="cg-stat-card__value" style={{ color: hiddenCount ? 'var(--warn)' : 'inherit' }}>
            {loading ? '...' : hiddenCount}
          </strong>
          <span className="cg-stat-card__hint">Not shown on public pages</span>
        </div>

        <div className="cg-stat-card">
          <span className="cg-stat-card__label">Total builder parts</span>
          <strong className="cg-stat-card__value">{loading ? '...' : builderParts.length}</strong>
          <span className="cg-stat-card__hint">CPUs, boards, RAM, GPUs, SSDs, PSUs &amp; cases</span>
        </div>
      </section>

      <section className="cg-quick-grid" aria-label="Quick actions">
        <div className="cg-panel" style={{ display: 'grid', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Catalog shortcuts</h2>
          <p className="cg-field-hint">
            Add new items, update prices and stock directly, or open the live storefront to review changes.
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button type="button" className="cg-btn cg-btn--primary" onClick={onAddProduct}>
              Add product
            </button>
            <a className="cg-btn" href="/" target="_blank" rel="noopener noreferrer">
              View website
            </a>
          </div>
        </div>

        <div className="cg-panel" style={{ display: 'grid', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Catalog sections</h2>
          <p className="cg-field-hint">
            Jump straight to managing storefront items, custom PC builder slots, or initial store data import.
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button type="button" className="cg-btn" onClick={() => onNavigateTab('products')}>
              Manage products
            </button>
            <button type="button" className="cg-btn" onClick={() => onNavigateTab('builderParts')}>
              Manage builder parts
            </button>
            <button type="button" className="cg-btn" onClick={() => onNavigateTab('settings')}>
              Settings &amp; backup
            </button>
          </div>
        </div>
      </section>

      {!loading && products.length === 0 && builderParts.length === 0 && (
        <div className="cg-empty">
          <h3>Your Firestore catalog is currently empty</h3>
          <p>
            Public pages are displaying the bundled starter catalog until you import or add items here. Open Settings to run "Import current data" and copy all existing products and builder parts into Firestore.
          </p>
          <button type="button" className="cg-btn cg-btn--primary" onClick={() => onNavigateTab('settings')}>
            Go to Settings &amp; Import
          </button>
        </div>
      )}
    </div>
  );
}
