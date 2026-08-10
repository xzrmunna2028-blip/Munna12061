import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, clientQuotaExceeded, isQuotaError, setClientQuotaExceeded } from '../lib/firebase';
import { Message, User } from '../types';

// Subscribe to real-time messages in a match
export const subscribeToMessages = (
  matchId: string,
  onUpdate: (messages: Message[]) => void
) => {
  if (clientQuotaExceeded) {
    return () => {};
  }

  const messagesRef = collection(db, 'matches', matchId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          matchId: data.matchId || matchId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          imageUrl: data.imageUrl || undefined,
          replyTo: data.replyTo || undefined,
          reactions: data.reactions || [],
          createdAt: data.createdAt || new Date().toISOString(),
          isRead: !!data.isRead,
        };
      });
      onUpdate(msgs);
    },
    (err) => {
      if (isQuotaError(err)) {
        setClientQuotaExceeded(true);
      }
      console.warn('Firestore messages subscription note:', err.message);
    }
  );
};

// Send a new message
export const sendFirestoreMessage = async (
  matchId: string,
  senderId: string,
  receiverId: string,
  content: string,
  imageUrl?: string,
  replyTo?: { id: string; content: string; senderName?: string }
) => {
  if (clientQuotaExceeded) {
    throw new Error('quota-limit');
  }
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const createdAt = new Date().toISOString();

    const msgData: any = {
      matchId,
      senderId,
      receiverId,
      content,
      createdAt,
      isRead: false,
    };

    if (imageUrl) msgData.imageUrl = imageUrl;
    if (replyTo) msgData.replyTo = replyTo;

    // Add message
    const newDoc = await addDoc(messagesRef, msgData);

    // Update match document with last message info
    const matchRef = doc(db, 'matches', matchId);
    let proposalSentCountUpdate: any = {};
    try {
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
        const mData = matchSnap.data();
        if (mData.status === 'pending' && senderId === mData.user1Id) {
          const currentCount = mData.proposalSentCount || 0;
          proposalSentCountUpdate = {
            proposalSentCount: currentCount + 1
          };
        }
      }
    } catch (e) {
      console.warn('Could not read match for proposalSentCount:', e);
    }

    await setDoc(
      matchRef,
      {
        id: matchId,
        lastMessage: content || (imageUrl ? '📷 Photo' : 'Message'),
        lastMessageAt: createdAt,
        ...proposalSentCountUpdate,
      },
      { merge: true }
    );

    return { id: newDoc.id, ...msgData };
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error sending message to Firestore:', err);
    throw err;
  }
};

// Mark unread messages as read
export const markFirestoreMessagesAsRead = async (
  matchId: string,
  currentUserId: string
) => {
  if (clientQuotaExceeded) return;
  try {
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const q = query(
      messagesRef,
      where('receiverId', '==', currentUserId),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, { isRead: true });
    });
    await batch.commit();
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error marking messages as read:', err);
  }
};

// Set typing status for a match
export const setTypingStatus = async (
  matchId: string,
  userId: string,
  isTyping: boolean
) => {
  if (clientQuotaExceeded) return;
  try {
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(
      matchRef,
      {
        typing: {
          [userId]: isTyping,
        },
      },
      { merge: true }
    );
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error setting typing status:', err);
  }
};

// Subscribe to typing status for a match
export const subscribeToMatchTyping = (
  matchId: string,
  onUpdate: (typingMap: Record<string, boolean>) => void
) => {
  if (clientQuotaExceeded) {
    return () => {};
  }

  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(
    matchRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(data.typing || {});
      } else {
        onUpdate({});
      }
    },
    (err) => {
      if (isQuotaError(err)) {
        setClientQuotaExceeded(true);
      }
      console.warn('Firestore typing snapshot note:', err.message);
    }
  );
};

// Update user online status & last seen
export const updateUserOnlineStatus = async (
  userId: string,
  isOnline: boolean
) => {
  if (!userId || clientQuotaExceeded) return;
  try {
    const userRef = doc(db, 'users', userId);
    const lastActiveStr = isOnline ? 'Active now' : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await setDoc(
      userRef,
      {
        id: userId,
        isOnline,
        lastActive: lastActiveStr,
        lastActiveTimestamp: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error updating user status:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    } catch (e) {
      // Securely rethrow or swallow if needed for local fallback stability
    }
  }
};

// Subscribe to real-time user online status & last seen
export const subscribeToUserStatus = (
  userId: string,
  onUpdate: (status: { isOnline: boolean; lastActive: string }) => void
) => {
  if (clientQuotaExceeded) {
    return () => {};
  }

  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          isOnline: !!data.isOnline,
          lastActive: data.lastActive || 'recently',
        });
      }
    },
    (err) => {
      if (isQuotaError(err)) {
        setClientQuotaExceeded(true);
      }
      console.warn('User status snapshot note:', err.message);
    }
  );
};

// Toggle reaction on a message
export const toggleMessageReaction = async (
  matchId: string,
  messageId: string,
  userId: string,
  emoji: string
) => {
  if (clientQuotaExceeded) return;
  try {
    const msgRef = doc(db, 'matches', matchId, 'messages', messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const data = msgSnap.data();
    const existingReactions: { userId: string; emoji: string }[] = data.reactions || [];

    // Remove any existing reaction from this user or toggle if same
    const filtered = existingReactions.filter(r => r.userId !== userId);
    const existingFromUser = existingReactions.find(r => r.userId !== userId ? false : r.emoji === emoji);

    if (!existingFromUser) {
      filtered.push({ userId, emoji });
    }

    await updateDoc(msgRef, { reactions: filtered });
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error toggling reaction:', err);
  }
};

// Delete a message
export const deleteFirestoreMessage = async (
  matchId: string,
  messageId: string
) => {
  if (clientQuotaExceeded) return;
  try {
    const msgRef = doc(db, 'matches', matchId, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (err: any) {
    if (isQuotaError(err)) {
      setClientQuotaExceeded(true);
    }
    console.error('Error deleting message:', err);
  }
};

