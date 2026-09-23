/**
 * Voice Recorder Service — Browser Web Speech API
 *
 * Uses the browser's built-in SpeechRecognition API for real-time
 * speech-to-text. No backend API key or server round-trip needed.
 *
 * Supported browsers: Chrome, Edge, Safari (partial), Android WebView.
 * Not supported: Firefox (falls back to text input).
 *
 * Flow: SpeechRecognition → real-time transcript (all client-side)
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type RecorderState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "processing"
  | "error";

export interface VoiceRecorderError {
  code: string;
  message: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcript: string;
  language: string;
  error_code?: string | null;
  error_message?: string | null;
}

// Re-export for backward compatibility with voice-assistant.tsx
export type SpeechRecognitionError = VoiceRecorderError;

/* ------------------------------------------------------------------ */
/*  Error codes → user-friendly messages                               */
/* ------------------------------------------------------------------ */

const ERROR_MESSAGES: Record<string, string> = {
  MIC_PERMISSION_DENIED:
    "Microphone access is required for voice input. Please allow microphone access in your browser settings.",
  MIC_NOT_AVAILABLE:
    "No microphone was found. Please connect a microphone and try again.",
  AUDIO_RECORDING_FAILED: "Voice recording failed. Please try again.",
  AUDIO_EMPTY: "I didn't hear anything. Please try again.",
  STT_FAILED:
    "Sorry, I couldn't understand that. Please try again or use text input.",
  STT_NETWORK_ERROR:
    "I couldn't connect to the voice service. Please check your internet connection.",
  STT_NOT_CONFIGURED:
    "Voice transcription service is not configured. Please use text input.",
  ASSISTANT_AUTH_ERROR: "Please log in again to use the voice assistant.",
  ASSISTANT_TIMEOUT:
    "Voice processing is taking longer than expected. Please try again.",
  SPEECH_NOT_SUPPORTED:
    "Voice recognition is not supported in this browser. Please use Chrome or Edge, or use text input.",
  SPEECH_BLOCKED:
    "Voice recognition is blocked by your browser's privacy settings. Please use Chrome or Edge, or use text input below.",
  MEDIARECORDER_NOT_SUPPORTED:
    "Voice recording is not supported in this browser. Please use text input.",
  UNKNOWN: "An unexpected error occurred. Please try again.",
};

function getUserMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES["UNKNOWN"];
}

/* ------------------------------------------------------------------ */
/*  Language mapping                                                    */
/* ------------------------------------------------------------------ */

const LANGUAGE_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
};

/** Map a locale code (e.g. "en", "hi") to a BCP-47 tag for STT/TTS */
export function mapLanguageCode(locale: string): string {
  if (locale.includes("-")) return locale; // already BCP-47 (e.g. "en-IN")
  return LANGUAGE_MAP[locale] || "en-IN";
}

/* ------------------------------------------------------------------ */
/*  Dev logging helper                                                 */
/* ------------------------------------------------------------------ */

const isDev = process.env.NODE_ENV === "development";

function devLog(tag: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`[VOICE] ${tag}`, ...args);
  }
}

/* ------------------------------------------------------------------ */
/*  Browser SpeechRecognition API access                               */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/* ------------------------------------------------------------------ */
/*  VoiceRecorder class                                                */
/* ------------------------------------------------------------------ */

