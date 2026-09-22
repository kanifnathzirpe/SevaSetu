"""
Document Classification Service for medical documents.
Classifies documents based on OCR content into lab reports, prescriptions, referrals, etc.
"""
import re
from typing import Tuple


class DocumentClassifier:
    """Service for classifying medical documents based on content."""

    # Keywords for different document types
    LAB_REPORT_KEYWORDS = [
        "hemoglobin", "wbc", "rbc", "platelet", "blood test", "cbc",
        "glucose", "cholesterol", "urine", "laboratory", "lab report",
        "reference range", "normal range", "result", "investigation",
        "pathology", "diagnostic", "test report", "biopsy"
    ]

    PRESCRIPTION_KEYWORDS = [
        "rx", "prescription", "medicine", "dosage", "mg", "tablet",
        "capsule", "syrup", "injection", "take", "after food", "before food",
        "doctor", "physician", "signature", "pharmacy", "dispense",
        "refill", "quantity", "duration", "frequency"
    ]

    REFERRAL_KEYWORDS = [
        "referral", "referred to", "referred by", "transfer", "consult",
        "specialist", "department", "hospital", "medical center",
        "urgency", "priority", "clinical reason", "refer", "specialty"
    ]

    VACCINATION_KEYWORDS = [
        "vaccine", "vaccination", "immunization", "dose", "booster",
        "bcg", "polio", "dpt", "mmr", "hepatitis", "tetanus", "measles",
        "rubella", "influenza", "covid", "corona", "jab", "shot",
        "vaccination card", "immunization record", "schedule"
    ]

    def classify(self, ocr_text: str) -> Tuple[str, float]:
        """
        Classify a document based on OCR text.

        Args:
            ocr_text: Extracted text from OCR

        Returns:
            Tuple of (document_type, confidence_score)
            document_type is one of: lab_report, prescription, referral, vaccination_record, other
            confidence_score is between 0.0 and 1.0
        """
        if not ocr_text or len(ocr_text.strip()) < 10:
            return "other", 0.0

        text_lower = ocr_text.lower()

        # Score each document type
        scores = {
            "lab_report": self._score_keywords(text_lower, self.LAB_REPORT_KEYWORDS),
            "prescription": self._score_keywords(text_lower, self.PRESCRIPTION_KEYWORDS),
            "referral": self._score_keywords(text_lower, self.REFERRAL_KEYWORDS),
            "vaccination_record": self._score_keywords(text_lower, self.VACCINATION_KEYWORDS),
        }

        # Find the highest scoring type
        max_type = max(scores, key=scores.get)
        max_score = scores[max_type]

        # Normalize score to confidence (0-1)
        # A score of 3+ strong keywords gives high confidence
        confidence = min(max_score / 3.0, 1.0)

        # If no strong indicators, classify as other
        if max_score < 1:
            return "other", 0.0

        return max_type, confidence

    def _score_keywords(self, text: str, keywords: list[str]) -> float:
        """
        Score how many keywords appear in the text.

        Args:
            text: Lowercase text to search
            keywords: List of keywords to look for

        Returns:
            Score based on keyword matches
        """
        score = 0.0
        for keyword in keywords:
            # Exact word match gets higher score
            if f" {keyword} " in f" {text} ":
                score += 1.0
            # Partial match gets lower score
            elif keyword in text:
                score += 0.5

        return score

    def classify_with_fallback(self, ocr_text: str) -> str:
        """
        Classify document and return type, asking user if confidence is low.

        Args:
            ocr_text: Extracted text from OCR

        Returns:
            Document type. If confidence is low (<0.5), returns "other"
            to prompt user to select manually.
        """
        doc_type, confidence = self.classify(ocr_text)

        if confidence < 0.5:
            return "other"

        return doc_type


# Singleton instance
_classifier: DocumentClassifier = None


def get_document_classifier() -> DocumentClassifier:
    """Get or create the document classifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = DocumentClassifier()
    return _classifier