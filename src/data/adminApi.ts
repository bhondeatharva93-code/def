import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  OWNER_EMAILS,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  testConnection,
} from '../config/firebase';
import { clearCatalogCache } from './api';
import {
  CatalogItem,
  normalizeCatalogItem,
  prepareFirestorePayload,
} from './catalogHelpers';
import { SEED_BUILDER_PARTS, SEED_STOREFRONT_PRODUCTS } from './seedCatalog';

export interface AdminUserRecord {
  email: string;
  role: 'owner' | 'editor';
  displayName?: string;
  addedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminSession {
  user: User;
  admin: AdminUserRecord;
}

export const UNAUTHORIZED_ADMIN_MESSAGE =
  'This Google account is not allowed to use the admin panel.';

export async function verifyOrBootstrapAdmin(user: User): Promise<AdminUserRecord | null> {
  const rawEmail = (user.email || '').trim().toLowerCase();
  if (!rawEmail || !user.emailVerified) {
    return null;
  }

  const adminPath = `admins/${rawEmail}`;
  const adminRef = doc(db, 'admins', rawEmail);

  try {
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<AdminUserRecord>;
      return {
        email: rawEmail,
        role: data.role === 'owner' ? 'owner' : 'editor',
        displayName: data.displayName || user.displayName || '',
        addedBy: data.addedBy || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }

    if (OWNER_EMAILS.includes(rawEmail)) {
      const record: AdminUserRecord = {
        email: rawEmail,
        role: 'owner',
        displayName: (user.displayName || 'Computer Galaxy Owner').slice(0, 120),
        addedBy: rawEmail,
      };
      try {
        await setDoc(adminRef, {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.CREATE, adminPath);
      }
      return record;
    }

    return null;
  } catch (err) {
    // Expected permission error if a non-admin signs in and tries reading admins/{theirEmail}
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return null;
    }
    handleFirestoreError(err, OperationType.GET, adminPath);
  }
}

export async function signInAdminWithGoogle(): Promise<AdminSession> {
  await testConnection();
  const cred = await signInWithPopup(auth, googleProvider);
  const admin = await verifyOrBootstrapAdmin(cred.user);
  if (!admin) {
    await signOut(auth);
    throw new Error(UNAUTHORIZED_ADMIN_MESSAGE);
  }
  return { user: cred.user, admin };
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export function subscribeAdminAuth(
  onSession: (session: AdminSession | null, authError?: string) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onSession(null);
      return;
    }
    try {
      const admin = await verifyOrBootstrapAdmin(user);
      if (!admin) {
        await signOut(auth);
        onSession(null, UNAUTHORIZED_ADMIN_MESSAGE);
        return;
      }
      onSession({ user, admin });
    } catch (err) {
      console.error('[admin-auth]', err);
      await signOut(auth).catch(() => {});
      onSession(null, UNAUTHORIZED_ADMIN_MESSAGE);
    }
  });
}

export async function fetchAllCollectionDocs(
  colName: 'products' | 'builderParts'
): Promise<CatalogItem[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs
      .map((d) => normalizeCatalogItem({ ...d.data(), id: d.id }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, colName);
  }
}

