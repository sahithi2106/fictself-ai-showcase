import random
from datetime import datetime, timedelta, timezone
import os
import shutil
import uuid
from typing import Any, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.api.deps import SessionDep, CurrentUser
from app.core.config import settings
from app.core.security import create_access_token
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse, UserUpdate, OTPRequest, OTPVerify
from app.services import user_service
from app.models.user import User
from app.models.email_verification_otp import EmailVerificationOTP
from app.services.email_service import send_otp_email

router = APIRouter()

@router.post("/request-signup-otp")
def request_signup_otp(
    *,
    db: SessionDep,
    otp_in: OTPRequest,
) -> Any:
    """
    Request an email OTP for signup.
    """
    user = user_service.get_user_by_email(db, email=otp_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )

    # Generate a 6-digit OTP
    otp_code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Save to database
    db_otp = EmailVerificationOTP(
        email=otp_in.email,
        otp=otp_code,
        expires_at=expires_at,
        is_verified=False
    )
    db.add(db_otp)
    db.commit()

    # Send the email
    send_otp_email(otp_in.email, otp_code)

    return {"message": "OTP sent successfully."}

@router.post("/verify-signup-otp")
def verify_signup_otp(
    *,
    db: SessionDep,
    otp_in: OTPVerify,
) -> Any:
    """
    Verify the email OTP for signup.
    """
    db_otp = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == otp_in.email
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if not db_otp:
        raise HTTPException(status_code=400, detail="No OTP found for this email.")

    if db_otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired.")

    if db_otp.otp != otp_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    db_otp.is_verified = True
    db.commit()

    return {"message": "Email verified successfully."}

@router.post("/register", response_model=UserResponse)
def register(
    *,
    db: SessionDep,
    user_in: UserCreate,
) -> Any:
    """
    Register a new user. Requires prior OTP verification.
    """
    # Check OTP verification
    db_otp = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == user_in.email
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if not db_otp or not db_otp.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Email has not been verified with an OTP.",
        )

    user = user_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists in the system.",
        )
    user = user_service.get_user_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this username already exists in the system.",
        )
    user = user_service.create_user(db, user_in=user_in)
    return user

@router.post("/login", response_model=Token)
def login_access_token(
    db: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Note: form_data.username expects the user's email.
    """
    user = user_service.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: CurrentUser,
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_me(
    *,
    db: SessionDep,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update current user profile.
    """
    user = user_service.update_user(db, db_obj=current_user, obj_in=user_in)
    return user


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload an avatar image for the current user.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{uuid.uuid4()}{ext}"
    
    # Ensure directory exists
    upload_dir = os.path.join("uploads", "user_avatars")
    os.makedirs(upload_dir, exist_ok=True)
    
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    avatar_url = f"http://127.0.0.1:8000/uploads/user_avatars/{filename}"
    
    user_in = UserUpdate(profile_image=avatar_url)
    user = user_service.update_user(db, db_obj=current_user, obj_in=user_in)
    return user
