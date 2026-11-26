from __future__ import annotations

import json
import os
import subprocess
import sys
import secrets
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import yaml
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent
app = FastAPI(title="Job Hunt Agent", version="1.0")

AUTH_PASSWORD = os.getenv("JOBHUNT_PASSWORD", "").strip()
SESSION_COOKIE = "jobhunt_session"
ACTIVE_SESSIONS: set[str] = set()
RUN_LOCK = threading.Lock()
LOGIN_FAILURES: dict[str, list[datetime]] = {}

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    password: str


def require_auth(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JOBHUNT_PASSWORD is not configured",
        )
    if not token or token not in ACTIVE_SESSIONS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return token


@app.post("/api/auth/login")
def login(body: LoginRequest, response: Response, request: Request):
    if not AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JOBHUNT_PASSWORD is not configured",
        )
    client = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)
    failures = [
        timestamp for timestamp in LOGIN_FAILURES.get(client, [])
        if (now - timestamp).total_seconds() < 300
    ]
    if len(failures) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
        )
    if not secrets.compare_digest(body.password, AUTH_PASSWORD):
        failures.append(now)
        LOGIN_FAILURES[client] = failures
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    LOGIN_FAILURES.pop(client, None)
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS.add(token)
    secure = os.getenv("RENDER", "") != "" or os.getenv("COOKIE_SECURE", "false").lower() == "true"
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=60 * 60 * 12,
    )
    return {"ok": True}


@app.get("/api/auth/status")
def auth_status(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    return {"authenticated": bool(token and token in ACTIVE_SESSIONS)}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        ACTIVE_SESSIONS.discard(token)
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


def read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except json.JSONDecodeError:
        try:
            return json.loads(path.read_text(encoding="utf-8-sig"))
        except (json.JSONDecodeError, OSError):
            return default
    except OSError:
        return default


def read_yaml(path: Path, default):
    if not path.exists():
        return default
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or default
    except (yaml.YAMLError, OSError):
        return default


class AppliedRequest(BaseModel):
    applied: bool = True


class RunRequest(BaseModel):
    mode: Literal["mock", "live"] = "mock"
    limit: int | None = None
    no_draft: bool = False
    send_email: bool = True


@app.get("/api/health")
def health():
    return {"ok": True, "service": "jobhunt-api"}


@app.get("/api/profile")
def profile(_auth: str = Depends(require_auth)):
    cfg = read_yaml(ROOT / "config.yaml", {})
    profile_setting = os.getenv(
        "JOBHUNT_PROFILE_FILE",
        str(cfg.get("profile_file", "profile.json")),
    )
    profile_path = Path(profile_setting)
    if not profile_path.is_absolute():
        profile_path = ROOT / profile_path
    data = read_json(profile_path, {})
    if not data:
        data = read_json(ROOT / "profile.example.json", {})
    return data


@app.get("/api/dashboard")
def dashboard(_auth: str = Depends(require_auth)):
    cfg = read_yaml(ROOT / "config.yaml", {})
    seen_setting = os.getenv(
        "JOBHUNT_SEEN_FILE",
        str(cfg.get("seen_file", "seen.json")),
    )
    seen_path = Path(seen_setting)
    if not seen_path.is_absolute():
        seen_path = ROOT / seen_path
    tracker = read_json(seen_path, {})

    rows = []
    for job_id, row in tracker.items():
        rows.append({"job_id": job_id, **row})
    rows.sort(key=lambda row: row.get("first_seen", ""), reverse=True)

    applied = sum(1 for row in rows if row.get("applied"))
    emailed = sum(1 for row in rows if row.get("emailed"))
    avg_score = (
        round(sum(float(row.get("score") or 0) for row in rows) / len(rows), 1)
        if rows
        else 0
    )

    profile_setting = os.getenv(
        "JOBHUNT_PROFILE_FILE",
        str(cfg.get("profile_file", "profile.json")),
    )
    profile_path = Path(profile_setting)
    if not profile_path.is_absolute():
        profile_path = ROOT / profile_path
    profile_data = read_json(profile_path, {})
    if not profile_data:
        profile_data = read_json(ROOT / "profile.example.json", {})
    companies = read_yaml(ROOT / "companies.yaml", {}).get("companies", [])
    return {
        "profile": profile_data,
        "jobs": rows,
        "stats": {
            "tracked": len(rows),
            "emailed": emailed,
            "applied": applied,
            "average_score": avg_score,
            "boards": len(companies),
        },
        "config": {
            "score_threshold": cfg.get("score_threshold", 7.0),
            "max_per_digest": cfg.get("max_per_digest", 5),
            "filters": cfg.get("filters", {}),
        },
    }


@app.patch("/api/jobs/{job_id}")
def update_applied(job_id: str, body: AppliedRequest, _auth: str = Depends(require_auth)):
    cfg = read_yaml(ROOT / "config.yaml", {})
    seen_setting = os.getenv(
        "JOBHUNT_SEEN_FILE",
        str(cfg.get("seen_file", "seen.json")),
    )
    seen_path = Path(seen_setting)
    if not seen_path.is_absolute():
        seen_path = ROOT / seen_path
    tracker = read_json(seen_path, {})
    if job_id not in tracker:
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tracker[job_id]["applied"] = body.applied
    tracker[job_id]["applied_on"] = now if body.applied else None
    seen_path.write_text(json.dumps(tracker, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "job_id": job_id, "applied": body.applied}


@app.post("/api/run")
def run_agent(body: RunRequest, _auth: str = Depends(require_auth)):
    if not RUN_LOCK.acquire(blocking=False):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A job-search run is already in progress")
    cmd = [sys.executable, "-m", "jobhunt", "run"]
    try:
        if body.mode == "mock":
            cmd.extend(["--mock", "--scorer", "keyword"])
        if body.no_draft:
            cmd.append("--no-draft")
        if body.send_email and body.mode == "live":
            cmd.append("--send")
        if body.limit:
            if body.limit < 1 or body.limit > 25:
                raise HTTPException(status_code=422, detail="limit must be between 1 and 25")
            cmd.extend(["--limit", str(body.limit)])

        try:
            result = subprocess.run(
                cmd,
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Agent run timed out")

        return {
            "ok": result.returncode == 0,
            "exit_code": result.returncode,
            "output": (result.stdout + "\n" + result.stderr).strip(),
        }
    finally:
        RUN_LOCK.release()
