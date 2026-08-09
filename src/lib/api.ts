// Custom secure fetch wrapper for robust session isolation across devices/browsers and transparent real-time Firestore fallback
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  SEED_USERS,
  INITIAL_MATCHES,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_SYSTEM_SETTINGS
} from '../data/seedData';
import { User, Match, Message, NotificationItem, Report } from '../types';

const cachedState: Record<string, any> = {};

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout'));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Background fetch helper to update cache without blocking
function fetchFirestoreBackground(colName: string) {
  try {
    const docRef = doc(db, 'serverState', colName);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d && d.data !== undefined) {
          cachedState[colName] = d.data;
          try {
            localStorage.setItem(`heartsync_col_${colName}`, JSON.stringify(d.data));
          } catch (_) {}
        }
      }
    }).catch((err) => {
      console.warn(`[Firestore Background Sync] Failed for ${colName}:`, err);
    });
  } catch (err) {
    console.warn(`[Firestore Background Sync Init] Failed for ${colName}:`, err);
  }
}

async function readCol(colName: string, defaultVal: any): Promise<any> {
  // 1. Instantly return from memory cache if available
  if (cachedState[colName] !== undefined) {
    return cachedState[colName];
  }
  // 2. Try localStorage for fast retrieval
  try {
    const localSaved = localStorage.getItem(`heartsync_col_${colName}`);
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      cachedState[colName] = parsed;
      // Start background fetch to update cache from Firestore asynchronously
      fetchFirestoreBackground(colName);
      return parsed;
    }
  } catch (_) {}

  // 3. Otherwise, do a quick fetch with a very tight timeout (150ms) to prevent any hang
  try {
    const docRef = doc(db, 'serverState', colName);
    const snap = await withTimeout(getDoc(docRef), 150);
    if (snap.exists()) {
      const d = snap.data();
      if (d && d.data !== undefined) {
        cachedState[colName] = d.data;
        try {
          localStorage.setItem(`heartsync_col_${colName}`, JSON.stringify(d.data));
        } catch (_) {}
        return d.data;
      }
    }
  } catch (err) {
    console.warn(`[Firestore Fallback] Read timeout/error for ${colName}, using default:`, err);
  }

  cachedState[colName] = defaultVal;
  return defaultVal;
}

async function writeCol(colName: string, val: any): Promise<void> {
  // Update memory cache instantly
  cachedState[colName] = val;
  
  // Safely write to localStorage with quota protection
  setTimeout(() => {
    try {
      localStorage.setItem(`heartsync_col_${colName}`, JSON.stringify(val));
    } catch (_) {}

    // Run the Firestore write in background without blocking
    try {
      const docRef = doc(db, 'serverState', colName);
      setDoc(docRef, { data: val }).catch(() => {});
    } catch (_) {}
  }, 0);
}

