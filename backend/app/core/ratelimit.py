"""Tiny sliding-window rate limiter (no extra dependencies).

Counts live in this process's memory, so they reset on restart and are NOT shared between several
server workers. That is fine for a hackathon on one instance; for production swap `RateLimiter`
for Redis (same check/reset interface) or put limits at the proxy/CDN.

Env: TRUST_PROXY=1  -> read the client IP from X-Forwarded-For. Turn this on ONLY when the app sits
     behind a proxy you control (Render, Nginx...). Otherwise anyone can spoof the header and
     dodge the limits.
"""
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> None:
        """Record one hit for `key`; raise 429 if it already had `limit` hits in the last `window` s."""
        now = time.monotonic()
        with self._lock:
            if len(self._hits) > 10_000:  # keep memory bounded: forget keys with no recent hits
                for k in [k for k, q in self._hits.items() if not q or now - q[-1] > window]:
                    del self._hits[k]
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                retry = int(window - (now - q[0])) + 1
                raise HTTPException(429, "Too many attempts. Please try again later.",
                                    headers={"Retry-After": str(retry)})
            q.append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    if os.getenv("TRUST_PROXY") == "1":
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window: int):
    """Route dependency: `dependencies=[Depends(rate_limit("register", 5, 3600))]` (per client IP)."""
    def dependency(request: Request) -> None:
        limiter.check(f"{name}:{client_ip(request)}", limit, window)
    return dependency