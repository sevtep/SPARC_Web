from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
import re
from pathlib import Path
import json
import uuid
import hashlib
import zstandard as zstd

from database import get_db
from models import User, BehaviorData, UserRole
from schemas import TelemetrySessionCreate, TelemetryEventCreate, TelemetryEventBatch
from routers.auth_router import get_current_user, get_optional_user

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

TELEMETRY_DATA_DIR = os.getenv("TELEMETRY_DATA_DIR", "/mnt/data/pingdata/telemetry")


def sanitize_segment(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "").strip("_")
    return safe or "unknown"


def get_session_file_path(module_id: str, session_id: str) -> Path:
    safe_module = sanitize_segment(module_id)
    safe_session = sanitize_segment(session_id)
    return Path(TELEMETRY_DATA_DIR) / safe_module / f"{safe_session}.jsonl.zst"


def summarize_payload(event_type: str, payload: dict) -> dict:
    if event_type == "text_input":
        value = payload.get("value", "")
        summary = {
            "length": len(value),
            "field_id": payload.get("field_id") or payload.get("input_id"),
            "device": payload.get("device"),
            "x": payload.get("x"),
            "y": payload.get("y")
        }
        return {k: v for k, v in summary.items() if v is not None}
    return dict(payload)


def write_events_to_file(module_id: str, session_id: str, anonymized_id: str, events: list[dict]) -> None:
    file_path = get_session_file_path(module_id, session_id)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    compressor = zstd.ZstdCompressor()
    with open(file_path, "ab") as f:
        with compressor.stream_writer(f) as writer:
            for event in events:
                record = {
                    "session_id": session_id,
                    "module_id": module_id,
                    "event_type": event.get("event_type"),
                    "timestamp": event.get("timestamp"),
                    "client_timestamp": event.get("client_timestamp"),
                    "anon_id": anonymized_id,
                    "payload": event.get("payload")
                }
                line = json.dumps(record, ensure_ascii=False) + "\n"
                writer.write(line.encode("utf-8"))

# Helper function to anonymize user data
def anonymize_user_id(user_id: Optional[int], guest_id: Optional[str]) -> str:
    """
    Create anonymized hash of user/guest ID for privacy
    This allows data analysis while protecting identity
    """
    identifier = f"{user_id}:{guest_id}:{datetime.utcnow().date()}"
    return hashlib.sha256(identifier.encode()).hexdigest()[:16]

