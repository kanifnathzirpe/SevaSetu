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
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
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

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [joined, setJoined] = React.useState(false);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(0);
  const [messages, setMessages] = React.useState<RoomMessage[]>([]);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const { data: session } = useQuery({
    queryKey: ["video", roomId],
    queryFn: () => api.get<VideoSession>(`/api/v1/video/sessions/${roomId}`),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => api.post<VideoSession>(`/api/v1/video/sessions/${roomId}/join`),
    onError: (error: Error) => toast.error(error.message),
  });

  const end = useMutation({
    mutationFn: () => api.post(`/api/v1/video/sessions/${roomId}/end`),
  });

  React.useEffect(() => {
    if (!joined) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [joined]);

  const stopMedia = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => stopMedia, [stopMedia]);

  async function handleJoin() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.warning("Camera or microphone unavailable — joining in audio-only mode");
    }
    await join.mutateAsync().catch(() => undefined);
    setJoined(true);
    toast.success("You have joined the consultation");
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

  async function leave() {
    stopMedia();
    await end.mutateAsync().catch(() => undefined);
    toast.success("Consultation ended");
    router.push(user?.role === "doctor" ? "/doctor/appointments" : "/patient/appointments");
  }

  const otherParty =
    user?.role === "doctor" ? session?.patient_name ?? "Patient" : session?.doctor_name ?? "Doctor";

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#06161a] text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <Badge tone="primary">Room {roomId}</Badge>
          {joined ? <span className="font-mono text-white/70">{clock}</span> : null}
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl bg-black/50">
          {joined ? (
            <>
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-bold">
                  {initials(otherParty)}
                </span>
                <div className="text-center">
                  <p className="text-xl font-semibold">{otherParty}</p>
                  <p className="text-sm text-white/60">
                    {session?.status === "active" ? "Connected · peer stream negotiating over WebRTC" : "Waiting for the other participant…"}
                  </p>
                </div>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute bottom-4 right-4 h-36 w-52 rounded-2xl border border-white/20 object-cover",
                  !camOn && "hidden"
                )}
              />
              {!camOn ? (
                <div className="absolute bottom-4 right-4 flex h-36 w-52 items-center justify-center rounded-2xl border border-white/20 bg-black/70 text-sm text-white/60">
                  Camera off
                </div>
              ) : null}
            </>
          ) : (
            <div className="max-w-md p-8 text-center">
              <h1 className="text-2xl font-bold">Waiting room</h1>
              <p className="mt-2 text-white/70">
                You are about to join a consultation with {otherParty}. Please find a quiet, well-lit place and keep
                your health card handy.
              </p>
              <Button size="lg" className="mt-6" loading={join.isPending} onClick={handleJoin}>
                <VideoIcon className="h-4 w-4" /> Join consultation
              </Button>
              <p className="mt-3 text-xs text-white/50">
                By joining you consent to a teleconsultation as per Telemedicine Practice Guidelines 2020.
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-[420px] flex-col rounded-3xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" /> In-call chat
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
            {messages.length === 0 ? (
              <p className="text-white/50">Messages shared during this consultation appear here.</p>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="rounded-xl bg-white/10 px-3 py-2">
                  <p className="text-xs text-white/60">{message.from}</p>
                  <p>{message.body}</p>
                </div>
              ))
            )}
          </div>
          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              setMessages((previous) => [
                ...previous,
                { from: user?.full_name ?? "You", body: draft.trim(), at: new Date().toISOString() },
              ]);
              setDraft("");
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message…"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
            <Button type="submit" size="icon" aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
        <Button variant={micOn ? "outline" : "danger"} size="icon" onClick={toggleMic} aria-label="Toggle microphone" disabled={!joined}>
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button variant={camOn ? "outline" : "danger"} size="icon" onClick={toggleCam} aria-label="Toggle camera" disabled={!joined}>
          {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Share screen"
          disabled={!joined}
          onClick={() => toast.info("Screen sharing rolls out with the next PHC connectivity upgrade")}
        >
          <MonitorUp className="h-4 w-4" />
        </Button>
        <Button variant="danger" onClick={leave} disabled={!joined}>
          <PhoneOff className="h-4 w-4" /> Leave consultation
        </Button>
      </footer>
    </div>
  );
}
