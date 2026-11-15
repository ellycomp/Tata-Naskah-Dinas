/**
 * Firestore Security Rules Test Suite for TataNaskah
 * Verifies all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 * Designed for execution with @firebase/rules-unit-testing against the Firebase Emulator.
 */

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Unauthenticated access to user letter archive',
    auth: null,
    operation: 'get',
    path: 'users/user-1/letters/arch-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email user creating profile',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: false } },
    operation: 'create',
    path: 'users/user-1',
    payload: {
      uid: 'user-1',
      displayName: 'User One',
      email: 'user1@example.com',
      photoURL: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user PII read on /users/{userId}',
    auth: { uid: 'user-2', token: { email: 'user2@example.com', email_verified: true } },
    operation: 'get',
    path: 'users/user-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-user list on /users/{userId}/letters',
    auth: { uid: 'user-2', token: { email: 'user2@example.com', email_verified: true } },
    operation: 'list',
    path: 'users/user-1/letters',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'OwnerId spoofing on archived letter create',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1/letters/arch-1',
    payload: {
      ownerId: 'user-2',
      id: 'arch-1',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Ghost field (isAdmin) injection on user profile create',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1',
    payload: {
      uid: 'user-1',
      displayName: 'Attacker',
      email: 'user1@example.com',
      photoURL: '',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID poisoning with invalid characters in letterId',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1/letters/bad$id..injection',
    payload: {
      ownerId: 'user-1',
      id: 'bad$id..injection',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Path ID vs payload ID mismatch',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1/letters/arch-1',
    payload: {
      ownerId: 'user-1',
      id: 'arch-different',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Orphaned write to letters before parent user doc exists',
    auth: { uid: 'user-orphan', token: { email: 'orphan@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-orphan/letters/arch-1',
    payload: {
      ownerId: 'user-orphan',
      id: 'arch-1',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immortal field mutation (ownerId/createdAt) on update',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'update',
    path: 'users/user-1/letters/arch-1',
    payload: {
      ownerId: 'user-2',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client-forged timestamp on letterhead profile create',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1/letterheads/kop-custom-1',
    payload: {
      ownerId: 'user-1',
      id: 'kop-custom-1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value poisoning with oversized subject and invalid paperSize enum',
    auth: { uid: 'user-1', token: { email: 'user1@example.com', email_verified: true } },
    operation: 'create',
    path: 'users/user-1/letters/arch-1',
    payload: {
      ownerId: 'user-1',
      id: 'arch-1',
      subject: 'A'.repeat(10000),
      paperSize: 'A3',
    },
    expected: 'PERMISSION_DENIED',
  },
] as const;
