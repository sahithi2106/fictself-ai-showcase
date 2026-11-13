import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    about_me: Optional[str] = None
    interests: Optional[str] = None
    is_onboarded: Optional[bool] = None

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    display_name: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    about_me: Optional[str] = None
    interests: Optional[str] = None
    is_onboarded: bool

    class Config:
        from_attributes = True
