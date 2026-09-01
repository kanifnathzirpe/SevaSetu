from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import AshaWorker, Doctor, Patient, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires one of roles: {', '.join(r.value for r in roles)}",
            )
        return user

    return dependency


def get_current_patient(
    user: User = Depends(require_roles(UserRole.PATIENT)), db: Session = Depends(get_db)
) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient profile not found")
    return patient


def get_current_doctor(
    user: User = Depends(require_roles(UserRole.DOCTOR)), db: Session = Depends(get_db)
) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
    if not doctor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor profile not found")
    return doctor


def get_current_asha(
    user: User = Depends(require_roles(UserRole.ASHA)), db: Session = Depends(get_db)
) -> AshaWorker:
    asha = db.query(AshaWorker).filter(AshaWorker.user_id == user.id).first()
    if not asha:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ASHA profile not found")
    return asha


AdminUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.DHO))
EmergencyUser = Depends(require_roles(UserRole.EMERGENCY, UserRole.DHO, UserRole.HOSPITAL_ADMIN))
