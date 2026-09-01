import json
import os
import shutil
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.api.v1.serializers import report_out
from app.core.config import settings
from app.db.session import get_db
from app.models import Doctor, Hospital, Patient, Prescription, Report, User, UserRole
from app.schemas import ReportCreate, ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


def _authorised_patient_ids(db: Session, user: User) -> list[int] | None:
    if user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        return [patient.id] if patient else []
    return None


@router.get("", response_model=list[ReportOut])
def list_reports(
    patient_id: int | None = None,
    report_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ReportOut]:
    query = db.query(Report)
    allowed = _authorised_patient_ids(db, user)
    if allowed is not None:
        query = query.filter(Report.patient_id.in_(allowed or [-1]))
    elif patient_id:
        query = query.filter(Report.patient_id == patient_id)
    elif user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        query = query.filter(Report.doctor_id == (doctor.id if doctor else -1))
    if report_type:
        query = query.filter(Report.report_type == report_type)
    reports = query.order_by(Report.report_date.desc()).limit(200).all()

    doctors = {d.id: d.user.full_name for d in db.query(Doctor).options(joinedload(Doctor.user)).all()}
    hospitals = {h.id: h.name for h in db.query(Hospital).all()}
    patients = {
        p.id: p.user.full_name
        for p in db.query(Patient).options(joinedload(Patient.user)).all()
    }
    output = []
    for report in reports:
        data = report_out(report)
        data.doctor_name = doctors.get(report.doctor_id)
        data.hospital_name = hospitals.get(report.hospital_id)
        data.patient_name = patients.get(report.patient_id, "")
        output.append(data)
    return output


@router.post("", response_model=ReportOut, status_code=201)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
    if user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if not patient or patient.id != payload.patient_id:
            raise HTTPException(403, "You can only upload reports to your own record")
    report = Report(
        patient_id=payload.patient_id,
        report_type=payload.report_type,
        title=payload.title,
        summary=payload.summary,
        result_json=payload.result_json,
        report_date=payload.report_date or date.today(),
        is_abnormal=payload.is_abnormal,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report_out(report)


@router.post("/{report_id}/upload", response_model=ReportOut)
def upload_report_file(
    report_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ReportOut:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"report-{report_id}-{uuid4().hex[:8]}{suffix}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    report.file_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(report)
    return report_out(report)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> ReportOut:
    report = db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report_out(report)


@router.get("/{report_id}/download", response_class=PlainTextResponse)
def download_report(
    report_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> PlainTextResponse:
    report = (
        db.query(Report)
        .options(joinedload(Report.patient).joinedload(Patient.user))
        .filter(Report.id == report_id)
        .first()
    )
    if not report:
        raise HTTPException(404, "Report not found")
    try:
        results = json.loads(report.result_json)
    except json.JSONDecodeError:
        results = {}
    lines = [
        "SEVASETU AI — GOVERNMENT OF MAHARASHTRA (PUNE DISTRICT)",
        "=" * 62,
        f"Report        : {report.title}",
        f"Type          : {report.report_type.value}",
        f"Patient       : {report.patient.user.full_name} ({report.patient.health_id})",
        f"Date          : {report.report_date.isoformat()}",
        f"Flagged       : {'ABNORMAL' if report.is_abnormal else 'Within normal limits'}",
        "-" * 62,
        "RESULTS",
    ]
    for key, value in results.items():
        lines.append(f"  {key:<28}: {value}")
    lines += ["-" * 62, "SUMMARY", f"  {report.summary}", "=" * 62,
              "This is a digitally generated report from the SevaSetu AI platform."]
    return PlainTextResponse(
        "\n".join(lines),
        headers={"Content-Disposition": f'attachment; filename="report-{report_id}.txt"'},
    )


@router.get("/prescriptions/{prescription_id}/download", response_class=PlainTextResponse)
def download_prescription(
    prescription_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> PlainTextResponse:
    pres = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.items),
            joinedload(Prescription.patient).joinedload(Patient.user),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
        )
        .filter(Prescription.id == prescription_id)
        .first()
    )
    if not pres:
        raise HTTPException(404, "Prescription not found")
    lines = [
        "SEVASETU AI — DIGITAL PRESCRIPTION",
        "=" * 62,
        f"Patient   : {pres.patient.user.full_name} ({pres.patient.health_id})",
        f"Doctor    : Dr. {pres.doctor.user.full_name}, {pres.doctor.qualification}",
        f"Reg. No.  : {pres.doctor.registration_no}",
        f"Issued on : {pres.issued_on.isoformat()}",
        f"Diagnosis : {pres.diagnosis}",
        "-" * 62,
        f"{'MEDICINE':<28}{'DOSAGE':<12}{'DAYS':<8}INSTRUCTIONS",
    ]
    for item in pres.items:
        lines.append(
            f"{item.medicine_name:<28}{item.dosage:<12}{item.duration_days:<8}{item.instructions}"
        )
    lines += [
        "-" * 62,
        f"Advice        : {pres.advice}",
        f"Follow-up     : {pres.follow_up_date.isoformat() if pres.follow_up_date else 'As required'}",
        "=" * 62,
    ]
    return PlainTextResponse(
        "\n".join(lines),
        headers={"Content-Disposition": f'attachment; filename="prescription-{prescription_id}.txt"'},
    )
