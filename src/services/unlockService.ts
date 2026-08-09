import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UnlockRequest, UnlockedNumber, PaymentConfig, User } from '../types';
import { customFetch as fetch } from '../lib/api';

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  bkashNumber: '01647783682',
  nagadNumber: '01647783682',
  unlockFeeBdt: 100,
  tutorialVideoUrl: '',
};

// Subscribe to Payment Config in real-time
export const subscribeToPaymentConfig = (
  onUpdate: (config: PaymentConfig) => void
) => {
  const configRef = doc(db, 'systemSettings', 'paymentConfig');
  return onSnapshot(
    configRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PaymentConfig;
        onUpdate({
          bkashNumber: data.bkashNumber || DEFAULT_PAYMENT_CONFIG.bkashNumber,
          nagadNumber: data.nagadNumber || DEFAULT_PAYMENT_CONFIG.nagadNumber,
          unlockFeeBdt: data.unlockFeeBdt || DEFAULT_PAYMENT_CONFIG.unlockFeeBdt,
          tutorialVideoUrl: data.tutorialVideoUrl || '',
        });
      } else {
        onUpdate(DEFAULT_PAYMENT_CONFIG);
      }
    },
    (err) => {
      console.warn('Payment config snapshot note:', err.message);
      onUpdate(DEFAULT_PAYMENT_CONFIG);
    }
  );
};

// Update Payment Config (Admin)
export const updatePaymentConfigInFirestore = async (config: PaymentConfig) => {
  try {
    const configRef = doc(db, 'systemSettings', 'paymentConfig');
    await setDoc(configRef, config, { merge: true });
    // Also update server endpoint
    await fetch('/api/admin/payment-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  } catch (err) {
    console.error('Error updating payment config:', err);
  }
};

// Submit a new phone unlock request
export const submitUnlockRequest = async (
  currentUser: User,
  targetUser: User,
  paymentMethod: 'bkash' | 'nagad',
  trxId: string,
  senderPhone: string,
  amount: number
) => {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  const reqData: UnlockRequest = {
    id: reqId,
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    targetUserId: targetUser.id,
    targetUserName: targetUser.name,
    targetUserPhone: targetUser.phone || '01700000000',
    paymentMethod,
    trxId: trxId.trim().toUpperCase(),
    senderPhone: senderPhone.trim(),
    amount,
    status: 'pending',
    createdAt,
  };

  // 1. Save to Firestore
  try {
    const reqRef = doc(db, 'unlockRequests', reqId);
    await setDoc(reqRef, reqData);
  } catch (err) {
    console.warn('Firestore unlock request write warning:', err);
  }

  // 2. Also send to Express backend API
  try {
    await fetch('/api/unlock-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
  } catch (err) {
    console.error('API unlock request warning:', err);
  }

  return reqData;
};

// Subscribe to real-time unlocked numbers for current user
export const subscribeToUserUnlockedNumbers = (
  userId: string,
  onUpdate: (unlockedMap: Record<string, string>) => void
) => {
  const unlockedRef = collection(db, 'unlockedNumbers');
  const q = query(unlockedRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as UnlockedNumber;
        map[data.targetUserId] = data.targetPhone || 'Unlocked';
      });
      onUpdate(map);
    },
    (err) => {
      console.warn('Unlocked numbers snapshot note:', err.message);
    }
  );
};

// Subscribe to all unlock requests (Admin View)
export const subscribeToAllUnlockRequests = (
  onUpdate: (requests: UnlockRequest[]) => void
) => {
  const reqsRef = collection(db, 'unlockRequests');

  return onSnapshot(
    reqsRef,
    (snapshot) => {
      const list: UnlockRequest[] = snapshot.docs.map((d) => ({
        ...(d.data() as UnlockRequest),
        id: d.id,
      }));
      // Sort client-side by date desc
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('All unlock requests snapshot note:', err.message);
    }
  );
};

// Approve an unlock request (Admin Action)
export const approveUnlockRequestInFirestore = async (
  request: UnlockRequest,
  targetUserPhone: string
) => {
  const updatedAt = new Date().toISOString();

  // 1. Update Firestore Unlock Request
  try {
    const reqRef = doc(db, 'unlockRequests', request.id);
    await updateDoc(reqRef, {
      status: 'approved',
      updatedAt,
    });

    // 2. Create Unlocked Number entry
    if (request.targetUserId === 'premium_verification') {
      try {
        const userRef = doc(db, 'users', request.userId);
        await updateDoc(userRef, { verified: true });
      } catch (e) {
        console.warn('Error auto-verifying user in Firestore on premium approve:', e);
      }
    } else {
      const unlockId = `unlock_${request.userId}_${request.targetUserId}`;
      const unlockRef = doc(db, 'unlockedNumbers', unlockId);
      await setDoc(unlockRef, {
        id: unlockId,
        userId: request.userId,
        targetUserId: request.targetUserId,
        targetPhone: targetUserPhone || request.targetUserPhone || '01711223344',
        unlockedAt: updatedAt,
      });
    }
  } catch (err) {
    console.error('Error approving in Firestore:', err);
  }

  // 3. Update express server API
  try {
    await fetch(`/api/unlock-requests/${request.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhone: targetUserPhone }),
    });
  } catch (err) {
    console.error('Error calling approve endpoint:', err);
  }
};

// Reject an unlock request (Admin Action)
export const rejectUnlockRequestInFirestore = async (
  requestId: string,
  adminNote?: string
) => {
  const updatedAt = new Date().toISOString();

  try {
    const reqRef = doc(db, 'unlockRequests', requestId);
    await updateDoc(reqRef, {
      status: 'rejected',
      adminNote: adminNote || 'Payment verification failed or TrxID invalid',
      updatedAt,
    });
  } catch (err) {
    console.error('Error rejecting in Firestore:', err);
  }

  try {
    await fetch(`/api/unlock-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNote }),
    });
  } catch (err) {
    console.error('Error calling reject endpoint:', err);
  }
};

// Submit a premium verification subscription request
export const submitPremiumSubscriptionRequest = async (
  currentUser: User,
  paymentMethod: 'bkash' | 'nagad',
  trxId: string,
  senderPhone: string,
  amount: number
) => {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  const reqData: UnlockRequest = {
    id: reqId,
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    targetUserId: 'premium_verification',
    targetUserName: 'Premium Verification Badge',
    targetUserPhone: 'N/A',
    paymentMethod,
    trxId: trxId.trim().toUpperCase(),
    senderPhone: senderPhone.trim(),
    amount,
    status: 'pending',
    createdAt,
  };

  // 1. Save to Firestore
  try {
    const reqRef = doc(db, 'unlockRequests', reqId);
    await setDoc(reqRef, reqData);
  } catch (err) {
    console.warn('Firestore unlock request write warning:', err);
  }

  // 2. Also send to Express backend API
  try {
    await fetch('/api/unlock-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData),
    });
  } catch (err) {
    console.error('API unlock request warning:', err);
  }

  return reqData;
};
