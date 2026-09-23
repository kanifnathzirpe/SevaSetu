"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Minimize2, Send, Stethoscope, X, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LOCALES, Locale, useI18n } from "@/lib/i18n";
import {
  VoiceRecorder,
  mapLanguageCode,
  type VoiceRecorderError,
} from "@/lib/speech-to-text";
import { textToSpeech } from "@/lib/text-to-speech";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AssistantState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "processing"
  | "speaking"
  | "error";

interface VoiceAssistantResponse {
  intent: string;
  response_text: string;
  speak_text: string;
  navigation: string | null;
  action: string | null;
  requires_confirmation: boolean;
  confirmation_prompt: string | null;
  data: Record<string, unknown> | null;
}

interface VoiceAssistantI18n {
  title: string;
  statusIdle: string;
  statusRequesting: string;
  statusListening: string;
  statusProcessing: string;
  statusSpeaking: string;
  statusError: string;
  statusReady: string;
  tapToSpeak: string;
  recordingHint: string;
  unsupportedHint: string;
  done: string;
  cancel: string;
  tryAgain: string;
  useTextInput: string;
  stop: string;
  askAnother: string;
  youSaid: string;
  assistant: string;
  exampleCommandsTitle: string;
  inputPlaceholder: string;
  examples: string[];
}

