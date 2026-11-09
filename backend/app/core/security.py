"""Auth for VOUCHLY: password hashing, JWT tokens, and role guards.

Drop at backend/app/core/security.py  (add an empty __init__.py in core/ if it is missing).
Env: APP_ENV=production (makes a missing/weak JWT_SECRET a startup error),
     JWT_SECRET (32+ random chars; generate: python -c "import secrets; print(secrets.token_urlsafe(48))"),
     JWT_TTL_MINUTES (default 480)
Deps: pip install pyjwt
"""
import hashlib
import hmac
import os
import secrets
import time

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User

IS_PRODUCTION = os.getenv("APP_ENV", "development").lower() == "production"
SECRET = os.getenv("JWT_SECRET", "")
if not SECRET:
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET must be set when APP_ENV=production")
    SECRET = "dev-only-change-me"  # local development only
if IS_PRODUCTION and len(SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be at least 32 characters in production")
ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = int(os.getenv("JWT_TTL_MINUTES", "480")) * 60
PBKDF2_ROUNDS = 200_000

bearer = HTTPBearer(auto_error=False)  # we raise our own 401 so the message is consistent


# ---- passwords (stdlib only, so no passlib/bcrypt version problems) --------------------
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2${PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt, digest = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(check.hex(), digest)
    except ValueError:  # malformed hash, e.g. the "x" placeholder used in try_review.py
        return False


# Verified against when the email is unknown, so "no such user" takes as long as "wrong password"
# (otherwise response time reveals which emails have accounts).
DUMMY_HASH = hash_password("not-a-real-password")


# ---- tokens ------------------------------------------------------------------------------
def create_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS},
                      SECRET, algorithm=ALGORITHM)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                     db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGORITHM],
                             options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, payload.get("sub"))
    if user is None:
        raise HTTPException(401, "User no longer exists")
    return user


def require_roles(*roles: str):
    """Use as: user = Depends(require_roles("admin", "manager"))"""
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Your role cannot do this")
        return user
    return dependency