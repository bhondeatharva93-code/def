# Security Specification & Dirty Dozen Audit Payloads

## 1. Data Invariants
1. All Firestore reads to `/products` and `/builderParts` are public (no PII is stored in catalogue collections).
2. All writes to `/products` and `/builderParts` require an authenticated Google user with `request.auth.token.email_verified == true` whose lowercase email exists in `/admins/{email}`.
3. Document IDs in `/products/{productId}` and `/builderParts/{partId}` must match `^[a-zA-Z0-9_-]+$` and be <= 128 characters.
4. `price` and `mrp` must be finite numbers in `[0, 10000000]`. Strings must be strictly bounded (`< 2000` chars).
5. `/admins/{adminEmail}` contains admin email allowlist entries and is strictly unreadable by anonymous or non-admin users.
6. Only `computergalaxysirohi@gmail.com` (verified email) can bootstrap its own `role: "owner"` document if absent; only a verified `owner` can create, update, or remove other `/admins/{adminEmail}` entries.
7. Ghost/unknown fields on any write are rejected via strict `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)` allowlists.

## 2. The "Dirty Dozen" Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated create on `/products/test-1`
2. Non-admin authenticated user create on `/products/test-1`
3. Admin user with `email_verified: false` write on `/products/test-1`
4. Admin write on `/products/test-1` with `price: -50` (below 0)
5. Admin write on `/products/test-2` with `price: 10000001` (above 10,000,000)
6. Admin write on `/products/test-3` with 2500-character `description` (`>= 2000` chars)
7. Admin write on `/products/test-4` containing shadow ghost field `{ isAdminOverride: true }`
8. Admin write on `/builderParts/bad-cat` with `cat: "monitor"` (invalid builder slot category)
9. Unauthenticated `get` or `list` on `/admins/computergalaxysirohi@gmail.com`
10. Non-owner verified `editor` attempting to create `/admins/attacker@gmail.com`
11. Non-owner verified `editor` attempting to promote self to `role: "owner"` on `/admins/editor@gmail.com`
12. Path ID poisoning write to `/products/../../admins/evil` or 200-char ID