const VOICE_I18N: Record<Locale, VoiceAssistantI18n> = {
  en: {
    title: "SevaSetu Voice Assistant",
    statusIdle: "How can I help you?",
    statusRequesting: "Requesting microphone...",
    statusListening: "Listening...",
    statusProcessing: "Processing...",
    statusSpeaking: "Speaking...",
    statusError: "Error",
    statusReady: "Ready",
    tapToSpeak: "Tap to speak",
    recordingHint: "Listening... Tap stop when done.",
    unsupportedHint: "Voice recording is not supported in this browser. Please use text input below.",
    done: "Done",
    cancel: "Cancel",
    tryAgain: "Try Again",
    useTextInput: "Use Text Input",
    stop: "Stop",
    askAnother: "Ask another question",
    youSaid: "You said:",
    assistant: "Assistant:",
    exampleCommandsTitle: "Example commands:",
    inputPlaceholder: "Type your request here...",
    examples: [
      "Show my reports",
      "What medicines do I take?",
      "Book an appointment",
      "Open my prescriptions",
    ],
  },
  hi: {
    title: "सेवासेतु वॉयस असिस्टेंट",
    statusIdle: "मैं आपकी क्या मदद कर सकता हूँ?",
    statusRequesting: "माइक्रोफ़ोन का अनुरोध किया जा रहा है...",
    statusListening: "सुन रहा हूँ...",
    statusProcessing: "प्रोसेस हो रहा है...",
    statusSpeaking: "बोल रहा हूँ...",
    statusError: "त्रुटि",
    statusReady: "तैयार",
    tapToSpeak: "बोलने के लिए टैप करें",
    recordingHint: "सुन रहा हूँ... पूरा होने पर 'पूरा हुआ' दबाएं।",
    unsupportedHint: "इस ब्राउज़र में वॉइस रिकॉर्डिंग समर्थित नहीं है। कृपया नीचे टेक्स्ट इनपुट का उपयोग करें।",
    done: "पूरा हुआ",
    cancel: "रद्द करें",
    tryAgain: "पुनः प्रयास करें",
    useTextInput: "टेक्स्ट का उपयोग करें",
    stop: "रोकें",
    askAnother: "दूसरा प्रश्न पूछें",
    youSaid: "आपने कहा:",
    assistant: "असिस्टेंट:",
    exampleCommandsTitle: "उदाहरण आदेश:",
    inputPlaceholder: "यहाँ अपना अनुरोध टाइप करें...",
    examples: [
      "मेरी रिपोर्ट दिखाएं",
      "मेरी दवाइयां क्या हैं?",
      "अपॉइंटमेंट बुक करें",
      "मेरे नुस्खे खोलें",
    ],
  },
  mr: {
    title: "सेवासेतू व्हॉइस असिस्टंट",
    statusIdle: "मी तुम्हाला कशी मदत करू शकतो?",
    statusRequesting: "मायक्रोफोनची विनंती केली जात आहे...",
    statusListening: "ऐकत आहे...",
    statusProcessing: "प्रक्रिया सुरू आहे...",
    statusSpeaking: "बोलत आहे...",
    statusError: "त्रुटी",
    statusReady: "तयार",
    tapToSpeak: "बोलण्यासाठी टॅप करा",
    recordingHint: "ऐकत आहे... पूर्ण झाल्यावर 'पूर्ण' वर टॅप करा.",
    unsupportedHint: "या ब्राउझरमध्ये व्हॉइस रेकॉर्डिंग समर्थित नाही. कृपया खाली टेक्स्ट इनपुट वापरा.",
    done: "पूर्ण",
    cancel: "रद्द करा",
    tryAgain: "पुन्हा प्रयत्न करा",
    useTextInput: "टेक्स्ट इनपुट वापरा",
    stop: "थांबवा",
    askAnother: "दुसरा प्रश्न विचारा",
    youSaid: "तुम्ही म्हणालात:",
    assistant: "असिस्टंट:",
    exampleCommandsTitle: "उदाहरणे:",
    inputPlaceholder: "येथे तुमची विनंती टाइप करा...",
    examples: [
      "माझे अहवाल दाखवा",
      "माझी औषधे कोणती आहेत?",
      "अपॉइंटमेंट बुक करा",
      "माझे प्रिस्क्रिप्शन उघडा",
    ],
  },
  bn: {
    title: "সেবাসেতু ভয়েস অ্যাসিস্ট্যান্ট",
    statusIdle: "আমি আপনাকে কিভাবে সাহায্য করতে পারি?",
    statusRequesting: "মাইক্রোফোনের অনুমতি চাওয়া হচ্ছে...",
    statusListening: "শুনছি...",
    statusProcessing: "প্রক্রিয়াধীন...",
    statusSpeaking: "বলছি...",
    statusError: "ত্রুটি",
    statusReady: "প্রস্তুত",
    tapToSpeak: "কথা বলতে ট্যাপ করুন",
    recordingHint: "শুনছি... শেষ হলে 'সম্পন্ন' চাপুন।",
    unsupportedHint: "এই ব্রাউজারে ভয়েস রেকর্ডিং সমর্থিত নয়। অনুগ্রহ করে নিচে টেক্সট লিখুন।",
    done: "সম্পন্ন",
    cancel: "বাতিল",
    tryAgain: "আবার চেষ্টা করুন",
    useTextInput: "টেক্সট ব্যবহার করুন",
    stop: "থামুন",
    askAnother: "আরেকটি প্রশ্ন জিজ্ঞাসা করুন",
    youSaid: "আপনি বলেছেন:",
    assistant: "অ্যাসিস্ট্যান্ট:",
    exampleCommandsTitle: "উদাহরণ কমান্ড:",
    inputPlaceholder: "এখানে আপনার অনুরোধ টাইপ করুন...",
    examples: [
      "আমার রিপোর্ট দেখান",
      "আমার ওষুধ কি কি?",
      "অ্যাপয়েন্টমেন্ট বুক করুন",
      "আমার প্রেসক্রিপশন খুলুন",
    ],
  },
  gu: {
    title: "સેવાસેતુ વૉઇસ આસિસ્ટન્ટ",
    statusIdle: "હું તમને કેવી રીતે મદદ કરી શકું?",
    statusRequesting: "માઇક્રોફોનની વિનંતી કરવામાં આવી રહી છે...",
    statusListening: "સાંભળી રહ્યું છે...",
    statusProcessing: "પ્રક્રિયા થઈ રહી છે...",
    statusSpeaking: "બોલી રહ્યું છે...",
    statusError: "ભૂલ",
    statusReady: "તૈયાર",
    tapToSpeak: "બોલવા માટે ટેપ કરો",
    recordingHint: "સાંભળી રહ્યું છે... પૂર્ણ થાય ત્યારે 'પૂર્ણ' પર ટેપ કરો.",
    unsupportedHint: "આ બ્રાઉઝરમાં વૉઇસ રેકોર્ડિંગ સપોર્ટેડ નથી. કૃપા કરીને નીચે ટેક્સ્ટ ઇનપુટ વાપરો.",
    done: "પૂર્ણ",
    cancel: "રદ કરો",
    tryAgain: "ફરી પ્રયાસ કરો",
    useTextInput: "ટેક્સ્ટ વાપરો",
    stop: "રોકો",
    askAnother: "બીજો પ્રશ્ન પૂછો",
    youSaid: "તમે કહ્યું:",
    assistant: "આસિસ્ટન્ટ:",
    exampleCommandsTitle: "ઉદાહરણ કમાન્ડ:",
    inputPlaceholder: "અહીં તમારી વિનંતી લખો...",
    examples: [
      "મારા રિપોર્ટ બતાવો",
      "મારી દવાઓ કઈ છે?",
      "એપોઇન્ટમેન્ટ બુક કરો",
      "મારા પ્રિસ્ક્રિપ્શન ખોલો",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Dev logging                                                        */
/* ------------------------------------------------------------------ */

const isDev = process.env.NODE_ENV === "development";

function devLog(tag: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`[VOICE_ASSISTANT] ${tag}`, ...args);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VoiceAssistant() {
  const { user } = useAuth();
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [state, setState] = React.useState<AssistantState>("idle");
  const [transcript, setTranscript] = React.useState("");
  const [textInput, setTextInput] = React.useState("");
  const [response, setResponse] = React.useState("");
  const [error, setError] = React.useState("");
  const [isMuted, setIsMuted] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const textInputRef = React.useRef<HTMLInputElement>(null);
  const recorderRef = React.useRef<VoiceRecorder | null>(null);
  const mountedRef = React.useRef(true);

  // Active localized UI strings
  const currentLocaleInfo = LOCALES.find((l) => l.code === locale) || LOCALES[0];
  const currentI18n = VOICE_I18N[locale] || VOICE_I18N.en;

  // Initialize recorder
  React.useEffect(() => {
    recorderRef.current = new VoiceRecorder();

    devLog("init", {
      userPresent: !!user,
      patientId: user?.id,
      locale,
      preferredLanguage: user?.preferred_language,
      mediaRecorderSupported: recorderRef.current.isSupported(),
    });

    return () => {
      mountedRef.current = false;
      recorderRef.current?.cleanup();
      textToSpeech.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up when assistant closes
  React.useEffect(() => {
    if (!open) {
      recorderRef.current?.cancelRecording();
      textToSpeech.stop();
      resetState();
    }
  }, [open]);

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function getLanguage(): string {
    return mapLanguageCode(locale || user?.preferred_language || "en");
  }

  function resetState() {
    setState("idle");
    setTranscript("");
    setTextInput("");
    setResponse("");
    setError("");
    setIsProcessing(false);
  }

  function showError(message: string) {
    setState("error");
    setError(message);
  }

  /* ---------------------------------------------------------------- */
  /*  Voice recording flow                                             */
  /* ---------------------------------------------------------------- */

  async function startRecording() {
    if (isProcessing || state === "recording" || state === "processing") {
      devLog("startRecording", "Blocked — already active");
      return;
    }

    // Cancel any playing TTS
    textToSpeech.stop();
    if (state === "speaking") {
      setState("idle");
    }

    // Clear previous state
    setTranscript("");
    setResponse("");
    setError("");

    const recorder = recorderRef.current;
    if (!recorder) return;

    setState("requesting_permission");

    try {
      await recorder.startRecording(getLanguage());

      if (!mountedRef.current) {
        recorder.cancelRecording();
        return;
      }

      setState("recording");
      devLog("recording:start", "Recording active");
    } catch (err: unknown) {
      if (!mountedRef.current) return;

      const voiceErr = err as VoiceRecorderError;
      devLog("recording:error", voiceErr.code, voiceErr.message);
      showError(voiceErr.message);

      // Auto-recover to idle after 4 seconds for permission/mic errors
      setTimeout(() => {
        if (mountedRef.current && state === "error") {
          setState("idle");
          setError("");
        }
      }, 4000);
    }
  }

  async function stopRecordingAndProcess() {
    const recorder = recorderRef.current;
    if (!recorder || state !== "recording") {
      devLog("stopRecording", "Not recording, ignoring");
      return;
    }

    setState("processing");
    setIsProcessing(true);
    devLog("recording:stop", "Stopping and transcribing");

    try {
      const language = getLanguage();
      const result = await recorder.stopAndTranscribe(language);

      if (!mountedRef.current) return;

      if (!result.success) {
        devLog("stt:error", result.error_code, result.error_message);

        // Aborted requests are silent
        if (result.error_code === "ABORTED") {
          setState("idle");
          setIsProcessing(false);
          return;
        }

        showError(result.error_message || "Voice transcription failed.");
        setIsProcessing(false);
        setTimeout(() => {
          if (mountedRef.current) {
            setState("idle");
            setError("");
          }
        }, 4000);
        return;
      }

      devLog("transcript:received", result.transcript);
      setTranscript(result.transcript);

      // Now process the transcript through the assistant
      await processCommand(result.transcript);
    } catch {
      if (!mountedRef.current) return;
      showError("An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  }

  function cancelRecording() {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.cancelRecording();
    }
    setState("idle");
    setIsProcessing(false);
    devLog("recording:cancel", "Recording cancelled by user");
  }

  /* ---------------------------------------------------------------- */
  /*  Process command (shared by voice and text)                       */
  /* ---------------------------------------------------------------- */

  async function processCommand(text: string) {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setState("processing");
    setTranscript(text);

    devLog("assistant:start", {
      transcript: text.slice(0, 60),
      language: getLanguage(),
      patientId: user?.id,
    });

    try {
      const language = getLanguage();
      const data = await api.post<VoiceAssistantResponse>("/api/v1/voice-assistant/process", {
        text: text.trim(),
        language,
      });

      if (!mountedRef.current) return;

      devLog("assistant:success", {
        intent: data.intent,
        responseLength: data.response_text?.length,
        hasNavigation: !!data.navigation,
      });

      setResponse(data.response_text);

      // Handle navigation
      if (data.navigation) {
        setTimeout(() => {
          router.push(data.navigation!);
        }, 1500);
      }

      // Handle confirmation required
      if (data.requires_confirmation && data.confirmation_prompt) {
        setResponse(data.confirmation_prompt);
      }

      // Speak the response if not muted
      if (!isMuted && data.speak_text) {
        setState("speaking");
        textToSpeech.speak(data.speak_text, language, {
          onStart: () => {
            if (mountedRef.current) setState("speaking");
          },
          onEnd: () => {
            if (mountedRef.current) setState("idle");
          },
          onError: (err) => {
            devLog("tts:error", err);
            if (mountedRef.current) setState("idle");
          },
        });
      } else {
        setState("idle");
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : "Failed to process command";
      devLog("assistant:error", errorMessage);
      showError(errorMessage);
      setTimeout(() => {
        if (mountedRef.current) {
          setState("idle");
          setError("");
        }
      }, 4000);
    } finally {
      setIsProcessing(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Text input                                                       */
  /* ---------------------------------------------------------------- */

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (textInput.trim()) {
      processCommand(textInput);
      setTextInput("");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  TTS controls                                                     */
  /* ---------------------------------------------------------------- */

  function toggleMute() {
    setIsMuted((prev) => {
      if (prev) {
        // Unmuting — if we have a response, speak it
        if (response && state === "idle") {
          const language = getLanguage();
          textToSpeech.speak(response, language, {
            onStart: () => {
              if (mountedRef.current) setState("speaking");
            },
            onEnd: () => {
              if (mountedRef.current) setState("idle");
            },
            onError: () => {
              if (mountedRef.current) setState("idle");
            },
          });
        }
      } else {
        // Muting — stop any current speech (intentional cancel, no error)
        textToSpeech.stop();
        if (state === "speaking") {
          setState("idle");
        }
      }
      return !prev;
    });
  }

  function stopSpeaking() {
    textToSpeech.stop();
    setState("idle");
  }

  /* ---------------------------------------------------------------- */
  /*  Misc handlers                                                    */
  /* ---------------------------------------------------------------- */

  function handleRetry() {
    resetState();
  }

  function handleClose() {
    setOpen(false);
    setMinimized(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  // Voice assistant is only available for patient interface
  if (user?.role !== "patient") return null;

  // Floating button when closed
  if (!open) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-md hover:bg-[var(--primary-dark)] transition-colors cursor-pointer touch-target"
        aria-label="Voice Assistant"
      >
        <Stethoscope className="h-6 w-6" />
      </motion.button>
    );
  }

  const statusText = (() => {
    switch (state) {
      case "idle": return currentI18n.statusIdle;
      case "requesting_permission": return currentI18n.statusRequesting;
      case "recording": return currentI18n.statusListening;
      case "processing": return currentI18n.statusProcessing;
      case "speaking": return currentI18n.statusSpeaking;
      case "error": return currentI18n.statusError;
      default: return currentI18n.statusReady;
    }
  })();

  const isRecorderSupported = recorderRef.current?.isSupported() ?? false;

  // Main panel
  return (
    <AnimatePresence>
      <motion.div
        key="voice-assistant-panel"
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={
          minimized
            ? { opacity: 1, y: 0, scale: 1, height: 56 }
            : { opacity: 1, y: 0, scale: 1, height: "auto" }
        }
        exit={{ opacity: 0, y: 40, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 flex w-[calc(100vw-1.5rem)] sm:w-[390px] max-w-[calc(100vw-1.5rem)] sm:max-w-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        style={{ maxHeight: minimized ? 56 : "min(580px, calc(100vh - 8rem))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--primary)] px-4 py-3 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold leading-tight">{currentI18n.title}</p>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (LOCALES.findIndex((l) => l.code === locale) + 1) % LOCALES.length;
                  setLocale(LOCALES[nextIdx].code);
                }}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors cursor-pointer shrink-0"
                title="Switch Language"
              >
                {currentLocaleInfo.flag} {currentLocaleInfo.label}
              </button>
            </div>
            <p className="text-[11px] leading-tight opacity-80">
              {statusText}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20 cursor-pointer"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized((p) => !p)}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20 cursor-pointer"
            aria-label={minimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {!minimized && (
          <div className="flex flex-col p-4 space-y-4">
            {/* Error state */}
            {state === "error" && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                  >
                    {currentI18n.tryAgain}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setState("idle");
                      setError("");
                      textInputRef.current?.focus();
                    }}
                  >
                    {currentI18n.useTextInput}
                  </Button>
                </div>
              </div>
            )}

            {/* Transcript display */}
            {transcript && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">{currentI18n.youSaid}</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            {/* Response display */}
            {response && !error && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">{currentI18n.assistant}</p>
                <p className="text-sm">{response}</p>
              </div>
            )}

            {/* Voice input button — idle state */}
            {state === "idle" && !isProcessing && !response && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!isRecorderSupported}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)] px-4 py-6 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Mic className="h-5 w-5" />
                  {currentI18n.tapToSpeak}
                </button>
                {!isRecorderSupported && (
                  <p className="text-xs text-center text-[var(--muted-foreground)]">
                    {currentI18n.unsupportedHint}
                  </p>
                )}
              </div>
            )}

            {/* Requesting permission state */}
            {state === "requesting_permission" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  {currentI18n.statusRequesting}
                </p>
              </div>
            )}

            {/* Recording state */}
            {state === "recording" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <Mic className="h-6 w-6 text-white" />
                </motion.div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {currentI18n.recordingHint}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopRecordingAndProcess}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {currentI18n.done}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRecording}
                  >
                    <MicOff className="h-4 w-4 mr-2" />
                    {currentI18n.cancel}
                  </Button>
                </div>
              </div>
            )}

            {/* Processing state */}
            {state === "processing" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-[var(--primary)] border-t-transparent"
                />
                <p className="text-sm text-[var(--muted-foreground)]">{currentI18n.statusProcessing}</p>
              </div>
            )}

            {/* Speaking state */}
            {state === "speaking" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="h-12 w-12 rounded-full bg-[var(--primary)] flex items-center justify-center"
                >
                  <Volume2 className="h-6 w-6 text-white" />
                </motion.div>
                <p className="text-sm text-[var(--muted-foreground)]">{currentI18n.statusSpeaking}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                >
                  <VolumeX className="h-4 w-4 mr-2" />
                  {currentI18n.stop}
                </Button>
              </div>
            )}

            {/* Example commands */}
            {state === "idle" && !isProcessing && !response && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted-foreground)]">{currentI18n.exampleCommandsTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {currentI18n.examples.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => processCommand(cmd)}
                      className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs hover:border-[var(--primary)] transition-colors cursor-pointer"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text input — single instance, always available when idle */}
            {state === "idle" && !isProcessing && (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <Input
                  ref={textInputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={currentI18n.inputPlaceholder}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!textInput.trim() || isProcessing}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Reset button after response */}
            {response && state === "idle" && !isProcessing && (
              <Button
                variant="outline"
                className="w-full"
                onClick={resetState}
              >
                {currentI18n.askAnother}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
