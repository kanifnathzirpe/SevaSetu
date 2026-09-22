"""
Scan API Router for medical document scanning workflow.
Handles document upload, OCR processing, classification, and extraction.
"""
import json
import os
import shutil
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_current_patient
from app.core.config import settings
from app.db.session import get_db
from app.models import (
    Child,
    DocumentScan,
    Patient,
    Prescription,
    PrescriptionItem,
    Referral,
    Report,
    User,
    Vaccination,
)
from app.models.enums import DocumentType, ReportType, ScanStatus
from app.schemas import (
    DocumentScanCreate,
    DocumentScanOut,
    DocumentScanUpdate,
    ScanConfirmRequest,
)
from app.services.data_extractor import get_data_extractor
from app.services.document_classifier import get_document_classifier
from app.services.ocr import get_ocr_service

router = APIRouter(prefix="/scan", tags=["scan"])


def _scan_out(scan: DocumentScan) -> DocumentScanOut:
    """Convert DocumentScan to output format with related data."""
    data = DocumentScanOut.model_validate(scan)

    # Add patient name
    if scan.patient:
        data.patient_name = scan.patient.user.full_name

    # Add child name if applicable
    if scan.child:
        data.child_name = scan.child.name

    return data


@router.post("/upload", response_model=DocumentScanOut, status_code=201)
def upload_scan(
    file: UploadFile = File(...),
    document_type: DocumentType = DocumentType.OTHER,
    child_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentScanOut:
    """
    Upload a document for scanning and OCR processing.
    """
    # Get patient profile
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(404, "Patient profile not found")

    # Validate child ownership if specified
    if child_id is not None:
        child = db.get(Child, child_id)
        if not child or child.mother_patient_id != patient.id:
            raise HTTPException(403, "Invalid child selection")

    # Validate file
    if not file.filename:
        raise HTTPException(400, "Filename required")

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".pdf"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")

    # Read file content
    file_content = file.file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Maximum size is 10MB")

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Save original file
    filename = f"scan-{patient.id}-{uuid4().hex[:8]}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        buffer.write(file_content)

    # Create scan record
    scan = DocumentScan(
        patient_id=patient.id,
        child_id=child_id,
        uploaded_by_user_id=user.id,
        document_type=document_type,
        original_file_url=f"/uploads/{filename}",
        processing_status=ScanStatus.UPLOADING,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return _scan_out(scan)


@router.post("/{scan_id}/process", response_model=DocumentScanOut)
def process_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentScanOut:
    """
    Process a scan: OCR, classification, and data extraction.
    """
    scan = db.get(DocumentScan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    # Verify ownership
    if scan.patient.user_id != user.id:
        raise HTTPException(403, "Access denied")

    # Update status
    scan.processing_status = ScanStatus.PROCESSING
    db.commit()

    try:
        # Read file
        filepath = os.path.join(settings.UPLOAD_DIR, scan.original_file_url.replace("/uploads/", ""))
        if not os.path.exists(filepath):
            raise HTTPException(404, "File not found")

        with open(filepath, "rb") as f:
            file_content = f.read()

        # OCR Processing
        scan.processing_status = ScanStatus.OCR_PENDING
        db.commit()

        ocr_service = get_ocr_service()
        ocr_text = ocr_service.process_file(file_content, scan.original_file_url)
        scan.ocr_text = ocr_text
        scan.processing_status = ScanStatus.OCR_COMPLETE
        db.commit()

        # Document Classification
        classifier = get_document_classifier()
        doc_type, confidence = classifier.classify(ocr_text)

        # If user didn't specify type, use classification
        if scan.document_type == DocumentType.OTHER:
            scan.document_type = DocumentType(doc_type)
            scan.classification_confidence = confidence

        scan.processing_status = ScanStatus.CLASSIFIED
        db.commit()

        # Data Extraction
        extractor = get_data_extractor()
        if scan.document_type == DocumentType.LAB_REPORT:
            extracted = extractor.extract_lab_report(ocr_text)
        elif scan.document_type == DocumentType.PRESCRIPTION:
            extracted = extractor.extract_prescription(ocr_text)
        elif scan.document_type == DocumentType.REFERRAL:
            extracted = extractor.extract_referral(ocr_text)
        elif scan.document_type == DocumentType.VACCINATION_RECORD:
            extracted = extractor.extract_vaccination(ocr_text)
        else:
            extracted = extractor.extract_other(ocr_text)

        scan.extracted_data = json.dumps(extracted)
        scan.processing_status = ScanStatus.EXTRACTED
        scan.verification_status = "pending"
        db.commit()
        db.refresh(scan)

        return _scan_out(scan)

    except Exception as e:
        scan.processing_status = ScanStatus.FAILED
        scan.error_message = str(e)
        db.commit()
        raise HTTPException(500, f"Processing failed: {str(e)}")


@router.get("/{scan_id}", response_model=DocumentScanOut)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentScanOut:
    """Get a scan by ID."""
    scan = db.get(DocumentScan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    # Verify ownership
    if scan.patient.user_id != user.id:
        raise HTTPException(403, "Access denied")

    return _scan_out(scan)


@router.patch("/{scan_id}", response_model=DocumentScanOut)
def update_scan(
    scan_id: int,
    payload: DocumentScanUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentScanOut:
    """Update scan data (document type, extracted data, etc.)."""
    scan = db.get(DocumentScan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    # Verify ownership
    if scan.patient.user_id != user.id:
        raise HTTPException(403, "Access denied")

    # Update fields
    if payload.document_type is not None:
        scan.document_type = payload.document_type

    if payload.extracted_data is not None:
        scan.extracted_data = json.dumps(payload.extracted_data)

    if payload.verification_status is not None:
        scan.verification_status = payload.verification_status

    db.commit()
    db.refresh(scan)

    return _scan_out(scan)


@router.post("/{scan_id}/confirm", response_model=dict)
def confirm_scan(
    scan_id: int,
    payload: ScanConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Confirm scan and create the appropriate medical record.
    Routes to Reports, Prescriptions, Referrals, or Vaccinations based on document type.
    """
    scan = db.get(DocumentScan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")

    # Verify ownership
    if scan.patient.user_id != user.id:
        raise HTTPException(403, "Access denied")

    if not payload.confirmed:
        return {"message": "Scan cancelled", "record_id": None}

    # Parse extracted data
    try:
        extracted_data = payload.extracted_data if payload.extracted_data else json.loads(scan.extracted_data)
    except:
        extracted_data = {}

    # Route to appropriate record type
    record_id = None
    record_type = None

    if scan.document_type == DocumentType.LAB_REPORT:
        # Create Report
        report = Report(
            patient_id=scan.patient_id,
            report_type=ReportType.LAB,
            title=extracted_data.get("title", "Scanned Lab Report"),
            summary=f"Scanned document. Laboratory: {extracted_data.get('laboratory', 'N/A')}",
            result_json=json.dumps(extracted_data.get("test_results", {})),
            report_date=date.fromisoformat(extracted_data["report_date"]) if extracted_data.get("report_date") else date.today(),
            file_url=scan.original_file_url,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        record_id = report.id
        record_type = "report"

    elif scan.document_type == DocumentType.PRESCRIPTION:
        # Create Prescription
        prescription = Prescription(
            patient_id=scan.patient_id,
            doctor_id=None,  # No doctor assigned for scanned prescriptions
            issued_on=date.fromisoformat(extracted_data["date"]) if extracted_data.get("date") else date.today(),
            diagnosis=extracted_data.get("diagnosis", "Scanned prescription"),
            advice=extracted_data.get("advice", ""),
        )
        db.add(prescription)
        db.commit()
        db.refresh(prescription)

        # Add prescription items if extracted
        medicines = extracted_data.get("medicines", [])
        for med in medicines:
            item = PrescriptionItem(
                prescription_id=prescription.id,
                medicine_name=med.get("name", "Unknown"),
                dosage=med.get("dosage", "As directed"),
                duration_days=med.get("duration_days", 5),
                instructions=med.get("instructions", "As prescribed"),
            )
            db.add(item)

        db.commit()
        record_id = prescription.id
        record_type = "prescription"

    elif scan.document_type == DocumentType.REFERRAL:
        # Create Referral
        referral = Referral(
            patient_id=scan.patient_id,
            created_by_user_id=user.id,
            from_facility=extracted_data.get("referring_facility", "Scanned referral"),
            reason=extracted_data.get("clinical_reason", "Scanned referral document"),
            specialty=extracted_data.get("specialty", ""),
            notes=payload.notes or "",
        )
        db.add(referral)
        db.commit()
        db.refresh(referral)
        record_id = referral.id
        record_type = "referral"

    elif scan.document_type == DocumentType.VACCINATION_RECORD:
        # Create Vaccination
        vaccination = Vaccination(
            patient_id=scan.patient_id,
            child_id=scan.child_id,
            vaccine_name=extracted_data.get("vaccine", "Scanned vaccination"),
            dose_label=extracted_data.get("dose", "Dose 1"),
            scheduled_date=date.fromisoformat(extracted_data["date"]) if extracted_data.get("date") else date.today(),
            center_name=extracted_data.get("facility", "Scanned"),
            status="completed",
        )
        db.add(vaccination)
        db.commit()
        db.refresh(vaccination)
        record_id = vaccination.id
        record_type = "vaccination"

    else:
        # Create generic Report for OTHER documents
        report = Report(
            patient_id=scan.patient_id,
            report_type=ReportType.LAB,
            title=extracted_data.get("title", "Scanned Document"),
            summary="Scanned medical document",
            result_json=json.dumps(extracted_data),
            report_date=date.fromisoformat(extracted_data["date"]) if extracted_data.get("date") else date.today(),
            file_url=scan.original_file_url,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        record_id = report.id
        record_type = "report"

    # Update scan record
    scan.processing_status = ScanStatus.CONFIRMED
    scan.verification_status = "verified"
    scan.confirmed_record_id = record_id
    scan.confirmed_record_type = record_type
    db.commit()

    return {
        "message": "Document saved successfully",
        "record_id": record_id,
        "record_type": record_type,
    }


@router.get("", response_model=list[DocumentScanOut])
def list_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DocumentScanOut]:
    """List all scans for the current user."""
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(404, "Patient profile not found")

    scans = (
        db.query(DocumentScan)
        .options(
            joinedload(DocumentScan.patient).joinedload(Patient.user),
            joinedload(DocumentScan.child),
        )
        .filter(DocumentScan.patient_id == patient.id)
        .order_by(DocumentScan.created_at.desc())
        .all()
    )

    return [_scan_out(scan) for scan in scans]