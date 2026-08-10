import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Wifi, WifiOff, Minimize2, Image as ImageIcon, Headphones } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, clientQuotaExceeded, isQuotaError, setClientQuotaExceeded } from '../lib/firebase';
import { VoiceCall, User } from '../types';
import { acceptVoiceCall, rejectVoiceCall, endVoiceCall, subscribeToCallState, fetchAgoraToken } from '../services/callService';
import { sendFirestoreMessage } from '../services/chatService';
import { VerificationBadge } from './VerificationBadge';

interface VoiceCallModalProps {
  call: VoiceCall;
  currentUser: User;
  onClose: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  call,
  currentUser,
  onClose,
}) => {
  const isIncoming = call.receiverId === currentUser.id && call.status === 'ringing';
  const isOutgoing = call.callerId === currentUser.id && call.status === 'ringing';

  const [callState, setCallState] = useState<VoiceCall>(call);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMode, setIsSpeakerMode] = useState(true); // loudspeaker mode is on by default
  const [callDuration, setCallDuration] = useState(0);
  const [rtcConnectionState, setRtcConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTING');
  const [joinedRtc, setJoinedRtc] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const timerRef = useRef<any>(null);
  const ringAudioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);
  const hasLoggedCallRef = useRef(false);
  const durationRef = useRef(0);
  const isSpeakerModeRef = useRef(isSpeakerMode);

  useEffect(() => {
    isSpeakerModeRef.current = isSpeakerMode;
  }, [isSpeakerMode]);

  useEffect(() => {
    durationRef.current = callDuration;
  }, [callDuration]);

  const otherName = currentUser.id === call.callerId ? call.receiverName || 'Match' : call.callerName;
  const otherAvatar = currentUser.id === call.callerId ? call.receiverAvatar || '' : call.callerAvatar;

  // Function to log call history details to Chat Room
  const logCallMessage = async (finalStatus: string, finalDuration: number) => {
    if (hasLoggedCallRef.current) return;
    if (currentUser.id !== call.callerId) return; // Only caller writes log message to prevent duplicates

    hasLoggedCallRef.current = true;

    try {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const dateObj = new Date();
      const day = dateObj.getDate();
      const month = months[dateObj.getMonth()];
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strMinutes = minutes < 10 ? '0' + minutes : minutes;
      const formattedTime = `${day} ${month}, ${hours}:${strMinutes} ${ampm}`;

      let msgContent = '';
      if (finalStatus === 'rejected') {
        msgContent = `📞 Missed voice call on ${formattedTime}`;
      } else if (finalStatus === 'ended' || finalStatus === 'timeout') {
        if (finalDuration > 0) {
          const mins = Math.floor(finalDuration / 60);
          const secs = finalDuration % 60;
          const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          msgContent = `📞 Voice Call - Answered. Duration: ${durationStr} on ${formattedTime}`;
        } else {
          msgContent = `📞 Missed voice call on ${formattedTime}`;
        }
      } else {
        msgContent = `📞 Missed voice call on ${formattedTime}`;
      }

      await sendFirestoreMessage(
        call.matchId,
        call.callerId,
        call.receiverId,
        msgContent
      );
    } catch (err) {
      console.error('Error logging call message to chat:', err);
    }
  };

  // Listen for target user's details in real-time
  useEffect(() => {
    if (clientQuotaExceeded || !db) return;
    const otherId = currentUser.id === call.callerId ? call.receiverId : call.callerId;
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'users', otherId),
        (docSnap) => {
          if (docSnap.exists()) {
            setOtherUser(docSnap.data() as User);
          }
        },
        (error) => {
          if (isQuotaError(error)) {
            setClientQuotaExceeded(true);
          }
          console.warn('VoiceCallModal onSnapshot users error:', error);
        }
      );
      return unsubscribe;
    } catch (e: any) {
      if (isQuotaError(e)) {
        setClientQuotaExceeded(true);
      }
      console.warn('VoiceCallModal onSnapshot users setup error:', e);
    }
  }, [call, currentUser]);

  // Listen for call state updates (accepted/rejected/ended)
  useEffect(() => {
    const unsubscribe = subscribeToCallState(call.id, (updatedCall) => {
      setCallState(updatedCall);

      if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
        stopRingtone();
        cleanupRtc();
        
        // Log call to chat instantly in real-time
        logCallMessage(updatedCall.status, durationRef.current);

        setTimeout(() => {
          onClose();
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
      stopRingtone();
      cleanupRtc();
    };
  }, [call.id]);

  // Handle incoming/outgoing ringtone synth
  useEffect(() => {
    if (callState.status === 'ringing') {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [callState.status]);

  // Handle Timer when call is accepted
  useEffect(() => {
    if (callState.status === 'accepted') {
      stopRingtone();
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
      initRtcSession();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState.status]);

  // 30 Seconds Ringing Timeout for Unanswered / Offline Users
  useEffect(() => {
    if (callState.status === 'ringing' && isOutgoing) {
      const ringingTimeout = setTimeout(async () => {
        stopRingtone();
        cleanupRtc();
        await endVoiceCall(call.id);
        logCallMessage('ended', 0);
        onClose();
      }, 30000); // 30 seconds limit

      return () => clearTimeout(ringingTimeout);
    }
  }, [callState.status, isOutgoing]);

  // Web Audio Ringtone Synthesizer
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringAudioContextRef.current = ctx;

      const playChime = () => {
        if (!ctx || ctx.state === 'closed') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      };

      playChime();
      ringIntervalRef.current = setInterval(playChime, 2500);
    } catch (e) {
      console.warn('Ringtone sound init error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (ringAudioContextRef.current && ringAudioContextRef.current.state !== 'closed') {
      ringAudioContextRef.current.close().catch(() => {});
    }
  };

  // Initialize Agora RTC Session
  const initRtcSession = async () => {
    if (joinedRtc) return;
    try {
      const numericUid = Math.floor(Math.random() * 899999) + 100000;
      const tokenRes = await fetchAgoraToken(callState.channelName, numericUid);

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = client;

      // Track connection state for reconnection support
      client.on('connection-state-change', (curState) => {
        if (curState === 'CONNECTED') setRtcConnectionState('CONNECTED');
        else if (curState === 'RECONNECTING') setRtcConnectionState('RECONNECTING');
        else if (curState === 'DISCONNECTED') setRtcConnectionState('DISCONNECTED');
        else if (curState === 'CONNECTING') setRtcConnectionState('CONNECTING');
      });

      // Remote audio track subscribe
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
          
          // Apply current speaker mode (volume and physical routing)
          const speakerMode = isSpeakerModeRef.current;
          user.audioTrack.setVolume(speakerMode ? 100 : 15);
          
          try {
            const devices = await AgoraRTC.getPlaybackDevices();
            let targetDevice = null;
            if (speakerMode) {
              targetDevice = devices.find(d => 
                d.label.toLowerCase().includes('speaker') || 
                d.label.toLowerCase().includes('loudspeaker') || 
                d.label.toLowerCase().includes('built-in')
              );
            } else {
              targetDevice = devices.find(d => 
                d.label.toLowerCase().includes('earpiece') || 
                d.label.toLowerCase().includes('handset') || 
                d.label.toLowerCase().includes('receiver') || 
                d.label.toLowerCase().includes('headphone') || 
                d.label.toLowerCase().includes('headset') || 
                d.label.toLowerCase().includes('earphone')
              );
            }
            const trackAny = user.audioTrack as any;
            if (targetDevice && trackAny && typeof trackAny.setPlaybackDevice === 'function') {
              await trackAny.setPlaybackDevice(targetDevice.deviceId);
              console.log(`Initial audio routed to: ${targetDevice.label}`);
            }
          } catch (e) {
            console.warn('Initial playback device set failed:', e);
          }
        }
      });

      const localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localTrack;

      const appId = tokenRes.appId || 'a1b2c3d4e5f678901234567890abcdef';
      await client.join(appId, callState.channelName, tokenRes.token || null, numericUid);
      await client.publish([localTrack]);

      setJoinedRtc(true);
      setRtcConnectionState('CONNECTED');
    } catch (err) {
      console.error('Error joining Agora RTC voice channel:', err);
    }
  };

  const cleanupRtc = () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (rtcClientRef.current) {
        rtcClientRef.current.leave().catch(() => {});
        rtcClientRef.current = null;
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAccept = async () => {
    stopRingtone();
    await acceptVoiceCall(call.id);
  };

  const handleReject = async () => {
    stopRingtone();
    await rejectVoiceCall(call.id);
    onClose();
  };

  const handleHangup = async () => {
    stopRingtone();
    cleanupRtc();
    await endVoiceCall(call.id);
    logCallMessage('ended', durationRef.current);
    onClose();
  };

  const toggleMute = async () => {
    if (localAudioTrackRef.current) {
      const nextMute = !isMuted;
      try {
        // Agora RTC standard mute is setEnabled(false) to stop sending audio data
        await localAudioTrackRef.current.setEnabled(!nextMute);
        
        // Secondary measure: adjust physical audio track volume to 0 (muted) or 100 (unmuted)
        if (typeof localAudioTrackRef.current.setVolume === 'function') {
          localAudioTrackRef.current.setVolume(nextMute ? 0 : 100);
        }
        
        setIsMuted(nextMute);
        console.log(`Microphone mute state toggled. Muted: ${nextMute}`);
      } catch (e) {
        console.warn('Mute action via setEnabled failed, attempting volume-only fallback:', e);
        try {
          if (typeof localAudioTrackRef.current.setVolume === 'function') {
            localAudioTrackRef.current.setVolume(nextMute ? 0 : 100);
          }
          setIsMuted(nextMute);
        } catch (err) {
          console.error('Mute action fallback failed too:', err);
        }
      }
    } else {
      console.warn('Cannot toggle mute: Local audio track is not initialized.');
    }
  };

  const toggleSpeakerMode = async () => {
    const nextVal = !isSpeakerMode;
    setIsSpeakerMode(nextVal);
    
    if (rtcClientRef.current) {
      for (const user of rtcClientRef.current.remoteUsers) {
        if (user.audioTrack) {
          user.audioTrack.setVolume(nextVal ? 100 : 15);
          try {
            const devices = await AgoraRTC.getPlaybackDevices();
            let targetDevice = null;
            if (nextVal) {
              targetDevice = devices.find(d => 
                d.label.toLowerCase().includes('speaker') || 
                d.label.toLowerCase().includes('loudspeaker') || 
                d.label.toLowerCase().includes('built-in')
              );
            } else {
              targetDevice = devices.find(d => 
                d.label.toLowerCase().includes('earpiece') || 
                d.label.toLowerCase().includes('handset') || 
                d.label.toLowerCase().includes('receiver') || 
                d.label.toLowerCase().includes('headphone') || 
                d.label.toLowerCase().includes('headset') || 
                d.label.toLowerCase().includes('earphone')
              );
            }
            const trackAny = user.audioTrack as any;
            if (targetDevice && trackAny && typeof trackAny.setPlaybackDevice === 'function') {
              await trackAny.setPlaybackDevice(targetDevice.deviceId);
              console.log(`Audio dynamically routed to: ${targetDevice.label}`);
            }
          } catch (e) {
            console.warn('Dynamic playback device routing change failed:', e);
          }
        }
      }
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getStatusText = () => {
    if (callState.status === 'ringing') {
      if (isIncoming) {
        return 'Incoming Voice Call';
      } else {
        if (otherUser && otherUser.isOnline) {
          return 'Ringing...';
        }
        return 'Calling...';
      }
    }
    if (callState.status === 'accepted') {
      return 'Voice Call Active';
    }
    if (callState.status === 'rejected') {
      return 'Call Declined';
    }
    if (callState.status === 'ended') {
      return 'Call Ended';
    }
    return 'Connecting...';
  };

  // RENDER MINIMIZED WIDGET
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-4 z-[9999] bg-[#4c4a3b] border-2 border-white/20 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all animate-pulse-subtle"
        id="minimized-voice-call-bubble"
      >
        <div className="relative">
          <img
            src={otherAvatar || 'https://via.placeholder.com/150'}
            alt={otherName}
            className="w-10 h-10 rounded-xl object-cover border border-white/30 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-[#4c4a3b]" />
        </div>
        <div className="text-left select-none">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-white max-w-[80px] truncate">{otherName}</span>
            {otherUser?.verified && <VerificationBadge size={12} />}
          </div>
          <p className="text-[10px] text-rose-300 font-extrabold font-mono">
            {callState.status === 'accepted' ? formatTimer(callDuration) : 'Calling...'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleHangup();
          }}
          className="w-8 h-8 bg-rose-600 rounded-xl flex items-center justify-center text-white hover:bg-rose-500 transition shadow active:scale-90 cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // RENDER FULL-SCREEN BEAUTIFUL MODE
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-[#0a1219] text-center text-white select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between w-full pt-4 shrink-0 px-2 z-20">
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95 cursor-pointer animate-[pulse_2s_infinite]"
          title="Minimize Call (মিনিমাইজ করুন)"
        >
          <Minimize2 className="w-6 h-6 rotate-90" />
        </button>

        {/* Emptied as requested (No user icons or 3 dots here) */}
        <div className="w-12 h-12" />
      </div>

      {/* Main Center Profile Area (Shifted to the upper side as requested) */}
      <div className="flex flex-col items-center justify-start mt-12 mb-auto space-y-5 flex-grow z-10">
        <div className="relative inline-block">
          {callState.status === 'ringing' && (
            <>
              <span className="absolute -inset-4 rounded-full bg-white/10 animate-ping duration-1000" />
              <span className="absolute -inset-8 rounded-full bg-white/5 animate-pulse duration-1500" />
            </>
          )}
          <img
            src={otherAvatar || 'https://via.placeholder.com/150'}
            alt={otherName}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-white/20 shadow-2xl relative z-10 mx-auto"
            referrerPolicy="no-referrer"
          />
        </div>

        <div>
          {/* Single line name with verification badge */}
          <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold tracking-wide text-white mb-1.5">
            <span>{otherName}</span>
            {otherUser?.verified && <VerificationBadge size={22} />}
          </div>

          {/* Context subtext / subtitle - e.g. "True Love Connect voice call" or active status */}
          {callState.status === 'ringing' && isIncoming ? (
            <p className="text-sm text-[#8696a0] font-normal tracking-wide">
              True Love Connect voice call
            </p>
          ) : (
            <p className="text-sm text-[#8696a0] font-normal tracking-wide">
              {getStatusText()}
            </p>
          )}

          {/* Connected timer for active call */}
          {callState.status === 'accepted' && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/35 border border-white/10 shadow text-xs font-mono font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Panel */}
      {callState.status === 'ringing' && isIncoming ? (
        <div className="flex items-end justify-between w-full px-10 pb-16 shrink-0 z-10">
          
          {/* Decline Button (Left side) */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ea0038] hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/40 transition-all active:scale-90 cursor-pointer"
              title="Decline Call (প্রত্যাখ্যান)"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-slate-300 font-medium">Decline</span>
          </div>
          
          {/* Swipe up to Accept (Center side, higher and with chevrons) */}
          <div className="flex flex-col items-center relative -mt-16">
            
            {/* Animated Carets pointing upwards */}
            <div className="flex flex-col items-center gap-1 mb-3 animate-bounce">
              <span className="text-emerald-400 text-xs font-black select-none">▲</span>
              <span className="text-emerald-400/70 text-xs font-black -mt-1 select-none">▲</span>
            </div>

            <motion.button
              drag="y"
              dragConstraints={{ top: -140, bottom: 0 }}
              dragElastic={{ top: 0.2, bottom: 0.1 }}
              onDragEnd={(event, info) => {
                if (info.offset.y < -55) {
                  handleAccept();
                }
              }}
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#1fa855] hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-grab active:cursor-grabbing relative z-10"
              title="Swipe up or tap to accept (রিসিভ করুন)"
            >
              <Phone className="w-7 h-7" />
            </motion.button>
            <span className="text-xs text-slate-300 font-medium mt-2">Swipe up to accept</span>
          </div>

          {/* Right side placeholder (Message button omitted as requested) */}
          <div className="w-14 sm:w-16" />

        </div>
      ) : (
        <div className="flex items-center justify-center gap-10 pb-16 shrink-0 z-10">
          
          {/* Mic Mute Button */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {isMuted && (
                <div className="absolute -inset-1 rounded-full border border-dashed border-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              )}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer relative z-10 ${
                  isMuted
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title={isMuted ? 'Unmute Mic (মাইক্রোফোন চালু করুন)' : 'Mute Mic (মাইক্রোফোন বন্ধ করুন)'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </div>

          {/* Speaker / Headphone Mode toggle */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {!isSpeakerMode && (
                <div className="absolute -inset-1 rounded-full border border-dashed border-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              )}
              <button
                type="button"
                onClick={toggleSpeakerMode}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer relative z-10 ${
                  isSpeakerMode
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
                title={isSpeakerMode ? 'Switch to Headphone/Earpiece Mode (কানের হেডফোন অপশন)' : 'Switch to Speaker Mode (স্পিকার বড় মাইক অপশন)'}
              >
                {isSpeakerMode ? <Volume2 className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
              </button>
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {isSpeakerMode ? 'Speaker' : 'Headphone'}
            </span>
          </div>

          {/* Red End Call Button */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={handleHangup}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ea0038] hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all active:scale-90 cursor-pointer relative z-10"
                title="End Call (কল কাটুন)"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
            <span className="text-xs text-slate-300 font-medium">End</span>
          </div>

        </div>
      )}

    </div>
  );
};
