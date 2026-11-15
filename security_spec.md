# TataNaskah Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every unspecified path in `/databases/{database}/documents` rejects all reads and writes.
2. **Verified Identity & Ownership**: Every read/write requires `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
3. **PII Isolation (`/users/{userId}`)**: User documents contain `email`. Only the document owner (`isOwner(userId)`) may `get`, `create`, or `update` their own profile. Blanket `list` on `/users` is forbidden.
4. **Master Gate Relational Sync**: All subcollections (`/users/{userId}/letterheads/{profileId}` and `/users/{userId}/letters/{letterId}`) require the parent `/users/{userId}` document to exist via `exists(...)`.
5. **Immutable Identity & Timestamps**: `ownerId`, `uid`, `id`, and `createdAt` cannot be modified after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
6. **Strict Schema & Bounds**: Every string field enforces `.size() <= maxLength`, every list enforces `.size() <= MAX`, and document IDs match `^[a-zA-Z0-9_\-]+$`. Both `create` (`hasAll` + `hasOnly`) and `update` (`affectedKeys().hasOnly`) reject ghost/shadow fields.
7. **Zero Query Trust**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid` on the resource itself.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: Reading or writing `/users/u1/letters/arch-1` without `request.auth`. -> `PERMISSION_DENIED`
2. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/users/u1`. -> `PERMISSION_DENIED`
3. **Cross-User PII Leak**: User `u2` attempting `get` on `/users/u1` or `list` on `/users`. -> `PERMISSION_DENIED`
4. **Cross-User Letter Theft**: User `u2` attempting `get`/`list`/`delete` on `/users/u1/letters/arch-1`. -> `PERMISSION_DENIED`
5. **OwnerId Spoofing on Create**: User `u1` creating `/users/u1/letters/arch-1` with `{ ownerId: "u2", ... }`. -> `PERMISSION_DENIED`
6. **Ghost / Shadow Field Injection**: User `u1` creating `/users/u1` with `{ ..., isAdmin: true }` or `{ ..., role: "superadmin" }`. -> `PERMISSION_DENIED`
7. **ID Poisoning Attack**: User `u1` writing `/users/u1/letters/bad$id..with..chars` or an ID > 128 chars. -> `PERMISSION_DENIED`
8. **Document ID Mismatch**: User `u1` creating `/users/u1/letters/arch-1` where payload `id` is `"arch-999"`. -> `PERMISSION_DENIED`
9. **Orphaned Subcollection Write**: User `u1` creating `/users/u1/letters/arch-1` before `/users/u1` exists. -> `PERMISSION_DENIED`
10. **Immortal Field Mutation**: User `u1` updating `/users/u1/letters/arch-1` and changing `ownerId` or `createdAt`. -> `PERMISSION_DENIED`
11. **Client-Forged Timestamp**: User `u1` creating `/users/u1/letterheads/kop-1` with a past/future `createdAt` instead of `serverTimestamp()`. -> `PERMISSION_DENIED`
12. **Resource Exhaustion / Value Poisoning**: User `u1` writing a 2MB `subject` string, `recipientLines` with 50 items, or wrong enum `paperSize: "A3"`. -> `PERMISSION_DENIED`
