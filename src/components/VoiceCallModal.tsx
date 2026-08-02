import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Phone, PhoneOff, Mic, MicOff, Volume2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { VoiceCall, User } from '../types';
import { acceptVoiceCall, rejectVoiceCall, endVoiceCall, subscribeToCallState, fetchAgoraToken } from '../services/callService';

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
  const [callDuration, setCallDuration] = useState(0);
  const [rtcConnectionState, setRtcConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'CONNECTING'>('CONNECTING');
  const [joinedRtc, setJoinedRtc] = useState(false);

  const rtcClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const timerRef = useRef<any>(null);
  const ringAudioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  const otherName = currentUser.id === call.callerId ? call.receiverName || 'Match' : call.callerName;
  const otherAvatar = currentUser.id === call.callerId ? call.receiverAvatar || '' : call.callerAvatar;

  // Listen for call state updates (accepted/rejected/ended)
  useEffect(() => {
    const unsubscribe = subscribeToCallState(call.id, (updatedCall) => {
      setCallState(updatedCall);

      if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
        stopRingtone();
        cleanupRtc();
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

  // Handle incoming call ringtone synth
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
        if (mediaType === 'audio') {
          user.audioTrack?.play();
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
    onClose();
  };

  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const nextMute = !isMuted;
      localAudioTrackRef.current.setEnabled(!nextMute);
      setIsMuted(nextMute);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 text-center text-white shadow-2xl overflow-hidden">
        
        {/* Connection Status Badge */}
        {callState.status === 'accepted' && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[10px] font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              {rtcConnectionState === 'CONNECTED' && <Wifi className="w-3 h-3 text-emerald-400" />}
              {rtcConnectionState === 'RECONNECTING' && <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />}
              {rtcConnectionState === 'CONNECTING' && <Wifi className="w-3 h-3 text-sky-400 animate-pulse" />}
              {rtcConnectionState === 'CONNECTED' ? 'Encrypted HD Voice' : rtcConnectionState}
            </span>
            <span className="text-rose-400 font-mono font-bold">{formatTimer(callDuration)}</span>
          </div>
        )}

        {/* Member Avatar with Pulse Animation */}
        <div className="mt-8 mb-6 relative inline-block">
          {callState.status === 'ringing' && (
            <>
              <span className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping" />
              <span className="absolute -inset-8 rounded-full bg-rose-500/10 animate-pulse" />
            </>
          )}
          <img
            src={otherAvatar}
            alt={otherName}
            className="w-28 h-28 rounded-full object-cover border-4 border-rose-500/80 shadow-2xl relative z-10 mx-auto"
          />
        </div>

        {/* Member Info & Call Status Label */}
        <h3 className="text-xl font-extrabold tracking-tight text-white mb-1">
          {otherName}
        </h3>

        <p className="text-xs text-slate-400 mb-8 font-medium">
          {callState.status === 'ringing' && isIncoming && 'Incoming Voice Call...'}
          {callState.status === 'ringing' && isOutgoing && 'Calling Match...'}
          {callState.status === 'accepted' && 'Voice Call Active'}
          {callState.status === 'rejected' && 'Call Declined'}
          {callState.status === 'ended' && 'Call Ended'}
        </p>

        {/* Controls Bar */}
        {callState.status === 'ringing' && isIncoming ? (
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={handleReject}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={handleAccept}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all transform active:scale-95 animate-bounce"
              title="Accept Call"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        ) : callState.status === 'ringing' && isOutgoing ? (
          <div className="flex justify-center">
            <button
              onClick={handleHangup}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
              title="Cancel Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        ) : callState.status === 'accepted' ? (
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={handleHangup}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
};