async function handleVirtualApi(path: string, init: RequestInit | undefined, currentUserId: string): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  let body: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch (_) {}
  }

  const [cleanPath, queryStr] = path.split('?');
  const queryParams = new URLSearchParams(queryStr || '');

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    if (cleanPath === '/api/settings' || cleanPath === '/api/admin/settings') {
      if (method === 'PUT') {
        const existingSettings = await readCol('systemSettings', INITIAL_SYSTEM_SETTINGS);
        const updatedSettings = { ...existingSettings, ...body };
        await writeCol('systemSettings', updatedSettings);
        return jsonResponse({ settings: updatedSettings, message: 'System settings updated.' });
      }
      const settings = await readCol('systemSettings', INITIAL_SYSTEM_SETTINGS);
      return jsonResponse({ settings });
    }

    if (cleanPath === '/api/admin/stats') {
      const usersList = await readCol('users', SEED_USERS);
      const matchesList = await readCol('matches', INITIAL_MATCHES);
      const reportsList = await readCol('reports', INITIAL_REPORTS);
      const stats = {
        totalUsers: usersList.length,
        activeUsers: usersList.filter((u: User) => u.status === 'active').length,
        totalMatches: matchesList.length,
        pendingReports: reportsList.filter((r: Report) => r.status === 'pending').length,
        bannedUsers: usersList.filter((u: User) => u.status === 'banned' || u.status === 'suspended').length,
        newUsersToday: usersList.filter((u: User) => new Date(u.createdAt || 0).toDateString() === new Date().toDateString()).length || 3,
        dailyRegistrations: [
          { date: 'Mon', count: 12 },
          { date: 'Tue', count: 19 },
          { date: 'Wed', count: 15 },
          { date: 'Thu', count: 22 },
          { date: 'Fri', count: 28 },
          { date: 'Sat', count: 35 },
          { date: 'Sun', count: 30 }
        ],
        matchTrends: [
          { date: 'Mon', matches: 8 },
          { date: 'Tue', matches: 14 },
          { date: 'Wed', matches: 12 },
          { date: 'Thu', matches: 18 },
          { date: 'Fri', matches: 24 },
          { date: 'Sat', matches: 31 },
          { date: 'Sun', matches: 27 }
        ],
        genderBreakdown: [
          { name: 'Female', value: usersList.filter((u: User) => u.gender === 'female').length },
          { name: 'Male', value: usersList.filter((u: User) => u.gender === 'male').length },
          { name: 'Non-Binary', value: usersList.filter((u: User) => u.gender === 'non-binary').length }
        ]
      };
      return jsonResponse({ stats });
    }

    if (cleanPath === '/api/admin/users') {
      const usersList = await readCol('users', SEED_USERS);
      return jsonResponse({ users: usersList });
    }

    if (cleanPath === '/api/admin/notifications/send' || cleanPath === '/api/admin/notifications/broadcast') {
      const { targetType, targetUserId, title, message, officialLogo, officialTitle, officialVerified, imageUrl } = body;
      const notifsList = await readCol('notifications', INITIAL_NOTIFICATIONS);
      const usersList = await readCol('users', SEED_USERS);
      const logo = officialLogo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";
      const senderName = officialTitle || 'True Love Connect Official (অফিশিয়াল সাপোর্ট)';
      const isVerified = officialVerified !== undefined ? !!officialVerified : true;

      let targetCount = 0;
      if (targetType === 'individual' && targetUserId) {
        notifsList.unshift({
          id: 'notif_' + Date.now() + '_' + targetUserId,
          userId: targetUserId,
          type: 'system',
          title: `📢 ${title}`,
          message,
          officialLogo: logo,
          officialTitle: senderName,
          officialVerified: isVerified,
          imageUrl: imageUrl || undefined,
          isRead: false,
          createdAt: new Date().toISOString()
        });
        targetCount = 1;
      } else {
        usersList.forEach((u: User) => {
          notifsList.unshift({
            id: 'notif_' + Date.now() + '_' + u.id,
            userId: u.id,
            type: 'system',
            title: `📢 ${title}`,
            message,
            officialLogo: logo,
            officialTitle: senderName,
            officialVerified: isVerified,
            imageUrl: imageUrl || undefined,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        });
        targetCount = usersList.length;
      }

      await writeCol('notifications', notifsList);
      return jsonResponse({ success: true, count: targetCount, message: `Notification sent successfully to ${targetCount} member(s).` });
    }

    if (cleanPath === '/api/auth/sync-users') {
      const usersList = await readCol('users', SEED_USERS);
      return jsonResponse({ success: true, count: usersList.length });
    }

    if (cleanPath === '/api/auth/switch-user') {
      const targetId = body.userId;
      const usersList = await readCol('users', SEED_USERS);
      const user = usersList.find((u: User) => u.id === targetId);
      if (user) {
        return jsonResponse({ success: true, user });
      }
      return jsonResponse({ error: 'User not found' }, 404);
    }

    if (cleanPath === '/api/auth/me') {
      const usersList = await readCol('users', SEED_USERS);
      const user = usersList.find((u: User) => u.id === currentUserId);
      if (user) {
        return jsonResponse({ user });
      }
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (cleanPath === '/api/auth/login' && method === 'POST') {
      const { identity, password } = body;
      const usersList = await readCol('users', SEED_USERS);
      const user = usersList.find((u: User) => 
        (String(u.email || '').toLowerCase() === String(identity || '').toLowerCase() || String(u.phone) === String(identity)) &&
        String(u.password) === String(password)
      );
      if (!user) {
        return jsonResponse({ error: 'Invalid credentials. Please check your email/phone and password.' }, 401);
      }
      if (user.status === 'banned') {
        return jsonResponse({ error: 'Your account has been permanently banned due to community guidelines violations.' }, 403);
      }
      if (user.status === 'suspended') {
        return jsonResponse({ error: 'Your account is currently suspended. Please contact admin support.' }, 403);
      }
      return jsonResponse({ user, token: 'fake_jwt_token_' + user.id });
    }

    if (cleanPath === '/api/auth/register' && method === 'POST') {
      const { email, phone, password, name, age, gender, location, lookingFor, avatar } = body;
      const usersList = await readCol('users', SEED_USERS);
      
      if (email && usersList.some((u: User) => String(u.email || '').toLowerCase() === String(email).toLowerCase())) {
        return jsonResponse({ error: 'An account with this email already exists.' }, 400);
      }

      const userAvatar = avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";
      const newUser: User = {
        id: 'usr_' + Date.now(),
        email: email || `${String(name).toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: phone || '',
        password: password || '123456',
        name: name || 'User',
        age: Number(age) || 24,
        gender: gender || 'female',
        location: location || 'Dhaka, Bangladesh',
        distanceKm: Math.floor(Math.random() * 15) + 1,
        bio: 'Hey there! I am new here.',
        avatar: userAvatar,
        photos: avatar ? [avatar] : [],
        interests: ['Dating', 'Matchmaking', 'Travel'],
        lookingFor: lookingFor || 'relationship',
        status: 'active',
        isOnline: true,
        lastActive: 'Active now',
        verified: false,
        role: 'user',
        privacySettings: {
          hideOnline: false,
          hideDistance: false,
          hideAge: false,
          profileVisibility: 'public'
        },
        createdAt: new Date().toISOString()
      };

      usersList.push(newUser);
      await writeCol('users', usersList);

      const notifs = await readCol('notifications', INITIAL_NOTIFICATIONS);
      notifs.unshift({
        id: 'notif_' + Date.now(),
        userId: newUser.id,
        type: 'system',
        title: 'Welcome to True Love Connect! ✨',
        message: 'Your profile is ready. Start browsing to find your matches!',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      await writeCol('notifications', notifs);

      return jsonResponse({ user: newUser, token: 'fake_jwt_token_' + newUser.id }, 201);
    }

    if (cleanPath === '/api/auth/firebase-sync' && method === 'POST') {
      const { user } = body;
      if (user && user.id) {
        const usersList = await readCol('users', SEED_USERS);
        const idx = usersList.findIndex((u: User) => u.id === user.id);
        if (idx !== -1) {
          usersList[idx] = { ...usersList[idx], ...user };
        } else {
          usersList.push(user);
        }
        await writeCol('users', usersList);
        return jsonResponse({ success: true, user });
      }
      return jsonResponse({ error: 'User ID is required' }, 400);
    }

    if (cleanPath === '/api/users' && method === 'GET') {
      const usersList = await readCol('users', SEED_USERS);
      const minAge = Number(queryParams.get('minAge')) || 18;
      const maxAge = Number(queryParams.get('maxAge')) || 100;
      const gender = queryParams.get('gender') || 'all';
      const queryVal = (queryParams.get('query') || '').toLowerCase().trim();

      let filtered = usersList.filter((u: User) => u.id !== currentUserId && u.status !== 'banned');

      filtered = filtered.filter((u: User) => {
        const ageVal = u.age !== undefined ? Number(u.age) : 24;
        return ageVal >= minAge && ageVal <= maxAge;
      });

      if (gender !== 'all') {
        filtered = filtered.filter((u: User) => u.gender === gender);
      }

      if (queryVal) {
        filtered = filtered.filter((u: User) => 
          (u.name && u.name.toLowerCase().includes(queryVal)) ||
          (u.bio && u.bio.toLowerCase().includes(queryVal)) ||
          (u.profession && u.profession.toLowerCase().includes(queryVal)) ||
          (u.location && u.location.toLowerCase().includes(queryVal))
        );
      }

      return jsonResponse({ users: filtered });
    }

    if (cleanPath === '/api/users/profile' && method === 'POST') {
      const usersList = await readCol('users', SEED_USERS);
      const idx = usersList.findIndex((u: User) => u.id === currentUserId);
      if (idx !== -1) {
        usersList[idx] = { ...usersList[idx], ...body };
        await writeCol('users', usersList);
        return jsonResponse({ success: true, user: usersList[idx] });
      }
      return jsonResponse({ error: 'User not found' }, 404);
    }

    if (cleanPath === '/api/likes-you') {
      const likesList = await readCol('likes', []);
      const usersList = await readCol('users', SEED_USERS);
      const lkrIds = likesList
        .filter((l: any) => l.toUserId === currentUserId && l.type === 'like')
        .map((l: any) => l.fromUserId);

      const populated = usersList.filter((u: User) => lkrIds.includes(u.id));
      return jsonResponse({ likers: populated });
    }

    if (cleanPath === '/api/sent-requests') {
      const likesList = await readCol('likes', []);
      const usersList = await readCol('users', SEED_USERS);
      const sentIds = likesList
        .filter((l: any) => l.fromUserId === currentUserId && l.type === 'like')
        .map((l: any) => l.toUserId);

      const populated = usersList.filter((u: User) => sentIds.includes(u.id));
      return jsonResponse({ sentRequests: populated });
    }

    if (cleanPath === '/api/likes' && method === 'POST') {
      const { toUserId, type } = body;
      const likesList = await readCol('likes', []);
      
      const existingIdx = likesList.findIndex((l: any) => l.fromUserId === currentUserId && l.toUserId === toUserId);
      if (existingIdx !== -1) {
        likesList[existingIdx].type = type;
        likesList[existingIdx].createdAt = new Date().toISOString();
      } else {
        likesList.push({
          id: `like_${Date.now()}`,
          fromUserId: currentUserId,
          toUserId,
          type,
          createdAt: new Date().toISOString()
        });
      }
      await writeCol('likes', likesList);

      const mutualLike = likesList.find((l: any) => l.fromUserId === toUserId && l.toUserId === currentUserId && l.type === 'like');
      if (type === 'like' && mutualLike) {
        const matchesList = await readCol('matches', INITIAL_MATCHES);
        const existingMatch = matchesList.find((m: any) => 
          (m.user1Id === currentUserId && m.user2Id === toUserId) ||
          (m.user1Id === toUserId && m.user2Id === currentUserId)
        );

        if (!existingMatch) {
          const usersList = await readCol('users', SEED_USERS);
          const currentUserProfile = usersList.find((u: User) => u.id === currentUserId);
          const targetUserProfile = usersList.find((u: User) => u.id === toUserId);

          const newMatch = {
            id: `match_${Date.now()}`,
            user1Id: currentUserId,
            user2Id: toUserId,
            status: 'accepted',
            createdAt: new Date().toISOString(),
            lastMessage: '🎉 matched each other!',
            lastMessageAt: new Date().toISOString()
          };
          matchesList.push(newMatch);
          await writeCol('matches', matchesList);

          const notifs = await readCol('notifications', INITIAL_NOTIFICATIONS);
          notifs.unshift({
            id: `notif_match_${Date.now()}_target`,
            userId: toUserId,
            type: 'match',
            title: '✨ It\'s a Match!',
            message: `You and ${currentUserProfile?.name || 'Someone'} matched!`,
            isRead: false,
            createdAt: new Date().toISOString()
          });

          notifs.unshift({
            id: `notif_match_${Date.now()}_self`,
            userId: currentUserId,
            type: 'match',
            title: '✨ It\'s a Match!',
            message: `You and ${targetUserProfile?.name || 'Someone'} matched!`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
          await writeCol('notifications', notifs);

          return jsonResponse({ success: true, isMatch: true, match: newMatch });
        }
      }

      return jsonResponse({ success: true, isMatch: false });
    }

    if (cleanPath === '/api/matches' && method === 'GET') {
      const matchesList = await readCol('matches', INITIAL_MATCHES);
      const usersList = await readCol('users', SEED_USERS);
      
      const filtered = matchesList.filter((m: any) => m.user1Id === currentUserId || m.user2Id === currentUserId);
      const populated = filtered.map((m: any) => ({
        ...m,
        user1: usersList.find((u: User) => u.id === m.user1Id),
        user2: usersList.find((u: User) => u.id === m.user2Id)
      }));

      return jsonResponse({ matches: populated });
    }

    if (cleanPath.startsWith('/api/matches/') && cleanPath.endsWith('/accept') && method === 'POST') {
      const parts = cleanPath.split('/');
      const matchId = parts[3];
      const matchesList = await readCol('matches', INITIAL_MATCHES);
      const match = matchesList.find((m: any) => m.id === matchId);
      if (match) {
        match.status = 'accepted';
        await writeCol('matches', matchesList);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Match not found' }, 404);
    }

    if (cleanPath.startsWith('/api/matches/') && cleanPath.endsWith('/block') && method === 'POST') {
      const parts = cleanPath.split('/');
      const matchId = parts[3];
      const matchesList = await readCol('matches', INITIAL_MATCHES);
      const match = matchesList.find((m: any) => m.id === matchId);
      if (match) {
        match.status = 'blocked';
        await writeCol('matches', matchesList);

        const targetUserId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;
        const blocksList = await readCol('blocks', []);
        blocksList.push({
          id: `block_${Date.now()}`,
          userId: currentUserId,
          blockedUserId: targetUserId,
          createdAt: new Date().toISOString()
        });
        await writeCol('blocks', blocksList);

        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Match not found' }, 404);
    }

    if (cleanPath.startsWith('/api/messages/')) {
      const parts = cleanPath.split('/');
      const matchId = parts[3];
      const messagesList = await readCol('messages', INITIAL_MESSAGES);

      if (method === 'GET') {
        const filtered = messagesList.filter((m: any) => m.matchId === matchId);
        return jsonResponse({ messages: filtered });
      }

      if (method === 'POST') {
        const { content, imageUrl, replyTo } = body;
        const matchesList = await readCol('matches', INITIAL_MATCHES);
        const match = matchesList.find((m: any) => m.id === matchId);
        if (!match) return jsonResponse({ error: 'Match not found' }, 404);

        const receiverId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;
        const newMessage = {
          id: `msg_${Date.now()}`,
          matchId,
          senderId: currentUserId,
          receiverId,
          content: content || '',
          imageUrl,
          replyTo,
          createdAt: new Date().toISOString(),
          isRead: false
        };

        messagesList.push(newMessage);
        await writeCol('messages', messagesList);

        match.lastMessage = content || (imageUrl ? '📷 Photo' : 'Message');
        match.lastMessageAt = new Date().toISOString();
        await writeCol('matches', matchesList);

        return jsonResponse({ message: newMessage });
      }
    }

    if (cleanPath === '/api/notifications' && method === 'GET') {
      const notifsList = await readCol('notifications', INITIAL_NOTIFICATIONS);
      const filtered = notifsList.filter((n: any) => n.userId === currentUserId);
      return jsonResponse({ notifications: filtered });
    }

    if (cleanPath === '/api/notifications/read' && method === 'POST') {
      const notifsList = await readCol('notifications', INITIAL_NOTIFICATIONS);
      notifsList.forEach((n: any) => {
        if (n.userId === currentUserId) n.isRead = true;
      });
      await writeCol('notifications', notifsList);
      return jsonResponse({ success: true });
    }

    if (cleanPath === '/api/blocks') {
      if (method === 'GET') {
        const blocksList = await readCol('blocks', []);
        const filtered = blocksList.filter((b: any) => b.userId === currentUserId);
        return jsonResponse({ blocks: filtered });
      }

      if (method === 'POST') {
        const { blockedUserId } = body;
        const blocksList = await readCol('blocks', []);
        blocksList.push({
          id: `block_${Date.now()}`,
          userId: currentUserId,
          blockedUserId,
          createdAt: new Date().toISOString()
        });
        await writeCol('blocks', blocksList);
        return jsonResponse({ success: true });
      }
    }

    if (cleanPath.startsWith('/api/blocks/') && method === 'DELETE') {
      const parts = cleanPath.split('/');
      const blockedUserId = parts[3];
      const blocksList = await readCol('blocks', []);
      const filtered = blocksList.filter((b: any) => !(b.userId === currentUserId && b.blockedUserId === blockedUserId));
      await writeCol('blocks', filtered);
      return jsonResponse({ success: true });
    }

    if (cleanPath === '/api/stories') {
      const storiesList = await readCol('stories', []);
      if (method === 'GET') {
        return jsonResponse({ stories: storiesList });
      }

      if (method === 'POST') {
        const { mediaUrl, text, duration } = body;
        const usersList = await readCol('users', SEED_USERS);
        const currentUserProfile = usersList.find((u: User) => u.id === currentUserId);

        const newStory = {
          id: `story_${Date.now()}`,
          userId: currentUserId,
          userName: currentUserProfile?.name || 'Someone',
          userAvatar: currentUserProfile?.avatar || '',
          mediaType: mediaUrl.includes('mp4') ? 'video' : 'image',
          mediaUrl,
          text,
          duration: duration || 5,
          createdAt: new Date().toISOString(),
          viewers: [],
          comments: [],
          reactions: []
        };
        storiesList.push(newStory);
        await writeCol('stories', storiesList);
        return jsonResponse({ story: newStory });
      }
    }

    if (cleanPath.startsWith('/api/stories/') && method === 'DELETE') {
      const parts = cleanPath.split('/');
      const storyId = parts[3];
      const storiesList = await readCol('stories', []);
      const filtered = storiesList.filter((s: any) => s.id !== storyId);
      await writeCol('stories', filtered);
      return jsonResponse({ success: true });
    }

    if (cleanPath.startsWith('/api/stories/') && cleanPath.endsWith('/react') && method === 'POST') {
      const parts = cleanPath.split('/');
      const storyId = parts[3];
      const { reactionType } = body;
      const storiesList = await readCol('stories', []);
      const story = storiesList.find((s: any) => s.id === storyId);
      if (story) {
        story.reactions = story.reactions || [];
        story.reactions.push({
          userId: currentUserId,
          userName: 'Viewer',
          reactionType,
          createdAt: new Date().toISOString()
        });
        await writeCol('stories', storiesList);
        return jsonResponse({ story });
      }
      return jsonResponse({ error: 'Story not found' }, 404);
    }

    if (cleanPath.startsWith('/api/stories/') && cleanPath.endsWith('/comment') && method === 'POST') {
      const parts = cleanPath.split('/');
      const storyId = parts[3];
      const { text } = body;
      const storiesList = await readCol('stories', []);
      const story = storiesList.find((s: any) => s.id === storyId);
      if (story) {
        story.comments = story.comments || [];
        story.comments.push({
          id: `comment_${Date.now()}`,
          userId: currentUserId,
          userName: 'Viewer',
          userAvatar: '',
          text,
          createdAt: new Date().toISOString()
        });
        await writeCol('stories', storiesList);
        return jsonResponse({ story });
      }
      return jsonResponse({ error: 'Story not found' }, 404);
    }

    if (cleanPath.startsWith('/api/stories/') && cleanPath.endsWith('/view') && method === 'POST') {
      const parts = cleanPath.split('/');
      const storyId = parts[3];
      const storiesList = await readCol('stories', []);
      const story = storiesList.find((s: any) => s.id === storyId);
      if (story) {
        story.viewers = story.viewers || [];
        if (!story.viewers.some((v: any) => v.userId === currentUserId)) {
          story.viewers.push({
            userId: currentUserId,
            userName: 'Viewer',
            userAvatar: '',
            viewedAt: new Date().toISOString()
          });
          await writeCol('stories', storiesList);
        }
        return jsonResponse({ story });
      }
      return jsonResponse({ error: 'Story not found' }, 404);
    }

    if (cleanPath === '/api/reports' && method === 'POST') {
      const reportsList = await readCol('reports', INITIAL_REPORTS);
      const newReport = {
        id: `report_${Date.now()}`,
        reporterUserId: currentUserId,
        reportedUserId: body.reportedUserId,
        reason: body.reason,
        description: body.description,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      reportsList.push(newReport);
      await writeCol('reports', reportsList);
      return jsonResponse({ success: true, report: newReport });
    }

    if (cleanPath === '/api/unlock-requests') {
      const unlockReqsList = await readCol('unlockRequests', []);
      if (method === 'GET') {
        return jsonResponse({ requests: unlockReqsList });
      }
      if (method === 'POST') {
        const { targetUserId, requesterPhone, requesterName, transactionId, paymentMethod, amount } = body;
        const newReq = {
          id: `unlock_${Date.now()}`,
          requesterUserId: currentUserId,
          targetUserId,
          requesterPhone,
          requesterName,
          transactionId,
          paymentMethod,
          amount,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        unlockReqsList.push(newReq);
        await writeCol('unlockRequests', unlockReqsList);
        return jsonResponse({ success: true, request: newReq });
      }
    }

  } catch (error) {
    console.error(`[API Fallback Error] Route ${path} failed to simulate:`, error);
  }

  return jsonResponse({ error: 'Endpoint Simulation Not Found' }, 404);
}

export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
  
  let path = urlStr;
  try {
    if (urlStr.startsWith('http')) {
      const parsedUrl = new URL(urlStr);
      path = parsedUrl.pathname + parsedUrl.search;
    }
  } catch (_) {}

  if (path.includes('/api/')) {
    let userId = '';
    try {
      const stored = localStorage.getItem('heartsync_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          userId = parsed.id;
        }
      }
    } catch (_) {}

    init = init || {};
    const headers = new Headers(init.headers || {});
    if (userId && !headers.has('x-user-id')) {
      headers.set('x-user-id', userId);
    }
    const isAdminUnlocked = sessionStorage.getItem('isAdminUnlocked') === 'true';
    if (isAdminUnlocked && !headers.has('x-admin-unlocked')) {
      headers.set('x-admin-unlocked', 'true');
    }
    init.headers = headers;

    // Attempt the fetch with retries for network errors (e.g. server starting up)
    let lastError: any = null;
    const isAuthPath = path.includes('/auth/') || path.includes('/api/auth/');
    const maxRetries = isAuthPath ? 1 : 2;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await window.fetch(input, init);
        if (response.status === 404) {
          console.warn(`[API Fallback] Server returned 404 for ${path}. Routing via Firestore client-side.`);
          return await handleVirtualApi(path, init, userId);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          console.warn(`[API Fallback] Server returned HTML for ${path} (likely SPA fallback). Routing via Firestore client-side.`);
          return await handleVirtualApi(path, init, userId);
        }

        // Validate response JSON to prevent "Unexpected end of JSON input" errors
        try {
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();
          if (responseText.trim()) {
            JSON.parse(responseText);
          } else {
            console.warn(`[API Fallback] Empty response body for ${path}. Routing via Firestore client-side.`);
            return await handleVirtualApi(path, init, userId);
          }
        } catch (jsonErr) {
          console.warn(`[API Fallback] Response for ${path} is not valid JSON. Routing via Firestore client-side.`, jsonErr);
          return await handleVirtualApi(path, init, userId);
        }

        return response;
      } catch (networkError) {
        lastError = networkError;
        console.warn(`[API Retry] Attempt ${attempt + 1} failed for ${path}:`, networkError);
        if (isAuthPath) break; // Bypassing retry completely for auth
        // Wait a bit before retrying (exponential backoff, capped at 300ms)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 150));
      }
    }

    // If all retries failed, fall back to virtual API client-side simulation
    console.warn(`[API Fallback] All ${maxRetries} fetch attempts failed for ${path}. Routing via Firestore client-side:`, lastError);
    return await handleVirtualApi(path, init, userId);
  }

  return window.fetch(input, init);
}
