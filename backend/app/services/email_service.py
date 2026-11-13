import smtplib
from email.message import EmailMessage
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str):
    """
    Sends an OTP to the specified email address using SMTP.
    If SMTP_SERVER is not configured, logs the OTP to the console for development.
    """
    if not settings.SMTP_SERVER:
        # Development mode fallback
        print("*" * 50)
        print(f"[DEV MODE] Email delivery skipped (SMTP not configured).")
        print(f"[DEV MODE] Would have sent OTP to {to_email}")
        print(f"[DEV MODE] OTP CODE: {otp}")
        print("*" * 50)
        return

    try:
        msg = EmailMessage()
        msg.set_content(f"Your FictSelf verification code is: {otp}\n\nThis code will expire in 10 minutes.")
        msg["Subject"] = "FictSelf Signup Verification Code"
        msg["From"] = settings.EMAILS_FROM_EMAIL
        msg["To"] = to_email

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        print("*" * 50)
        print(f"[SMTP FAILURE] Failed to send email via SMTP to {to_email}: {str(e)}")
        print(f"[SMTP FAILURE] Fallback OTP code: {otp}")
        print("*" * 50)
