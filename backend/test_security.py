"""Unit tests for app/core/security.py. Run from backend/:   python test_security.py
Needs: pip install pyjwt fastapi sqlalchemy uuid_utils
"""
import os
import subprocess
import sys
import time
from types import SimpleNamespace

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.pop("APP_ENV", None)
os.environ.pop("JWT_SECRET", None)

import jwt  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.security import HTTPAuthorizationCredentials  # noqa: E402

from app.core import security as sec  # noqa: E402


def raises(code, fn, *args, **kw):
    try:
        fn(*args, **kw)
    except HTTPException as e:
        assert e.status_code == code, f"expected {code}, got {e.status_code}"
        return
    raise AssertionError(f"expected HTTP {code}, but no error was raised")


def creds(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


USER = SimpleNamespace(id="u1", role="creator")


class FakeDB:  # stands in for the SQLAlchemy session: only .get() is used
    def get(self, model, pk):
        return USER if pk == "u1" else None


db = FakeDB()

# ---- passwords ----------------------------------------------------------------------------
h1, h2 = sec.hash_password("correct horse"), sec.hash_password("correct horse")
assert h1 != h2, "same password must hash differently (random salt)"
assert "correct horse" not in h1, "the plain password must never appear in the hash"
assert sec.verify_password("correct horse", h1)
assert not sec.verify_password("wrong horse", h1)
assert not sec.verify_password("x", "x"), "the 'x' placeholder hash must fail safely, not crash"
assert not sec.verify_password("x", "pbkdf2$abc$zz$zz")
assert len(h1) <= 255, "hash must fit the String(255) column"
print("passwords ok")

# ---- tokens -------------------------------------------------------------------------------
good = sec.create_token("u1")
assert sec.get_current_user(creds(good), db) is USER

raises(401, sec.get_current_user, None, db)                                   # no header
raises(401, sec.get_current_user, creds("not.a.jwt"), db)                     # garbage
raises(401, sec.get_current_user, creds(good[:-3] + "abc"), db)               # tampered signature

forged = jwt.encode({"sub": "u1", "exp": int(time.time()) + 600}, "attacker-secret", algorithm="HS256")
raises(401, sec.get_current_user, creds(forged), db)                          # wrong secret

expired = jwt.encode({"sub": "u1", "exp": int(time.time()) - 10}, sec.SECRET, algorithm="HS256")
raises(401, sec.get_current_user, creds(expired), db)                         # expired

no_exp = jwt.encode({"sub": "u1"}, sec.SECRET, algorithm="HS256")
raises(401, sec.get_current_user, creds(no_exp), db)                          # never-expiring token

alg_none = jwt.encode({"sub": "u1", "exp": int(time.time()) + 600}, None, algorithm="none")
raises(401, sec.get_current_user, creds(alg_none), db)                        # "alg: none" attack

ghost = jwt.encode({"sub": "deleted-user", "exp": int(time.time()) + 600}, sec.SECRET, algorithm="HS256")
raises(401, sec.get_current_user, creds(ghost), db)                           # user was deleted
print("tokens ok")

# ---- role guard -----------------------------------------------------------------------------
guard = sec.require_roles("admin", "manager")
assert guard(SimpleNamespace(role="admin")).role == "admin"
raises(403, guard, SimpleNamespace(role="creator"))
raises(403, guard, SimpleNamespace(role="agency"))
print("roles ok")


# ---- production safety: bad config must stop the app from starting --------------------------------
def starts_with(env):
    full = {**os.environ, "DATABASE_URL": "sqlite:///:memory:", **env}
    full.pop("JWT_SECRET", None) if "JWT_SECRET" not in env else None
    r = subprocess.run([sys.executable, "-c", "import app.core.security"], env=full,
                       capture_output=True, text=True)
    return r.returncode == 0


assert not starts_with({"APP_ENV": "production"}), "production without JWT_SECRET must refuse to start"
assert not starts_with({"APP_ENV": "production", "JWT_SECRET": "short"}), "short secret must refuse to start"
assert starts_with({"APP_ENV": "production", "JWT_SECRET": "x" * 40}), "a strong secret should start fine"
assert starts_with({}), "development mode should start with the dev default"
print("production config checks ok")

print("\nALL SECURITY TESTS PASSED")