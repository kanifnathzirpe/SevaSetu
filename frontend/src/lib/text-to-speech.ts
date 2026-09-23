/**
 * Text-to-Speech Service
 *
 * Centralized TTS manager with:
 * - Generation ID tracking to prevent stale TTS from resuming
 * - Intentional cancellation flag — no error shown when user stops speech
 * - Smart voice selection with language fallback chains
 * - Proper lifecycle management
 *
 * There is exactly ONE active TTS operation at a time.
 */

export type TTSState = "idle" | "speaking" | "paused" | "error";

export interface TTSCallbacks {
  onStart: () => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Dev logging                                                        */
/* ------------------------------------------------------------------ */

const isDev = process.env.NODE_ENV === "development";

function devLog(tag: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`[VOICE] tts:${tag}`, ...args);
  }
}

/* ------------------------------------------------------------------ */
/*  Language → TTS voice fallback chains                               */
/* ------------------------------------------------------------------ */

const VOICE_FALLBACK_CHAINS: Record<string, string[]> = {
  "en-IN": ["en-IN", "en-US", "en-GB", "en"],
  "en-US": ["en-US", "en-GB", "en-IN", "en"],
  "en": ["en-IN", "en-US", "en-GB", "en"],
  "hi-IN": ["hi-IN", "hi"],
  "hi": ["hi-IN", "hi"],
  "mr-IN": ["mr-IN", "mr", "hi-IN", "hi"],
  "mr": ["mr-IN", "mr", "hi-IN", "hi"],
  "bn-IN": ["bn-IN", "bn"],
  "bn": ["bn-IN", "bn"],
  "gu-IN": ["gu-IN", "gu"],
  "gu": ["gu-IN", "gu"],
};

/* ------------------------------------------------------------------ */
/*  TextToSpeechService class                                          */
/* ------------------------------------------------------------------ */

