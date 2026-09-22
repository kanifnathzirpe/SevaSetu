"""
Data Extraction Service for medical documents.
Extracts structured data from OCR text for different document types.
"""
import re
from datetime import datetime
from typing import Any, Dict


class DataExtractor:
    """Service for extracting structured data from medical document OCR text."""

    def extract_lab_report(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured data from a lab report.

        Args:
            ocr_text: OCR text from lab report

        Returns:
            Dictionary with extracted fields
        """
        extracted = {
            "patient_name": self._extract_name(ocr_text),
            "report_date": self._extract_date(ocr_text),
            "laboratory": self._extract_laboratory(ocr_text),
            "referring_doctor": self._extract_doctor(ocr_text),
            "test_results": self._extract_test_results(ocr_text),
        }

        return extracted

    def extract_prescription(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured data from a prescription.

        Args:
            ocr_text: OCR text from prescription

        Returns:
            Dictionary with extracted fields
        """
        extracted = {
            "patient_name": self._extract_name(ocr_text),
            "doctor_name": self._extract_doctor(ocr_text),
            "date": self._extract_date(ocr_text),
            "diagnosis": self._extract_diagnosis(ocr_text),
            "medicines": self._extract_medicines(ocr_text),
        }

        return extracted

    def extract_referral(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured data from a referral.

        Args:
            ocr_text: OCR text from referral

        Returns:
            Dictionary with extracted fields
        """
        extracted = {
            "patient_name": self._extract_name(ocr_text),
            "referring_doctor": self._extract_doctor(ocr_text),
            "referring_facility": self._extract_facility(ocr_text),
            "destination_facility": self._extract_facility(ocr_text),
            "date": self._extract_date(ocr_text),
            "clinical_reason": self._extract_reason(ocr_text),
            "specialty": self._extract_specialty(ocr_text),
            "priority": self._extract_priority(ocr_text),
        }

        return extracted

    def extract_vaccination(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured data from a vaccination record.

        Args:
            ocr_text: OCR text from vaccination record

        Returns:
            Dictionary with extracted fields
        """
        extracted = {
            "patient_name": self._extract_name(ocr_text),
            "vaccine": self._extract_vaccine(ocr_text),
            "dose": self._extract_dose(ocr_text),
            "date": self._extract_date(ocr_text),
            "facility": self._extract_facility(ocr_text),
            "batch_number": self._extract_batch_number(ocr_text),
        }

        return extracted

    def extract_other(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract basic metadata from an unclassified document.

        Args:
            ocr_text: OCR text from document

        Returns:
            Dictionary with basic extracted fields
        """
        extracted = {
            "patient_name": self._extract_name(ocr_text),
            "date": self._extract_date(ocr_text),
            "title": self._extract_title(ocr_text),
        }

        return extracted

    def _extract_name(self, text: str) -> str | None:
        """Extract patient name from text."""
        # Look for patterns like "Patient: John Doe" or "Name: John Doe"
        patterns = [
            r"patient[:\s]+([A-Z][a-zA-Z\s]+)",
            r"name[:\s]+([A-Z][a-zA-Z\s]+)",
            r"patient name[:\s]+([A-Z][a-zA-Z\s]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up the name
                name = re.sub(r"[^\w\s]", "", name)
                if len(name) > 2:
                    return name

        return None

    def _extract_date(self, text: str) -> str | None:
        """Extract date from text."""
        # Common date formats
        patterns = [
            r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",  # DD-MM-YYYY or DD/MM/YYYY
            r"\d{2,4}[-/]\d{1,2}[-/]\d{1,2}",  # YYYY-MM-DD or YYYY/MM/DD
            r"\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(0)
                try:
                    # Try to parse and validate the date
                    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d", "%d %b %Y"]:
                        try:
                            datetime.strptime(date_str, fmt)
                            return date_str
                        except ValueError:
                            continue
                except:
                    continue

        return None

    def _extract_laboratory(self, text: str) -> str | None:
        """Extract laboratory/facility name from text."""
        patterns = [
            r"laboratory[:\s]+([A-Z][a-zA-Z0-9\s]+)",
            r"lab[:\s]+([A-Z][a-zA-Z0-9\s]+)",
            r"facility[:\s]+([A-Z][a-zA-Z0-9\s]+)",
            r"hospital[:\s]+([A-Z][a-zA-Z0-9\s]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                lab = match.group(1).strip()
                if len(lab) > 2:
                    return lab

        return None

    def _extract_doctor(self, text: str) -> str | None:
        """Extract doctor name from text."""
        patterns = [
            r"dr\.?\s+([A-Z][a-zA-Z\s]+)",
            r"doctor[:\s]+([A-Z][a-zA-Z\s]+)",
            r"physician[:\s]+([A-Z][a-zA-Z\s]+)",
            r"referring doctor[:\s]+([A-Z][a-zA-Z\s]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                doctor = match.group(1).strip()
                # Clean up
                doctor = re.sub(r"[^\w\s]", "", doctor)
                if len(doctor) > 2:
                    return doctor

        return None

    def _extract_test_results(self, text: str) -> Dict[str, Any]:
        """Extract test results from lab report."""
        results = {}

        # Common lab test patterns
        test_patterns = {
            "hemoglobin": r"hemoglobin[:\s]+([\d.]+)\s*(g/dL|g/dl)",
            "wbc": r"wbc[:\s]+([\d,]+)\s*(/µL|/uL|cells/µL)",
            "rbc": r"rbc[:\s]+([\d.]+)\s*(million/µL|cells/µL)",
            "platelets": r"platelet[:\s]+([\d,]+)\s*(/µL|/uL)",
            "glucose": r"glucose[:\s]+([\d.]+)\s*(mg/dL)",
            "cholesterol": r"cholesterol[:\s]+([\d.]+)\s*(mg/dL)",
        }

        for test_name, pattern in test_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                results[test_name] = {
                    "value": match.group(1),
                    "unit": match.group(2) if len(match.groups()) > 1 else "",
                }

        return results

    def _extract_diagnosis(self, text: str) -> str | None:
        """Extract diagnosis from text."""
        patterns = [
            r"diagnosis[:\s]+([^\n]+)",
            r"dx[:\s]+([^\n]+)",
            r"clinical diagnosis[:\s]+([^\n]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                diagnosis = match.group(1).strip()
                if len(diagnosis) > 2:
                    return diagnosis

        return None

    def _extract_medicines(self, text: str) -> list[Dict[str, Any]]:
        """Extract medicines from prescription."""
        medicines = []

        # Look for medicine patterns (simple pattern matching)
        # This is a basic implementation - in production, use more sophisticated NLP
        lines = text.split("\n")
        for line in lines:
            # Look for lines that might contain medicine info
            if any(keyword in line.lower() for keyword in ["mg", "tablet", "capsule", "syrup", "injection"]):
                parts = line.split()
                if len(parts) >= 2:
                    medicines.append({
                        "name": parts[0],
                        "raw_line": line.strip(),
                    })

        return medicines

    def _extract_facility(self, text: str) -> str | None:
        """Extract facility name from text."""
        return self._extract_laboratory(text)

    def _extract_reason(self, text: str) -> str | None:
        """Extract clinical reason from referral."""
        patterns = [
            r"reason[:\s]+([^\n]+)",
            r"clinical reason[:\s]+([^\n]+)",
            r"indication[:\s]+([^\n]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                reason = match.group(1).strip()
                if len(reason) > 2:
                    return reason

        return None

    def _extract_specialty(self, text: str) -> str | None:
        """Extract specialty from referral."""
        patterns = [
            r"specialty[:\s]+([A-Z][a-zA-Z\s]+)",
            r"department[:\s]+([A-Z][a-zA-Z\s]+)",
            r"specialist[:\s]+([A-Z][a-zA-Z\s]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                specialty = match.group(1).strip()
                if len(specialty) > 2:
                    return specialty

        return None

    def _extract_priority(self, text: str) -> str | None:
        """Extract priority from referral."""
        if "urgent" in text.lower() or "emergency" in text.lower():
            return "high"
        elif "routine" in text.lower() or "elective" in text.lower():
            return "low"
        return None

    def _extract_vaccine(self, text: str) -> str | None:
        """Extract vaccine name from vaccination record."""
        # Common vaccine names
        vaccine_patterns = [
            r"(bcg|polio|dpt|mmr|hepatitis|tetanus|measles|rubella|influenza|covid|corona)",
            r"vaccine[:\s]+([A-Z][a-zA-Z\s]+)",
        ]

        for pattern in vaccine_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                vaccine = match.group(1) if len(match.groups()) > 0 else match.group(0)
                vaccine = vaccine.strip()
                if len(vaccine) > 2:
                    return vaccine

        return None

    def _extract_dose(self, text: str) -> str | None:
        """Extract dose information from vaccination record."""
        patterns = [
            r"dose[:\s]+([0-9IVX]+)",
            r"([0-9IVX]+)[\s-]*(?:st|nd|rd|th)?\s*dose",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                dose = match.group(1).strip()
                return dose

        return None

    def _extract_batch_number(self, text: str) -> str | None:
        """Extract batch number from vaccination record."""
        pattern = r"batch[:\s]+([A-Z0-9]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return None

    def _extract_title(self, text: str) -> str | None:
        """Extract document title."""
        # Look for the first significant line
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if len(line) > 5 and len(line) < 100:
                # Exclude common header/footer patterns
                if not any(x in line.lower() for x in ["page", "confidential", "report no"]):
                    return line

        return None


# Singleton instance
_extractor: DataExtractor = None


def get_data_extractor() -> DataExtractor:
    """Get or create the data extractor singleton."""
    global _extractor
    if _extractor is None:
        _extractor = DataExtractor()
    return _extractor