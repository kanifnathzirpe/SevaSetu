"""
OCR Service for medical document processing.
Uses Tesseract OCR for text extraction from images.
"""
import io
import os
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False


class OCRService:
    """Service for extracting text from medical document images using OCR."""

    def __init__(self):
        if not TESSERACT_AVAILABLE:
            raise RuntimeError(
                "OCR dependencies not available. Install: pip install pytesseract Pillow"
            )
        # Set Tesseract path if configured in environment
        if tesseract_path := os.getenv("TESSERACT_PATH"):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path

    def process_image(self, image_data: bytes) -> str:
        """
        Extract text from an image using OCR.

        Args:
            image_data: Raw image bytes

        Returns:
            Extracted text from the image

        Raises:
            RuntimeError: If OCR processing fails
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Extract text using Tesseract
            # Using psm 6 (assume a single uniform block of text)
            # and preserve layout for better document structure
            text = pytesseract.image_to_string(
                image,
                config="--psm 6 --oem 3 -l eng+hin"
            )

            return text.strip()

        except Exception as e:
            raise RuntimeError(f"OCR processing failed: {str(e)}")

    def process_pdf(self, pdf_data: bytes) -> str:
        """
        Extract text from a PDF file.

        Args:
            pdf_data: Raw PDF bytes

        Returns:
            Extracted text from the PDF

        Raises:
            RuntimeError: If PDF processing fails
        """
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(stream=pdf_data, filetype="pdf")
            text = ""

            for page in doc:
                text += page.get_text()

            doc.close()
            return text.strip()

        except ImportError:
            raise RuntimeError(
                "PDF processing requires PyMuPDF. Install: pip install pymupdf"
            )
        except Exception as e:
            raise RuntimeError(f"PDF processing failed: {str(e)}")

    def process_file(self, file_data: bytes, filename: str) -> str:
        """
        Process a file (image or PDF) and extract text.

        Args:
            file_data: Raw file bytes
            filename: Name of the file to determine type

        Returns:
            Extracted text from the file

        Raises:
            RuntimeError: If processing fails
        """
        file_ext = Path(filename).suffix.lower()

        if file_ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"]:
            return self.process_image(file_data)
        elif file_ext == ".pdf":
            return self.process_pdf(file_data)
        else:
            raise RuntimeError(f"Unsupported file type: {file_ext}")


# Singleton instance
_ocr_service: OCRService | None = None


def get_ocr_service() -> OCRService:
    """Get or create the OCR service singleton."""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service