class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private isSpeakingFlag = false;
  private callbacks: TTSCallbacks | null = null;

  /** Generation counter — only the latest generation may update state */
  private generation = 0;

  /** Set to true before calling cancel() to suppress the resulting error event */
  private intentionalCancel = false;

  /** Cached voices — populated asynchronously */
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();

      // Voices may load asynchronously (Chrome)
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Public API                                                       */
  /* ---------------------------------------------------------------- */

  public isSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Speak text with the specified language.
   *
   * Cancels any currently playing speech first.
   * Uses generation tracking to prevent stale callbacks.
   */
  public speak(
    text: string,
    language: string = "en-IN",
    callbacks?: TTSCallbacks
  ): void {
    if (!this.synthesis) {
      callbacks?.onError("Text-to-speech is not supported in this browser");
      return;
    }

    if (!text || text.trim().length === 0) {
      devLog("speak", "Empty text, skipping");
      return;
    }

    // Increment generation — any older generation callbacks are now stale
    const currentGeneration = ++this.generation;

    // Cancel any current speech intentionally (suppress error)
    this.cancelIntentionally();

    this.callbacks = callbacks || null;

    devLog("speak", `gen=${currentGeneration}, lang=${language}, text="${text.slice(0, 60)}..."`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select best voice for the language
    const voice = this.getBestVoice(language);
    if (voice) {
      utterance.voice = voice;
      devLog("voice", `Selected: ${voice.name} (${voice.lang})`);
    } else {
      devLog("voice", `No specific voice found for ${language}, using default`);
    }

    utterance.onstart = () => {
      if (currentGeneration !== this.generation) return; // stale
      this.isSpeakingFlag = true;
      devLog("start", `gen=${currentGeneration}`);
      this.callbacks?.onStart();
    };

    utterance.onend = () => {
      if (currentGeneration !== this.generation) return; // stale
      this.isSpeakingFlag = false;
      devLog("end", `gen=${currentGeneration}`);
      this.callbacks?.onEnd();
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      if (currentGeneration !== this.generation) return; // stale

      this.isSpeakingFlag = false;

      const errorType = event.error;

      // Intentional cancellation — NOT an error
      if (
        this.intentionalCancel ||
        errorType === "canceled" ||
        errorType === "interrupted"
      ) {
        devLog("cancel", `Intentional cancellation (${errorType}), gen=${currentGeneration}`);
        this.intentionalCancel = false;
        // Do NOT call onError — this was expected
        return;
      }

      devLog("error", `Unexpected: ${errorType}, gen=${currentGeneration}`);
      this.callbacks?.onError(this.getUserFriendlyError(errorType));
    };

    try {
      this.synthesis.speak(utterance);
    } catch {
      this.isSpeakingFlag = false;
      callbacks?.onError("Failed to start speech synthesis");
    }
  }

  /**
   * Stop speech — marks as intentional so no error is shown.
   */
  public stop(): void {
    this.cancelIntentionally();
  }

  public pause(): void {
    if (this.synthesis && this.isSpeakingFlag) {
      try {
        this.synthesis.pause();
      } catch {
        devLog("pause", "Failed to pause");
      }
    }
  }

  public resume(): void {
    if (this.synthesis) {
      try {
        this.synthesis.resume();
      } catch {
        devLog("resume", "Failed to resume");
      }
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingFlag;
  }

  public getState(): TTSState {
    if (!this.synthesis) return "error";
    if (this.isSpeakingFlag) {
      if (this.synthesis.paused) return "paused";
      return "speaking";
    }
    return "idle";
  }

  /** Full cleanup — call on component unmount */
  public cleanup(): void {
    devLog("cleanup", "Cleaning up TTS");
    this.stop();
    this.callbacks = null;
  }

  /* ---------------------------------------------------------------- */
  /*  Voice selection                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Find the best available voice for the given language.
   *
   * Uses fallback chains: e.g. for "mr-IN" → try mr-IN, mr, hi-IN, hi
   */
  public getBestVoice(language: string): SpeechSynthesisVoice | null {
    if (this.cachedVoices.length === 0) {
      this.loadVoices();
    }

    const fallbackChain = VOICE_FALLBACK_CHAINS[language] || [language];

    for (const lang of fallbackChain) {
      // Exact match first
      const exact = this.cachedVoices.find(
        (v) => v.lang.toLowerCase() === lang.toLowerCase()
      );
      if (exact) return exact;

      // Prefix match (e.g. "en" matches "en-US")
      const prefix = this.cachedVoices.find((v) =>
        v.lang.toLowerCase().startsWith(lang.toLowerCase().split("-")[0])
      );
      if (prefix) return prefix;
    }

    return null; // Use system default
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                   */
  /* ---------------------------------------------------------------- */

  private loadVoices(): void {
    if (this.synthesis) {
      this.cachedVoices = this.synthesis.getVoices();
      devLog("voices", `Loaded ${this.cachedVoices.length} voices`);
    }
  }

  /**
   * Cancel speech and mark as intentional.
   * This prevents the onerror handler from showing an error to the user.
   */
  private cancelIntentionally(): void {
    if (this.synthesis) {
      this.intentionalCancel = true;
      try {
        this.synthesis.cancel();
      } catch {
        devLog("cancel", "Failed to cancel synthesis");
      }
      this.isSpeakingFlag = false;

      // Reset flag after a tick — in case the error event fires synchronously
      setTimeout(() => {
        this.intentionalCancel = false;
      }, 100);
    }
  }

  private getUserFriendlyError(error: string): string {
    const messages: Record<string, string> = {
      "synthesis-unavailable": "Speech synthesis is not available on this device.",
      "synthesis-failed": "Speech synthesis failed. Please try again.",
      "language-unavailable": "The selected language is not available for speech.",
      "voice-unavailable": "The selected voice is not available.",
      "text-too-long": "The response is too long to speak aloud.",
      "network": "Network error during speech synthesis.",
    };

    return messages[error] || "Speech synthesis encountered an error.";
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton export                                                   */
/* ------------------------------------------------------------------ */

export const textToSpeech = new TextToSpeechService();