export async function saveCatalogDoc(
  colName: 'products' | 'builderParts',
  item: CatalogItem,
  existingCreatedAt?: unknown
): Promise<void> {
  const path = `${colName}/${item.id}`;
  const ref = doc(db, colName, item.id);
  const payload = prepareFirestorePayload(item, colName);

  try {
    let createdAtToKeep = existingCreatedAt;
    let isUpdate = Boolean(existingCreatedAt);

    if (!isUpdate) {
      const current = await getDoc(ref);
      if (current.exists()) {
        isUpdate = true;
        createdAtToKeep = current.data()?.createdAt;
      }
    }

    if (isUpdate) {
      await setDoc(ref, {
        ...payload,
        ...(createdAtToKeep ? { createdAt: createdAtToKeep } : {}),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    clearCatalogCache();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function quickUpdateCatalogField(
  colName: 'products' | 'builderParts',
  id: string,
  field: 'price' | 'stock' | 'visible',
  value: number | boolean
): Promise<void> {
  const path = `${colName}/${id}`;
  const ref = doc(db, colName, id);
  try {
    await updateDoc(ref, {
      [field]: value,
      updatedAt: serverTimestamp(),
    });
    clearCatalogCache();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function bulkUpdateCatalogField(
  colName: 'products' | 'builderParts',
  ids: string[],
  field: 'stock' | 'visible',
  value: boolean
): Promise<void> {
  if (!ids.length) return;
  try {
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = writeBatch(db);
      ids.slice(i, i + CHUNK).forEach((id) => {
        batch.update(doc(db, colName, id), {
          [field]: value,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
    clearCatalogCache();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, colName);
  }
}

export async function deleteCatalogDocs(
  colName: 'products' | 'builderParts',
  ids: string[]
): Promise<void> {
  if (!ids.length) return;
  try {
    if (ids.length === 1) {
      await deleteDoc(doc(db, colName, ids[0]));
    } else {
      const CHUNK = 400;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const batch = writeBatch(db);
        ids.slice(i, i + CHUNK).forEach((id) => {
          batch.delete(doc(db, colName, id));
        });
        await batch.commit();
      }
    }
    clearCatalogCache();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, colName);
  }
}

export async function importCatalogBatch(
  colName: 'products' | 'builderParts',
  items: CatalogItem[],
  existingMap: Map<string, CatalogItem>
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  try {
    const CHUNK = 350;
    for (let i = 0; i < items.length; i += CHUNK) {
      const batch = writeBatch(db);
      items.slice(i, i + CHUNK).forEach((item) => {
        const ref = doc(db, colName, item.id);
        const payload = prepareFirestorePayload(item, colName);
        const existing = existingMap.get(item.id);
        if (existing) {
          updated++;
          batch.set(ref, {
            ...payload,
            ...(existing.createdAt ? { createdAt: existing.createdAt } : {}),
            updatedAt: serverTimestamp(),
          });
        } else {
          created++;
          batch.set(ref, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      await batch.commit();
    }
    clearCatalogCache();
    return { created, updated };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, colName);
  }
}

export async function importSeedDataToFirestore(overwriteExisting: boolean): Promise<{
  productsWritten: number;
  partsWritten: number;
}> {
  const existingProducts = await fetchAllCollectionDocs('products');
  const existingParts = await fetchAllCollectionDocs('builderParts');

  const prodMap = new Map(existingProducts.map((p) => [p.id, p]));
  const partMap = new Map(existingParts.map((p) => [p.id, p]));

  const productsToWrite = overwriteExisting
    ? SEED_STOREFRONT_PRODUCTS
    : SEED_STOREFRONT_PRODUCTS.filter((p) => !prodMap.has(p.id));
  const partsToWrite = overwriteExisting
    ? SEED_BUILDER_PARTS
    : SEED_BUILDER_PARTS.filter((p) => !partMap.has(p.id));

  await importCatalogBatch('products', productsToWrite, prodMap);
  await importCatalogBatch('builderParts', partsToWrite, partMap);
  clearCatalogCache();

  return {
    productsWritten: productsToWrite.length,
    partsWritten: partsToWrite.length,
  };
}

export async function fetchAdmins(): Promise<AdminUserRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs
      .map((d) => {
        const data = d.data() as Partial<AdminUserRecord>;
        return {
          email: d.id,
          role: data.role === 'owner' ? 'owner' : 'editor',
          displayName: data.displayName || '',
          addedBy: data.addedBy || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as AdminUserRecord;
      })
      .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.email.localeCompare(b.email)));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'admins');
  }
}

export async function addAdminEditor(
  emailRaw: string,
  displayName: string,
  addedByEmail: string
): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  const path = `admins/${email}`;
  const ref = doc(db, 'admins', email);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error('That email already has admin access.');
    }
    await setDoc(ref, {
      email,
      role: 'editor',
      displayName: displayName.trim().slice(0, 120),
      addedBy: addedByEmail.toLowerCase().slice(0, 254),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'That email already has admin access.') {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeAdminEditor(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (OWNER_EMAILS.includes(email)) {
    throw new Error('The primary owner account cannot be removed.');
  }
  const path = `admins/${email}`;
  try {
    await deleteDoc(doc(db, 'admins', email));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function exportFullBackupJson(includeAdmins: boolean): Promise<Record<string, unknown>> {
  const [products, builderParts] = await Promise.all([
    fetchAllCollectionDocs('products'),
    fetchAllCollectionDocs('builderParts'),
  ]);
  const admins = includeAdmins ? await fetchAdmins().catch(() => []) : [];
  return {
    exportedAt: new Date().toISOString(),
    store: 'Computer Galaxy',
    products,
    builderParts,
    admins,
  };
}