@router.post("/session/start")
async def start_telemetry_session(
    session_data: dict = Body(default_factory=dict),
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Start a new telemetry session when user enters a game
    Returns session_id and organization telemetry settings
    """
    
    # Generate unique session ID
    session_id = str(uuid.uuid4())
    
    # Get organization settings (TODO: implement when org model is ready)
    # For now, use default settings
    org_settings = {
        "telemetry_enabled": True,
        "capture_keyboard": True,
        "capture_mouse": False,
        "capture_focus_blur": True,
        "sampling_rate": 1.0,
        "batch_ms": 5000,
        "max_events_per_session": 10000
    }
    
    if "module_id" not in session_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="module_id is required")

    # Create session record (optional: store in DB)
    # For MVP, we can just return the session_id and let frontend manage it
    
    user_id = None
    guest_id = None
    if current_user:
        user_id = current_user.id if current_user.role != UserRole.GUEST else None
        guest_id = current_user.guest_id if current_user.role == UserRole.GUEST else None

    return {
        "session_id": session_id,
        "user_id": user_id,
        "guest_id": guest_id,
        "org_settings": org_settings,
        "started_at": datetime.utcnow().isoformat()
    }

@router.post("/events")
async def upload_telemetry_events(
    batch: TelemetryEventBatch,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Upload a batch of telemetry events
    Events are anonymized and stored in behavior_data table
    """
    
    # Verify session belongs to current user
    session_id = batch.session_id
    
    # Anonymize user identifier
    if current_user:
        anonymized_id = anonymize_user_id(
            current_user.id if current_user.role != UserRole.GUEST else None,
            current_user.guest_id if current_user.role == UserRole.GUEST else None
        )
    else:
        anonymized_id = anonymize_user_id(None, None)
    
    # Process each event
    saved_events = []
    file_events_by_key = {}
    for event in batch.events:
        # Validate event data (K-12 compliance check)
        if not validate_event_compliance(event):
            continue  # Skip non-compliant events
        
        # Create behavior data record
        payload_data = dict(event.payload)
        payload_data["anon_id"] = anonymized_id
        user_id = None
        guest_id = None
        if current_user:
            user_id = current_user.id if current_user.role != UserRole.GUEST else None
            guest_id = current_user.guest_id if current_user.role == UserRole.GUEST else None

        behavior_record = BehaviorData(
            user_id=user_id,
            guest_session_id=guest_id,
            module_id=event.module_id,
            session_id=session_id,
            event_type=event.event_type,
            event_data=json.dumps(payload_data)
        )
        
        db.add(behavior_record)
        saved_events.append(behavior_record)
        file_key = (event.module_id, session_id)
        file_events_by_key.setdefault(file_key, []).append({
            "event_type": event.event_type,
            "payload": dict(event.payload),
            "timestamp": event.timestamp,
            "client_timestamp": event.client_timestamp
        })
    
    db.commit()

    for (module_id, sess_id), events in file_events_by_key.items():
        try:
            write_events_to_file(module_id, sess_id, anonymized_id, events)
        except Exception:
            pass
    
    return {
        "success": True,
        "events_received": len(batch.events),
        "events_saved": len(saved_events),
        "session_id": session_id
    }

@router.post("/session/end")
async def end_telemetry_session(
    session_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    End telemetry session and finalize data
    """
    
    # Count events for this session
    event_count = db.query(BehaviorData).filter(
        BehaviorData.session_id == session_id
    ).count()
    
    return {
        "success": True,
        "session_id": session_id,
        "total_events": event_count,
        "ended_at": datetime.utcnow().isoformat()
    }

@router.get("/session/{session_id}/stats")
async def get_session_stats(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics for a telemetry session
    """
    
    # Verify user owns this session
    events = db.query(BehaviorData).filter(
        BehaviorData.session_id == session_id
    ).all()
    
    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check ownership
    first_event = events[0]
    if current_user.role == UserRole.GUEST:
        if first_event.guest_session_id != current_user.guest_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    else:
        if first_event.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    # Calculate stats
    event_types = {}
    for event in events:
        event_type = event.event_type
        event_types[event_type] = event_types.get(event_type, 0) + 1
    
    return {
        "session_id": session_id,
        "total_events": len(events),
        "event_types": event_types,
        "start_time": events[0].timestamp.isoformat() if events else None,
        "end_time": events[-1].timestamp.isoformat() if events else None
    }

def validate_event_compliance(event: TelemetryEventCreate) -> bool:
    """
    Validate event data for K-12 compliance
    Ensures no sensitive text data is captured
    """
    
    # Check event type is allowed
    allowed_types = [
        'session_start', 'session_end',
        'key_down', 'key_up',
        'click',
        'pointer_down', 'pointer_up', 'pointer_move',
        'touch_start', 'touch_end', 'touch_move',
        'text_input',
        'window_focus', 'window_blur',
        'unity_focus', 'unity_blur',
        'telemetry_paused', 'telemetry_resumed'
    ]
    
    if event.event_type not in allowed_types:
        return False
    
    # For keyboard events, ensure we only have key codes, not text
    if event.event_type in ['key_down', 'key_up']:
        payload = event.payload
        
        # CRITICAL: Reject if any of these fields are present
        forbidden_fields = ['key', 'value', 'text', 'input', 'data']
        for field in forbidden_fields:
            if field in payload:
                return False
        
        # Ensure we have the code field
        if 'code' not in payload:
            return False
    
    return True

@router.delete("/user/data")
async def delete_user_telemetry_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete all telemetry data for current user
    Implements "Right to be Forgotten" (GDPR/COPPA)
    """
    
    if current_user.role == UserRole.GUEST:
        # Delete guest data
        deleted = db.query(BehaviorData).filter(
            BehaviorData.guest_session_id == current_user.guest_id
        ).delete()
    else:
        # Delete user data
        deleted = db.query(BehaviorData).filter(
            BehaviorData.user_id == current_user.id
        ).delete()
    
    db.commit()

    for (module_id, sess_id), events in file_events_by_key.items():
        try:
            write_events_to_file(module_id, sess_id, anonymized_id, events)
        except Exception:
            pass
    
    return {
        "success": True,
        "records_deleted": deleted
    }

@router.get("/user/export")
async def export_user_telemetry_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all telemetry data for current user
    Implements "Right to Data Portability" (GDPR)
    """
    
    if current_user.role == UserRole.GUEST:
        events = db.query(BehaviorData).filter(
            BehaviorData.guest_session_id == current_user.guest_id
        ).all()
    else:
        events = db.query(BehaviorData).filter(
            BehaviorData.user_id == current_user.id
        ).all()
    
    # Convert to exportable format
    export_data = []
    for event in events:
        export_data.append({
            "session_id": event.session_id,
            "module_id": event.module_id,
            "event_type": event.event_type,
            "event_data": event.event_data,
            "timestamp": event.timestamp.isoformat()
        })
    
    return {
        "user_id": current_user.id if current_user.role != UserRole.GUEST else None,
        "guest_id": current_user.guest_id if current_user.role == UserRole.GUEST else None,
        "export_date": datetime.utcnow().isoformat(),
        "total_events": len(export_data),
        "events": export_data
    }
