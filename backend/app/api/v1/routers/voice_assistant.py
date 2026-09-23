"""Voice Assistant API Router.

Provides endpoints for:
- Processing voice/text commands through intent detection
- Transcribing audio to text via server-side STT (OpenAI Whisper)

Both endpoints require patient authentication. Patient identity is derived
from the JWT token, never from client-provided data.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_patient
from app.db.session import get_db
from app.schemas import (
    MessageResponse,
    VoiceAssistantRequest,
    VoiceAssistantResponse,
    VoiceTranscriptionResponse,
)
from app.services.stt_service import STTError, transcribe_audio
from app.services.voice_assistant import detect_intent, process_command

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-assistant", tags=["voice-assistant"])

# Maximum audio upload size: 25 MB
MAX_UPLOAD_SIZE = 25 * 1024 * 1024


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    audio: UploadFile = File(..., description="Audio file from MediaRecorder"),
    language: str = Form(default="en-IN", description="Preferred language code"),
    patient=Depends(get_current_patient),
) -> VoiceTranscriptionResponse:
    """Transcribe audio to text using server-side STT.

    Accepts multipart/form-data with an audio file and optional language hint.
    Requires patient authentication — patient identity is derived from the token.

    Returns the transcribed text which can then be sent to /process.
    """
    # Validate file exists
    if not audio or not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided.")

    # Read audio data
    try:
        audio_bytes = await audio.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read audio data.")

    # Validate size
    if len(audio_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Audio file is too large. Maximum size is 25MB.")

    logger.info(
        f"[VOICE] transcribe: patient_id={patient.id}, "
        f"audio_size={len(audio_bytes)}, language={language}, "
        f"content_type={audio.content_type}, filename={audio.filename}"
    )

    try:
        result = transcribe_audio(
            audio_bytes=audio_bytes,
            filename=audio.filename or "audio.webm",
            language=language,
            content_type=audio.content_type,
        )

        logger.info(f"[VOICE] transcribe success: patient_id={patient.id}, transcript_length={len(result.transcript)}")

        return VoiceTranscriptionResponse(
            success=True,
            transcript=result.transcript,
            language=result.language,
        )

    except STTError as e:
        logger.warning(f"[VOICE] STT error: code={e.code}, message={e.message}")
        return VoiceTranscriptionResponse(
            success=False,
            transcript="",
            language=language,
            error_code=e.code,
            error_message=e.message,
        )
    except Exception as e:
        logger.error(f"[VOICE] Unexpected transcription error: {e}", exc_info=True)
        return VoiceTranscriptionResponse(
            success=False,
            transcript="",
            language=language,
            error_code="STT_FAILED",
            error_message="Unable to transcribe audio. Please try again.",
        )


@router.post("/process", response_model=VoiceAssistantResponse)
def process_voice_command(
    payload: VoiceAssistantRequest,
    db: Session = Depends(get_db),
    patient=Depends(get_current_patient),
) -> VoiceAssistantResponse:
    """Process a voice or text command from the patient.

    This endpoint:
    - Detects the user's intent from natural language
    - Fetches real patient data from the database
    - Returns a structured response with navigation, actions, or confirmation prompts

    The endpoint requires authentication and only returns data for the authenticated patient.
    """
    try:
        # Detect intent from the user's text
        intent, params = detect_intent(payload.text)

        # Process the command with the authenticated patient context
        response = process_command(
            db=db,
            patient=patient,
            intent=intent,
            params=params,
            language=payload.language,
        )

        return VoiceAssistantResponse(**response)

    except Exception as e:
        # Log the error for debugging
        logging.error(f"Voice assistant error: {e}", exc_info=True)

        # Return a user-friendly error response
        raise HTTPException(status_code=500, detail="I encountered an error processing your request. Please try again.")


@router.get("/health", response_model=MessageResponse)
def health_check() -> MessageResponse:
    """Health check endpoint for the voice assistant service."""
    return MessageResponse(message="Voice assistant service is running", success=True)
