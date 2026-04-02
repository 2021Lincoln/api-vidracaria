from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import hashlib
import hmac
import os

from jose import jwt

from app.core_config import settings


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8")


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme, rounds_str, salt_b64, hash_b64 = hashed_password.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        rounds = int(rounds_str)
        salt = _b64d(salt_b64)
        expected = _b64d(hash_b64)
        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            rounds,
        )
        return hmac.compare_digest(candidate, expected)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    rounds = 200_000
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return f"pbkdf2_sha256${rounds}${_b64e(salt)}${_b64e(digest)}"


def create_access_token(
    subject: str,
    role: str,
    tenant_id: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode = {"sub": subject, "role": role, "tenant_id": tenant_id, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
