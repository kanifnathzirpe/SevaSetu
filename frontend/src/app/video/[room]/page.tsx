"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  MonitorUp,
  MessageSquare,
  PhoneOff,
  Send,
  Video as VideoIcon,
  VideoOff,
  Wifi,
  WifiOff
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VideoSession } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

interface RoomMessage {
  from: string;
  body: string;
  at: string;
}

export default function VideoRoomPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const roomId = params.room;

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  
  const streamRef = React.useRef<MediaStream | null>(null);
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const [joined, setJoined] = React.useState(false);
  const [cameraLoading, setCameraLoading] = React.useState(false);
  const [remoteReady, setRemoteReady] = React.useState(false);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(0);
  const [messages, setMessages] = React.useState<RoomMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [networkStatus, setNetworkStatus] = React.useState<"connected" | "disconnected">("connected");
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { data: session } = useQuery({
    queryKey: ["video", roomId],
    queryFn: () => api.get<VideoSession>(`/api/v1/video/sessions/${roomId}`),
    retry: false,
  });

  const joinSession = useMutation({
    mutationFn: () => api.post<VideoSession>(`/api/v1/video/sessions/${roomId}/join`),
    onError: (error: Error) => toast.error(error.message),
  });

  const endSession = useMutation({
    mutationFn: (duration: number) => api.post(`/api/v1/video/sessions/${roomId}/end`, { duration }),
  });

  React.useEffect(() => {
    if (!joined) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [joined]);

  const stopMedia = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => stopMedia();
  }, [stopMedia]);

  const pendingCandidates = React.useRef<RTCIceCandidateInit[]>([]);

  const initWebRTC = async (stream: MediaStream) => {
    console.log("[WebRTC] initWebRTC called");
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    });
    
    peerRef.current = pc;
    
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC] addTrack: ${track.kind}`);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log(`[WebRTC] Generated ICE candidate. Before emit('ice_candidate').`);
        socketRef.current.emit("ice_candidate", {
          room_id: roomId,
          candidate: event.candidate,
        });
        console.log(`[WebRTC] After emit('ice_candidate').`);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote track received: ${event.track.kind}`);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteReady(true);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] connectionState: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setNetworkStatus("disconnected");
        setRemoteReady(false);
      } else if (pc.connectionState === 'connected') {
        setNetworkStatus("connected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] iceConnectionState: ${pc.iceConnectionState}`);
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] signalingState: ${pc.signalingState}`);
    };

    return pc;
  };

  const initSocket = (pc: RTCPeerConnection) => {
    console.log(`[Socket] initSocket called`);
    console.log(`[Socket] Before io()`);
    const socket = io(API_BASE_URL, {
      transports: ["polling", "websocket"], // try polling first, upgrade to websocket - survives Render cold starts/proxies
      withCredentials: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });
    socketRef.current = socket;
    console.log(`[Socket] After io()`);

    console.log(`[Socket] Registering 'connect' listener`);
    socket.on("connect", () => {
      console.log(`[Socket] on('connect') fired. id=${socket.id}, room=${roomId}, user=${user?.full_name}, role=${user?.role}`);
      setNetworkStatus("connected");
      console.log(`[Socket] Before emit('join_room')`);
      socket.emit("join_room", { room_id: roomId, name: user?.full_name });
      console.log(`[Socket] After emit('join_room')`);
    });

    console.log(`[Socket] Registering 'disconnect' listener`);
    socket.on("disconnect", () => {
      console.log(`[Socket] on('disconnect') fired`);
      setNetworkStatus("disconnected");
    });

    console.log(`[Socket] Registering 'user_joined' listener`);
    socket.on("user_joined", async (data: { id: string; name: string }) => {
      console.log(`[Socket] on('user_joined') fired:`, data);
      toast.info(`${data.name} joined the room`);
      try {
        console.log(`[WebRTC] Before pc.createOffer()`);
        const offer = await pc.createOffer();
        console.log(`[WebRTC] After pc.createOffer(). Before pc.setLocalDescription()`);
        await pc.setLocalDescription(offer);
        console.log(`[WebRTC] After pc.setLocalDescription(). Before emit('offer')`);
        socket.emit("offer", { room_id: roomId, offer });
        console.log(`[Socket] After emit('offer')`);
      } catch (err) {
        console.error("[WebRTC] Error in user_joined handler", err);
      }
    });

    console.log(`[Socket] Registering 'offer' listener`);
    socket.on("offer", async (data: { offer: RTCSessionDescriptionInit }) => {
      console.log(`[Socket] on('offer') fired`);
      try {
        console.log(`[WebRTC] Before setRemoteDescription(offer)`);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        console.log(`[WebRTC] After setRemoteDescription(offer). Processing queued ICE...`);
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        pendingCandidates.current = [];

        console.log(`[WebRTC] Before createAnswer()`);
        const answer = await pc.createAnswer();
        console.log(`[WebRTC] After createAnswer(). Before setLocalDescription(answer)`);
        await pc.setLocalDescription(answer);
        console.log(`[WebRTC] After setLocalDescription(answer). Before emit('answer')`);
        socket.emit("answer", { room_id: roomId, answer });
        console.log(`[Socket] After emit('answer')`);
      } catch (err) {
        console.error("[WebRTC] Error in offer handler", err);
      }
    });

    console.log(`[Socket] Registering 'answer' listener`);
    socket.on("answer", async (data: { answer: RTCSessionDescriptionInit }) => {
      console.log(`[Socket] on('answer') fired`);
      try {
        if (pc.signalingState !== "stable") {
          console.log(`[WebRTC] Before setRemoteDescription(answer)`);
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          console.log(`[WebRTC] After setRemoteDescription(answer). Processing queued ICE...`);
          for (const candidate of pendingCandidates.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
          pendingCandidates.current = [];
        } else {
          console.log(`[WebRTC] Ignored answer because signalingState is stable`);
        }
      } catch (err) {
        console.error("[WebRTC] Error in answer handler", err);
      }
    });

    console.log(`[Socket] Registering 'ice_candidate' listener`);
    socket.on("ice_candidate", async (data: { candidate: RTCIceCandidateInit }) => {
      console.log(`[Socket] on('ice_candidate') fired`);
      try {
        if (data.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            console.log(`[WebRTC] Before addIceCandidate() directly`);
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log(`[WebRTC] After addIceCandidate() directly`);
          } else {
            console.log(`[WebRTC] Queuing ICE candidate (no remoteDescription yet)`);
            pendingCandidates.current.push(data.candidate);
          }
        }
      } catch (err) {
        console.error("[WebRTC] Error in ice_candidate handler", err);
      }
    });

    socket.on("chat_message", (data: RoomMessage) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("peer_disconnected", () => {
      console.log(`[Socket] on('peer_disconnected') fired`);
      toast.warning("The other participant disconnected");
      setRemoteReady(false);
      setNetworkStatus("disconnected");
    });
    
    console.log(`[Socket] All listeners registered successfully`);
  };

  async function handleJoin() {
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      
      streamRef.current = stream;
      await joinSession.mutateAsync().catch(() => undefined);
      setJoined(true);
      
      setTimeout(async () => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(console.error);
        }
        
        const pc = await initWebRTC(stream);
        initSocket(pc);
      }, 100);
      
      setCamOn(true);
      setMicOn(true);
      toast.success("Joined consultation");
      
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error("Camera error: " + errMsg);
      setCameraLoading(false);
    }
  }

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = next));
  }

  function toggleCam() {
    const next = !camOn;
    setCamOn(next);
    streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = next));
  }
  
  async function toggleScreenShare() {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = displayStream.getVideoTracks()[0];
      
      const sender = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }
      
      videoTrack.onended = () => {
        const camTrack = streamRef.current?.getVideoTracks()[0];
        if (sender && camTrack) sender.replaceTrack(camTrack);
        if (localVideoRef.current && streamRef.current) localVideoRef.current.srcObject = streamRef.current;
      };
      
      toast.success("Screen sharing started");
    } catch {
      toast.error("Screen sharing cancelled or not supported");
    }
  }

  async function leave() {
    const duration = elapsed;
    stopMedia();
    await endSession.mutateAsync(duration).catch(() => undefined);
    toast.success("Consultation ended");
    router.push(user?.role === "doctor" ? "/doctor/appointments" : "/patient/appointments");
  }

  const otherParty =
    user?.role === "doctor" ? session?.patient_name ?? "Patient" : session?.doctor_name ?? "Doctor";

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#06161a] text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 sm:px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <Badge tone={networkStatus === "connected" ? "success" : "danger"} className="text-xs">
            {networkStatus === "connected" ? <Wifi className="mr-1 h-3 w-3 inline" /> : <WifiOff className="mr-1 h-3 w-3 inline" />}
            <span className="hidden xs:inline">{networkStatus === "connected" ? "Connected" : "Reconnecting"}</span>
          </Badge>
          {joined ? <span className="font-mono text-xs sm:text-sm text-white/70">{clock}</span> : null}
        </div>
      </header>

      <div className="relative flex-1 grid gap-4 p-2 sm:p-4 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Main Video Stage */}
        <div className="relative flex min-h-[360px] sm:min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl bg-black">
          {joined ? (
            <div className="relative h-full w-full p-2 sm:p-4 md:grid md:grid-cols-2 md:gap-4">
              {/* Local Video Tile (Floating PiP on mobile, 50% split on desktop) */}
              <div className={cn(
                "absolute top-3 right-3 z-20 w-28 h-36 sm:w-36 sm:h-44 md:static md:w-full md:h-full md:z-auto",
                "flex items-center justify-center overflow-hidden rounded-xl md:rounded-2xl border border-white/20 bg-[#111] shadow-2xl transition-all"
              )}>
                <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 rounded-lg md:rounded-xl bg-black/70 px-2 py-1 md:px-3 md:py-2 backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/80">{user?.role === 'doctor' ? 'Doctor' : 'Patient'}</p>
                  <p className="text-xs md:text-sm font-medium truncate max-w-[80px] md:max-w-none">{user?.full_name ?? "You"}</p>
                </div>
                
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn("h-full w-full object-cover transition-opacity duration-300", !camOn ? "opacity-0" : "opacity-100")}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                    <div className="flex h-10 w-10 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/10">
                      <span className="text-sm md:text-xl font-bold">{initials(user?.full_name ?? "You")}</span>
                    </div>
                    <p className="mt-1 md:mt-3 text-xs md:text-sm font-medium">{user?.full_name ?? "You"}</p>
                    <p className="mt-0.5 md:mt-1 flex items-center gap-1 text-[10px] md:text-xs text-white/50">
                      <VideoOff className="h-3 w-3 md:h-3.5 md:w-3.5" /> Off
                    </p>
                  </div>
                )}
              </div>

              {/* Remote Video Tile (Full screen on mobile, 50% split on desktop) */}
              <div className="relative h-full w-full flex items-center justify-center overflow-hidden rounded-xl md:rounded-2xl border border-white/10 bg-[#111]">
                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 rounded-lg md:rounded-xl bg-black/70 px-2.5 py-1.5 md:px-3 md:py-2 backdrop-blur-md">
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/80">{user?.role === 'doctor' ? 'Patient' : 'Doctor'}</p>
                  <p className="text-xs md:text-sm font-medium">{otherParty}</p>
                </div>
                
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={cn("h-full w-full object-cover transition-opacity duration-300", remoteReady ? "opacity-100" : "opacity-0")}
                />
                
                {!remoteReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] p-4 text-center">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/5">
                      <span className="text-lg md:text-xl font-bold">{initials(otherParty)}</span>
                    </div>
                    <p className="mt-2 md:mt-3 text-sm md:text-base font-medium">{otherParty}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <p className="text-xs text-white/60">Waiting for participant to join...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-md p-4 sm:p-8 text-center">
              <h1 className="text-xl sm:text-2xl font-bold">Waiting room</h1>
              <p className="mt-2 text-xs sm:text-sm text-white/70">
                You are about to join a consultation with {otherParty}. Please find a quiet, well-lit place and keep
                your health card handy.
              </p>
              <Button size="lg" className="mt-6 w-full sm:w-auto min-h-[48px]" loading={cameraLoading} onClick={handleJoin} disabled={cameraLoading}>
                <VideoIcon className="h-4 w-4" /> {cameraLoading ? "Enabling camera..." : "Join consultation"}
              </Button>
              {cameraLoading && (
                <p className="mt-3 text-xs text-white/60">
                  Please allow camera access when prompted by your browser...
                </p>
              )}
              <p className="mt-3 text-[10px] sm:text-xs text-white/50">
                By joining you consent to a teleconsultation as per Telemedicine Practice Guidelines 2020.
              </p>
            </div>
          )}
        </div>

        {/* In-call Chat Panel (Slide-up sheet on mobile, sidebar on desktop) */}
        <div className={cn(
          "flex flex-col rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0c2228] transition-all",
          "lg:static lg:flex lg:h-auto lg:min-h-[420px]",
          mobileChatOpen
            ? "fixed inset-x-2 bottom-20 top-20 z-30 shadow-2xl flex"
            : "hidden lg:flex"
        )}>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> In-call chat
            </div>
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              className="lg:hidden p-1 text-white/60 hover:text-white"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
            {messages.length === 0 ? (
              <p className="text-white/50 text-center mt-4">Messages shared during this consultation appear here.</p>
            ) : (
              messages.map((message, index) => {
                const isMe = message.from === user?.full_name;
                return (
                  <div key={index} className={cn("rounded-xl px-3 py-2 max-w-[90%]", isMe ? "bg-[var(--primary)] ml-auto" : "bg-white/10 mr-auto")}>
                    {!isMe && <p className="text-[10px] font-semibold text-white/60 mb-1">{message.from}</p>}
                    <p className="break-words">{message.body}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim() || !socketRef.current) return;
              
              const msg: RoomMessage = {
                from: user?.full_name ?? "You",
                body: draft.trim(),
                at: new Date().toISOString(),
              };
              
              socketRef.current.emit("chat_message", { room_id: roomId, ...msg });
              setMessages((prev) => [...prev, msg]);
              setDraft("");
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message…"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
              disabled={!joined}
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={!joined || !draft.trim()} className="shrink-0 touch-target">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Fixed Call Controls Footer */}
      <footer className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 border-t border-white/10 px-3 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#06161a]/95 backdrop-blur-lg">
        <Button variant={micOn ? "outline" : "danger"} size="icon" onClick={toggleMic} aria-label="Toggle microphone" disabled={!joined} className="h-12 w-12 rounded-full sm:rounded-xl touch-target">
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button variant={camOn ? "outline" : "danger"} size="icon" onClick={toggleCam} aria-label="Toggle camera" disabled={!joined} className="h-12 w-12 rounded-full sm:rounded-xl touch-target">
          {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Share screen"
          disabled={!joined}
          onClick={toggleScreenShare}
          className="h-12 w-12 rounded-full sm:rounded-xl touch-target hidden sm:inline-flex"
        >
          <MonitorUp className="h-5 w-5" />
        </Button>
        {/* Mobile Chat Toggle Button */}
        <Button
          variant={mobileChatOpen ? "default" : "outline"}
          size="icon"
          aria-label="Toggle in-call chat"
          disabled={!joined}
          onClick={() => setMobileChatOpen((prev) => !prev)}
          className="lg:hidden relative h-12 w-12 rounded-full touch-target"
        >
          <MessageSquare className="h-5 w-5" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white">
              {messages.length}
            </span>
          )}
        </Button>
        <Button variant="danger" onClick={leave} disabled={!joined} className="h-12 px-4 sm:px-6 rounded-full sm:rounded-xl touch-target font-semibold">
          <PhoneOff className="h-5 w-5 sm:mr-1.5" /> <span className="hidden sm:inline">Leave consultation</span>
        </Button>
      </footer>
    </div>
  );
}