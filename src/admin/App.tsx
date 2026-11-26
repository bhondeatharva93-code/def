import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminSession,
  fetchAllCollectionDocs,
  signOutAdmin,
  subscribeAdminAuth,
} from '../data/adminApi';
import {
  CatalogItem,
  extractExistingCompatOptions,
  slugifyId,
} from '../data/catalogHelpers';
import { ConfirmDialog, ConfirmState, ToastItem, ToastStack } from './components/ConfirmAndToast';
import { CatalogItemDrawer } from './components/CatalogItemDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CatalogManagerView } from './views/CatalogManagerView';
import { DashboardView } from './views/DashboardView';
import { LoginView } from './views/LoginView';
import { SettingsView } from './views/SettingsView';

type AdminTab = 'dashboard' | 'products' | 'builderParts' | 'settings';

function isLoginPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/admin/login';
}

function formatReadableError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw) as { error?: string; path?: string | null };
    if (parsed && parsed.error) {
      return parsed.path ? `${parsed.error} (${parsed.path})` : parsed.error;
    }
  } catch {
    // Plain error string
  }
  return raw || fallback;
}

export function AdminApp() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [authReady, setAuthReady] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [builderParts, setBuilderParts] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    mode: 'products' | 'builderParts';
    item: CatalogItem | null;
    isNew: boolean;
  }>({ open: false, mode: 'products', item: null, isNew: true });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const addToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const navigateRoute = useCallback((target: string) => {
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
      setPathname(target);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const unsub = subscribeAdminAuth(
      (nextSession, errMsg) => {
        setSession(nextSession);
        setAuthError(nextSession ? '' : errMsg || '');
        setAuthReady(true);
      },
      (checking) => {
        setAuthChecking(checking);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady || authChecking) return;
    if (!session && !isLoginPath(pathname)) {
      navigateRoute('/admin/login');
    } else if (session && isLoginPath(pathname)) {
      navigateRoute('/admin');
    }
  }, [authReady, authChecking, session, pathname, navigateRoute]);

  const loadCatalog = useCallback(async () => {
    if (!session) return;
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const [prods, parts] = await Promise.all([
        fetchAllCollectionDocs('products'),
        fetchAllCollectionDocs('builderParts'),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setBuilderParts(Array.isArray(parts) ? parts : []);
    } catch (err) {
      const message = formatReadableError(err, 'Failed to load catalog from Firestore.');
      setCatalogError(message);
      addToast(message, 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [session, addToast]);

  useEffect(() => {
    if (session) {
      void loadCatalog();
    } else {
      setProducts([]);
      setBuilderParts([]);
      setCatalogError('');
    }
  }, [session, loadCatalog]);

  const compatPools = useMemo(() => extractExistingCompatOptions(builderParts), [builderParts]);

  const handleAskConfirm = useCallback(
    (st: ConfirmState) => {
      setConfirmState({
        ...st,
        onConfirm: async () => {
          setConfirmBusy(true);
          try {
            await st.onConfirm();
            setConfirmState(null);
          } catch (err) {
            addToast(formatReadableError(err, 'Action failed.'), 'error');
          } finally {
            setConfirmBusy(false);
          }
        },
      });
    },
    [addToast]
  );

  const handleCloseDrawer = (isDirty: boolean) => {
    if (!isDirty) {
      setDrawerState((s) => ({ ...s, open: false }));
      return;
    }
    setConfirmState({
      title: 'Discard unsaved changes?',
      message: 'You have edited fields that have not been saved yet.',
      confirmLabel: 'Discard changes',
      danger: true,
      onConfirm: () => {
        setDrawerState((s) => ({ ...s, open: false }));
        setConfirmState(null);
      },
    });
  };

  if (!authReady || authChecking) {
    return (
      <div className="cg-boot-screen" role="status" aria-live="polite">
        <div className="cg-boot-spinner" aria-hidden="true" />
        <p>{authChecking ? 'Checking admin permissions...' : 'Checking admin session...'}</p>
      </div>
    );
  }

  if (!session || isLoginPath(pathname)) {
    return (
      <ErrorBoundary>
        <LoginView externalError={authError} />
      </ErrorBoundary>
    );
  }

  const pageTitle: Record<AdminTab, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    builderParts: 'Builder parts',
    settings: 'Settings',
  };

  const openNewItem = (mode: 'products' | 'builderParts', defaultCat?: string) => {
    setDrawerState({
      open: true,
      mode,
      isNew: true,
      item: {
        id: '',
        cat: defaultCat || (mode === 'builderParts' ? 'cpu' : 'prebuilt'),
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
      },
    });
  };

  const openEditItem = (mode: 'products' | 'builderParts', item: CatalogItem) => {
    setDrawerState({ open: true, mode, isNew: false, item });
  };

  const openDuplicateItem = (mode: 'products' | 'builderParts', item: CatalogItem) => {
    setDrawerState({
      open: true,
      mode,
      isNew: true,
      item: {
        ...item,
        id: slugifyId(`${item.name}-copy`, item.cat),
        name: `${item.name} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined,
      },
    });
  };

  return (
    <ErrorBoundary>
      <div className="cg-shell">
        {mobileMenuOpen && (
          <div className="cg-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
        )}

        <aside className={`cg-sidebar${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Admin navigation">
          <div className="cg-sidebar__head">
            <div className="cg-sidebar__title">
              <div className="cg-brand-mark" aria-hidden="true">CG</div>
              <div>
                <strong>Computer Galaxy</strong>
                <span>Admin Panel</span>
              </div>
            </div>
            <button
              type="button"
              className="cg-sidebar__close"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="cg-nav">
            <button
              type="button"
              className={`cg-nav__btn${tab === 'dashboard' ? ' is-active' : ''}`}
              onClick={() => {
                setTab('dashboard');
                setMobileMenuOpen(false);
              }}
            >
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`cg-nav__btn${tab === 'products' ? ' is-active' : ''}`}
              onClick={() => {
                setTab('products');
                setMobileMenuOpen(false);
              }}
            >
              <span>Products</span>
              <span className="cg-nav__count">{products.length}</span>
            </button>

            <button
              type="button"
              className={`cg-nav__btn${tab === 'builderParts' ? ' is-active' : ''}`}
              onClick={() => {
                setTab('builderParts');
                setMobileMenuOpen(false);
              }}
            >
              <span>Builder parts</span>
              <span className="cg-nav__count">{builderParts.length}</span>
            </button>

            <button
              type="button"
              className={`cg-nav__btn${tab === 'settings' ? ' is-active' : ''}`}
              onClick={() => {
                setTab('settings');
                setMobileMenuOpen(false);
              }}
            >
              <span>Settings</span>
            </button>
          </nav>

          <div className="cg-sidebar__foot">
            <div className="cg-user-chip">
              <span className="cg-user-chip__role">{session.admin.role}</span>
              <span className="cg-user-chip__email">{session.admin.email}</span>
            </div>
            <div className="cg-sidebar__actions">
              <a className="cg-sidebar__link" href="/" target="_blank" rel="noopener noreferrer">
                View site
              </a>
              <button
                type="button"
                className="cg-sidebar__signout"
                onClick={() => void signOutAdmin()}
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="cg-main">
          <header className="cg-topbar">
            <div className="cg-topbar__left">
              <button
                type="button"
                className="cg-menu-btn"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                ☰
              </button>
              <h1>{pageTitle[tab]}</h1>
            </div>
            <div className="cg-topbar__actions">
              <button
                type="button"
                className="cg-btn cg-btn--sm"
                disabled={loadingCatalog}
                onClick={() => void loadCatalog()}
              >
                {loadingCatalog ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                className="cg-btn cg-btn--sm cg-btn--primary"
                onClick={() => openNewItem(tab === 'builderParts' ? 'builderParts' : 'products')}
              >
                + Add {tab === 'builderParts' ? 'part' : 'product'}
              </button>
            </div>
          </header>

          <main className="cg-content">
            {tab === 'dashboard' && (
              <DashboardView
                products={products}
                builderParts={builderParts}
                loading={loadingCatalog}
                error={catalogError}
                onRetry={() => void loadCatalog()}
                onAddProduct={() => openNewItem('products')}
                onNavigateTab={(next) => setTab(next)}
              />
            )}

            {tab === 'products' && (
              <CatalogManagerView
                mode="products"
                items={products}
                loading={loadingCatalog}
                error={catalogError}
                onRefresh={loadCatalog}
                onOpenNew={(cat) => openNewItem('products', cat)}
                onOpenEdit={(item) => openEditItem('products', item)}
                onDuplicate={(item) => openDuplicateItem('products', item)}
                onAskConfirm={handleAskConfirm}
                onToast={addToast}
              />
            )}

            {tab === 'builderParts' && (
              <CatalogManagerView
                mode="builderParts"
                items={builderParts}
                loading={loadingCatalog}
                error={catalogError}
                onRefresh={loadCatalog}
                onOpenNew={(cat) => openNewItem('builderParts', cat)}
                onOpenEdit={(item) => openEditItem('builderParts', item)}
                onDuplicate={(item) => openDuplicateItem('builderParts', item)}
                onAskConfirm={handleAskConfirm}
                onToast={addToast}
              />
            )}

            {tab === 'settings' && (
              <SettingsView
                currentAdmin={session.admin}
                existingProductCount={products.length}
                existingPartCount={builderParts.length}
                onRefreshCatalog={loadCatalog}
                onAskConfirm={handleAskConfirm}
                onToast={addToast}
              />
            )}
          </main>
        </div>

        <CatalogItemDrawer
          open={drawerState.open}
          mode={drawerState.mode}
          initialItem={drawerState.item}
          isNew={drawerState.isNew}
          compatPools={compatPools}
          onCloseRequest={handleCloseDrawer}
          onSaved={async (saved, wasNew) => {
            setDrawerState((s) => ({ ...s, open: false }));
            await loadCatalog();
            addToast(`${wasNew ? 'Created' : 'Saved'} "${saved.name}".`);
          }}
        />

        <ConfirmDialog
          state={confirmState}
          busy={confirmBusy}
          onClose={() => {
            if (!confirmBusy) setConfirmState(null);
          }}
        />

        <ToastStack
          toasts={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      </div>
    </ErrorBoundary>
  );
}
