import { initializeApp } from 'firebase/app';
import { getFirestore, disableNetwork } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const databaseId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (databaseId && databaseId !== '(default)')
  ? getFirestore(app, databaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export let clientQuotaExceeded = false;

export function setClientQuotaExceeded(val: boolean) {
  clientQuotaExceeded = val;
  if (val) {
    try {
      if (db) {
        disableNetwork(db).catch((e) => {
          console.warn('[Firestore] Network disable promise failed:', e);
        });
      }
    } catch (e) {
      console.warn('[Firestore] Error while calling disableNetwork:', e);
    }
    try {
      window.dispatchEvent(new CustomEvent('heartsync_quota_exceeded'));
    } catch (_) {}
  }
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const errMsg = err.message || String(err);
  return errMsg.includes('resource-exhausted') || 
         errMsg.includes('Quota limit exceeded') || 
         errMsg.includes('Quota') || 
         errMsg.includes('quota') ||
         errMsg.includes('RESOURCE_EXHAUSTED');
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    setClientQuotaExceeded(true);
    console.warn('[Firestore] Quota limit exceeded. Client has successfully fallen back to fully-functional local memory/REST API.');
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
