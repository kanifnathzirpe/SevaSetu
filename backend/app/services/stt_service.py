"""Server-side Speech-to-Text Service using OpenAI Whisper API.

All API keys remain server-side. Never return provider secrets or
raw provider error messages to the client.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

# Maximum audio file size: 25 MB (Whisper API limit)
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024

# Supported MIME types for audio upload
SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/flac",
    "application/octet-stream",  # fallback for some browsers
}

# Language code mapping: app locale → Whisper ISO-639-1 code
LANGUAGE_MAP: dict[str, str] = {
    "en": "en",
    "en-IN": "en",
    "en-US": "en",
    "hi": "hi",
    "hi-IN": "hi",
    "mr": "mr",
    "mr-IN": "mr",
    "bn": "bn",
    "bn-IN": "bn",
    "gu": "gu",
    "gu-IN": "gu",
}


class STTError(Exception):
    """Raised when speech-to-text transcription fails."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass
class TranscriptionResult:
    """Result of a successful transcription."""

    transcript: str
    language: str


def _get_whisper_language(language: str) -> str:
    """Map app language code to Whisper-compatible ISO-639-1 code."""
    return LANGUAGE_MAP.get(language, "en")


def validate_audio(audio_bytes: bytes, content_type: str | None) -> None:
    """Validate audio data before sending to STT provider.

    Raises:
        STTError: If validation fails.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        raise STTError("AUDIO_EMPTY", "No audio data received or recording was too short.")

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise STTError(
            "AUDIO_TOO_LARGE",
            f"Audio file exceeds the maximum size of {MAX_AUDIO_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    # Allow content_type to be None or empty — browsers may not always send it
    if content_type and content_type not in SUPPORTED_AUDIO_TYPES:
        logger.warning(f"[STT] Unexpected MIME type: {content_type} — attempting transcription anyway")


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str = "en-IN",
    content_type: str | None = None,
) -> TranscriptionResult:
    """Transcribe audio using OpenAI Whisper API.

    Args:
        audio_bytes: Raw audio file bytes
        filename: Original filename (used for format detection)
        language: App language code (e.g. "en-IN", "hi-IN", "mr-IN")
        content_type: MIME type of the audio

    Returns:
        TranscriptionResult with transcript text and language

    Raises:
        STTError: If transcription fails
    """
    # Validate configuration
    if not settings.OPENAI_API_KEY:
        logger.error("[STT] OPENAI_API_KEY is not configured")
        raise STTError(
            "STT_NOT_CONFIGURED",
            "Voice transcription service is not configured. Please contact support.",
        )

    # Validate audio data
    validate_audio(audio_bytes, content_type)

    whisper_lang = _get_whisper_language(language)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Create a file-like object from bytes
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        logger.info(f"[STT] Transcribing audio: size={len(audio_bytes)} bytes, language={whisper_lang}, filename={filename}")

        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=whisper_lang,
            response_format="text",
        )

        transcript_text = str(transcription).strip()

        if not transcript_text:
            raise STTError("STT_NO_SPEECH", "No speech was detected in the audio.")

        logger.info(f"[STT] Transcription successful: length={len(transcript_text)}")

        return TranscriptionResult(
            transcript=transcript_text,
            language=language,
        )

    except STTError:
        raise
    except Exception as e:
        # Never expose provider details to the client
        logger.error(f"[STT] Provider error: {type(e).__name__}: {e}", exc_info=True)
        raise STTError(
            "STT_FAILED",
            "Unable to transcribe audio. Please try again.",
        ) from e
