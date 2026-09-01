from datetime import date, datetime, timedelta, timezone
from random import randint

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models import AshaWorker, Doctor, Patient, RefreshToken, User, UserRole
from app.schemas import (
    LoginRequest,
    MessageResponse,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(db: Session, user: User) -> TokenPair:
    access = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id), user.role.value)
    db.add(
        RefreshToken(
            user_id=user.id,
            token=refresh,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


def _create_role_profile(db: Session, user: User, payload: RegisterRequest) -> None:
    if user.role == UserRole.PATIENT:
        db.add(
            Patient(
                user_id=user.id,
                health_id=f"PUN-{datetime.now().year}-{randint(100000, 999999)}",
                date_of_birth=payload.date_of_birth or date(1995, 1, 1),
                gender=payload.gender,
                locality=payload.locality or "Pune City",
                address=payload.locality or "Pune City",
            )
        )
    elif user.role == UserRole.DOCTOR:
        db.add(
            Doctor(
                user_id=user.id,
                specialization="General Medicine",
                qualification="MBBS",
                registration_no=f"MMC-{randint(100000, 999999)}",
                experience_years=1,
                bio="Newly registered medical officer on SevaSetu AI.",
            )
        )
    elif user.role == UserRole.ASHA:
        db.add(
            AshaWorker(
                user_id=user.id,
                asha_code=f"ASHA-PUN-{randint(1000, 9999)}",
                assigned_area=payload.locality or "Pune City",
                village_or_ward=payload.locality or "Pune City",
            )
        )
    db.commit()


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenPair:
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        locality=payload.locality,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _create_role_profile(db, user, payload)
    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == payload.refresh_token, RefreshToken.revoked.is_(False))
        .first()
    )
    if not stored:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token revoked")
    user = db.get(User, int(data["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    stored.revoked = True
    db.commit()
    return _issue_tokens(db, user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    db.query(RefreshToken).filter(
        RefreshToken.token == payload.refresh_token, RefreshToken.user_id == user.id
    ).update({"revoked": True})
    db.commit()
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
