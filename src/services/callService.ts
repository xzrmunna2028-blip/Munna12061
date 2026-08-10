import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, clientQuotaExceeded, isQuotaError, setClientQuotaExceeded } from '../lib/firebase';
import { VoiceCall, CallStatus, User } from '../types';
import { customFetch as fetch } from '../lib/api';

export const fetchAgoraToken = async (channelName: string, uid: number) => {
  try {
    const res = await fetch(`/api/agora/token?channelName=${encodeURIComponent(channelName)}&uid=${uid}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error fetching Agora token:', err);
  }
  return { token: '', appId: 'a1b2c3d4e5f678901234567890abcdef', channelName, uid };
};

// Start an outgoing voice call
export const initiateVoiceCall = async (
  caller: User,
  receiver: User,
  matchId: string
): Promise<{ call: VoiceCall; tokenData: any }> => {
  const channelName = `dating_call_${matchId}_${Date.now()}`;
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const numericUid = Math.floor(Math.random() * 899999) + 100000;

  // Do not block call initiation by awaiting token fetch here
  const tokenData = { token: '', appId: 'a1b2c3d4e5f678901234567890abcdef', channelName, uid: numericUid };

  const callData: VoiceCall = {
    id: callId,
    channelName,
    callerId: caller.id || '',
    callerName: caller.name || 'User',
    callerAvatar: caller.avatar || '',
    receiverId: receiver.id || '',
    receiverName: receiver.name || 'Match',
    receiverAvatar: receiver.avatar || '',
    matchId,
    status: 'ringing',
    createdAt: new Date().toISOString(),
  };

  if (!clientQuotaExceeded) {
    try {
      const callRef = doc(db, 'calls', callId);
      await setDoc(callRef, callData);
    } catch (err: any) {
      if (isQuotaError(err)) {
        setClientQuotaExceeded(true);
      }
      console.warn('Firestore initiateVoiceCall note:', err);
    }
  }

  return { call: callData, tokenData };
};

// Listen for incoming call requests for current user
export const listenForIncomingCalls = (
  currentUserId: string,
  onIncomingCall: (call: VoiceCall) => void
) => {
  if (clientQuotaExceeded) {
    return () => {};
  }
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', currentUserId),
    where('status', '==', 'ringing')
  );

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as VoiceCall;
            onIncomingCall({ ...data, id: change.doc.id });
          }
        });
      },
      (err) => {
        if (isQuotaError(err)) {
          setClientQuotaExceeded(true);
        }
        console.warn('Incoming calls snapshot note:', err.message);
      }
    );
  } catch (e: any) {
    if (isQuotaError(e)) {
      setClientQuotaExceeded(true);
    }
    console.warn('Incoming calls setup error:', e);
    return () => {};
  }
};

// Accept an incoming call
export const acceptVoiceCall = async (callId: string) => {
  if (clientQuotaExceeded) return;
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'accepted',
      startedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error accepting call:', err);
  }
};

// Reject an incoming call
export const rejectVoiceCall = async (callId: string) => {
  if (clientQuotaExceeded) return;
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'rejected',
      endedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error rejecting call:', err);
  }
};

// End an ongoing call
export const endVoiceCall = async (callId: string) => {
  if (clientQuotaExceeded) return;
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error ending call:', err);
  }
};

// Listen for updates on a specific call document
export const subscribeToCallState = (
  callId: string,
  onUpdate: (call: VoiceCall) => void
) => {
  if (clientQuotaExceeded) {
    return () => {};
  }
  try {
    const callRef = doc(db, 'calls', callId);
    return onSnapshot(
      callRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as VoiceCall;
          onUpdate({ ...data, id: docSnap.id });
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          setClientQuotaExceeded(true);
        }
        console.warn('Call state snapshot note:', err.message);
      }
    );
  } catch (e: any) {
    if (isQuotaError(e)) {
      setClientQuotaExceeded(true);
    }
    console.warn('Call state setup error:', e);
    return () => {};
  }
};