export class VoiceRecorder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private _state: RecorderState = "idle";
  private _isMounted = true;
  private accumulatedTranscript = "";
  private language = "en-IN";

  /** Set when stop() is called intentionally — suppresses auto-restart */
  private intentionalStop = false;

  /** Stores error code from mid-recording failures (e.g. Brave blocking network) */
  private recordingError: string | null = null;

  /** Promise resolve for stopAndTranscribe */
  private pendingResolve: ((result: TranscriptionResult) => void) | null =
    null;

  /** Whether the startRecording promise has been settled */
  private startSettled = false;

  get state(): RecorderState {
    return this._state;
  }

  /** Check if the browser's SpeechRecognition API is available */
  isSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
  }

  /**
   * Start listening for speech via the browser SpeechRecognition API.
   *
   * @param language BCP-47 language code (e.g. "en-IN", "hi-IN")
   * @returns Promise that resolves when recognition starts
   */
  async startRecording(language: string = "en-IN"): Promise<void> {
    if (this._state === "recording" || this._state === "processing") {
      devLog("startRecording", "Already recording or processing, ignoring");
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      throw this.createError("SPEECH_NOT_SUPPORTED");
    }

    this._state = "requesting_permission";
    this.accumulatedTranscript = "";
    this.language = language;
    this.intentionalStop = false;
    this.recordingError = null;
    this.startSettled = false;

    return new Promise<void>((resolve, reject) => {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = false; // only final results
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      this.recognition = recognition;

      /* -- onstart ------------------------------------------------- */
      recognition.onstart = () => {
        if (this.startSettled) return;
        this.startSettled = true;
        this._state = "recording";
        devLog("recording:start", `SpeechRecognition started, lang=${language}`);
        resolve();
      };

      /* -- onresult ------------------------------------------------ */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const text: string = event.results[i][0].transcript;
            this.accumulatedTranscript += text;
            devLog("result", `Final: "${text}"`);
          }
        }
      };

      /* -- onerror ------------------------------------------------- */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        const errorType: string = event.error;
        devLog("error", `SpeechRecognition error: ${errorType}`);

        // Errors during startup (before onstart resolved the promise)
        if (!this.startSettled) {
          this.startSettled = true;
          this._state = "error";

          if (errorType === "not-allowed") {
            reject(this.createError("MIC_PERMISSION_DENIED"));
          } else if (errorType === "audio-capture") {
            reject(this.createError("MIC_NOT_AVAILABLE"));
          } else if (
            errorType === "service-not-allowed" ||
            errorType === "language-not-supported"
          ) {
            reject(this.createError("SPEECH_NOT_SUPPORTED"));
          } else if (errorType === "network") {
            // Brave and other privacy-focused browsers block the Web Speech
            // API's connection to Google's speech recognition servers.
            reject(this.createError("SPEECH_BLOCKED"));
          } else {
            reject(this.createError("AUDIO_RECORDING_FAILED"));
          }
          return;
        }

        // Errors during recording (after startup)
        if (errorType === "no-speech") {
          // Not fatal — user may start speaking later
          devLog("error", "No speech detected yet, continuing...");
          return;
        }

        if (errorType === "aborted" && this.intentionalStop) {
          // Expected — we called abort() intentionally
          return;
        }

        if (errorType === "network") {
          // Brave and privacy browsers: onstart fires, but the actual
          // recognition service is blocked.  Record the error so that
          // stopAndTranscribe surfaces the right message, and stop the
          // auto-restart loop.
          devLog("error", "Network blocked — likely Brave / privacy browser");
          this.recordingError = "SPEECH_BLOCKED";
          this.intentionalStop = true;  // prevent auto-restart in onend
          return;
        }

        // Other non-fatal errors
        devLog("error", `Non-fatal error during recording: ${errorType}`);
      };

      /* -- onend --------------------------------------------------- */
      recognition.onend = () => {
        devLog(
          "end",
          `SpeechRecognition ended, intentional=${this.intentionalStop}, pending=${!!this.pendingResolve}`
        );

        // If stopAndTranscribe was called, resolve its promise
        if (this.pendingResolve) {
          this.resolveTranscription();
          return;
        }

        // If recognition ended unexpectedly while we're still "recording"
        // (e.g. silence timeout on mobile), auto-restart
        if (this._state === "recording" && !this.intentionalStop) {
          devLog("end", "Unexpected end — auto-restarting");
          try {
            recognition.start();
          } catch {
            devLog("end", "Failed to auto-restart");
            this._state = "idle";
          }
          return;
        }

        this._state = "idle";
      };

      /* -- kick off ------------------------------------------------ */
      try {
        recognition.start();
        devLog("startRecording", "SpeechRecognition.start() called");
      } catch {
        if (!this.startSettled) {
          this.startSettled = true;
          this._state = "error";
          reject(this.createError("AUDIO_RECORDING_FAILED"));
        }
      }
    });
  }

  /**
   * Stop listening and return the accumulated transcript.
   *
   * @param language BCP-47 language code (for result metadata)
   * @returns TranscriptionResult with the accumulated transcript
   */
  async stopAndTranscribe(
    language: string = "en-IN"
  ): Promise<TranscriptionResult> {
    // If a mid-recording error was captured (e.g. Brave blocking network),
    // surface it immediately regardless of recorder state.
    if (this.recordingError) {
      const errorCode = this.recordingError;
      this.recordingError = null;
      this.cancelRecording();
      devLog("stopAndTranscribe", `Returning stored error: ${errorCode}`);
      return {
        success: false,
        transcript: "",
        language,
        error_code: errorCode,
        error_message: getUserMessage(errorCode),
      };
    }

    if (!this.recognition || this._state !== "recording") {
      devLog("stopAndTranscribe", "Not recording, returning empty");
      return {
        success: false,
        transcript: "",
        language,
        error_code: "AUDIO_EMPTY",
        error_message: getUserMessage("AUDIO_EMPTY"),
      };
    }

    this._state = "processing";
    this.intentionalStop = true;

    return new Promise<TranscriptionResult>((resolve) => {
      this.pendingResolve = resolve;

      try {
        this.recognition.stop();
      } catch {
        devLog("stopAndTranscribe", "Failed to stop recognition");
        this.resolveTranscription();
      }

      // Safety timeout — if onend doesn't fire within 3 seconds, force-resolve
      setTimeout(() => {
        if (this.pendingResolve) {
          devLog("stopAndTranscribe", "Timeout — force-resolving");
          this.resolveTranscription();
        }
      }, 3000);
    });
  }

  /** Cancel any in-flight recognition */
  cancelRecording(): void {
    devLog("recording:cancel", "Cancelling");
    this.intentionalStop = true;
    this.pendingResolve = null;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Already stopped
      }
    }

    this.accumulatedTranscript = "";
    this.recordingError = null;
    this._state = "idle";
  }

  /** Full cleanup — call on component unmount */
  cleanup(): void {
    devLog("cleanup", "Cleaning up VoiceRecorder");
    this._isMounted = false;
    this.cancelRecording();
    this.recognition = null;
  }

  /** Mark as mounted (for re-use after cleanup) */
  mount(): void {
    this._isMounted = true;
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                   */
  /* ---------------------------------------------------------------- */

  /** Resolve the pending stopAndTranscribe promise with the current transcript */
  private resolveTranscription(): void {
    const resolve = this.pendingResolve;
    if (!resolve) return;

    this.pendingResolve = null;
    this._state = "idle";

    const transcript = this.accumulatedTranscript.trim();

    if (transcript) {
      devLog("transcript:final", `"${transcript}"`);
      resolve({
        success: true,
        transcript,
        language: this.language,
      });
    } else {
      // If a mid-recording error exists, use that instead of generic AUDIO_EMPTY
      const errorCode = this.recordingError || "AUDIO_EMPTY";
      this.recordingError = null;
      devLog("transcript:empty", `No speech detected, error=${errorCode}`);
      resolve({
        success: false,
        transcript: "",
        language: this.language,
        error_code: errorCode,
        error_message: getUserMessage(errorCode),
      });
    }
  }

  private createError(code: string): VoiceRecorderError {
    return {
      code,
      message: getUserMessage(code),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton + backward-compatible export                             */
/* ------------------------------------------------------------------ */

/** Singleton VoiceRecorder instance */
export const voiceRecorder = new VoiceRecorder();

/**
 * @deprecated Use voiceRecorder instead.
 * Kept for backward compatibility.
 */
export const speechToText = {
  isSupported: () => voiceRecorder.isSupported(),
  startListening: () => {
    console.warn(
      "[VOICE] speechToText.startListening() is deprecated. Use voiceRecorder.startRecording()."
    );
  },
  stopListening: () => {
    voiceRecorder.cancelRecording();
  },
  cleanup: () => {
    voiceRecorder.cleanup();
  },
};
