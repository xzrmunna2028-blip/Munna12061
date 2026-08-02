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
import { db } from '../lib/firebase';
import { VoiceCall, CallStatus, User } from '../types';

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

  const tokenData = await fetchAgoraToken(channelName, numericUid);

  const callData: VoiceCall = {
    id: callId,
    channelName,
    callerId: caller.id,
    callerName: caller.name,
    callerAvatar: caller.avatar,
    receiverId: receiver.id,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    matchId,
    status: 'ringing',
    createdAt: new Date().toISOString(),
  };

  const callRef = doc(db, 'calls', callId);
  await setDoc(callRef, callData);

  return { call: callData, tokenData: { ...tokenData, uid: numericUid } };
};

// Listen for incoming call requests for current user
export const listenForIncomingCalls = (
  currentUserId: string,
  onIncomingCall: (call: VoiceCall) => void
) => {
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', currentUserId),
    where('status', '==', 'ringing')
  );

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
      console.warn('Incoming calls snapshot note:', err.message);
    }
  );
};

// Accept an incoming call
export const acceptVoiceCall = async (callId: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'accepted',
      startedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error accepting call:', err);
  }
};

// Reject an incoming call
export const rejectVoiceCall = async (callId: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'rejected',
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error rejecting call:', err);
  }
};

// End an ongoing call
export const endVoiceCall = async (callId: string) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error ending call:', err);
  }
};

// Listen for updates on a specific call document
export const subscribeToCallState = (
  callId: string,
  onUpdate: (call: VoiceCall) => void
) => {
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
      console.warn('Call state snapshot note:', err.message);
    }
  );
};
