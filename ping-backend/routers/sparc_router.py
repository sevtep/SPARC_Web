from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
import json
import os

from database import get_db
from models import (
    User,
    UserRole,
    InviteCode,
    InviteRole,
    InviteUse,
    Class,
    ClassStudent,
    SparcWordGameScore,
    SparcGameSession,
)
from auth import verify_password, get_password_hash, create_access_token, verify_token

router = APIRouter(prefix="/api/sparc", tags=["sparc"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/sparc/auth/login")


class SparcLoginIn(BaseModel):
    email: str
    password: str


class SparcRegisterIn(BaseModel):
    username: str
    email: str
    password: str
    invite_code: str
    role: str | None = None
    school: str | None = None
    course: str | None = None
    bio: str | None = None
    avatar: str | None = None


class SparcPasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str


class SparcProfileUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    school: str | None = None
    course: str | None = None
    bio: str | None = None
    avatar: str | None = None


class SparcSessionStart(BaseModel):
    slug: str | None = None
    gameId: str | None = None
    score: int | None = None
    metadata: dict | None = None


class SparcSessionUpdate(BaseModel):
    score: int | None = None
    completed: bool | None = None
    metadata: dict | None = None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    email = payload.get("sub")
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    elif email:
        user = db.query(User).filter(User.email == email).first()
    else:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(current_user: User):
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


def map_sparc_role(user: User) -> str:
    if user.role in [UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN]:
        return "admin"
    if user.role == UserRole.TEACHER:
        return "teacher"
    return "student"


def build_sparc_user(db: Session, user: User) -> dict:
    username = user.username or (user.email.split("@")[0] if user.email else "user")
    total_score = db.query(func.coalesce(func.sum(SparcWordGameScore.score), 0)).filter(
        SparcWordGameScore.player_name == username
    ).scalar() or 0
    games_played = db.query(func.count(SparcGameSession.id)).filter(
        SparcGameSession.user_id == user.id
    ).scalar() or 0
    total_play_time = 0

    return {
        "id": user.id,
        "email": user.email,
        "username": username,
        "role": map_sparc_role(user),
        "school": user.school,
        "course": user.course,
        "bio": user.bio,
        "avatar": user.avatar,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "stats": {
            "gamesPlayed": games_played,
            "totalScore": total_score,
            "totalPlayTime": total_play_time,
        },
        "achievements": [],
    }


def get_game_catalog():
    return [
        {
            "_id": "forces-motion-basics",
            "name": "Forces and Motion: Basics",
            "slug": "forces-motion-basics",
            "shortDescription": "Learn core physics concepts with driving dynamics.",
            "category": "physics",
            "difficulty": "medium",
            "estimatedTime": 30,
            "gradeLevel": ["6", "7", "8", "9"],
            "gameUrl": "https://ping.agaii.org/games/Force&Motion/index.html",
            "statistics": {"totalPlays": 0},
            "emoji": "🏎️",
            "color": "#00D4FF",
            "isMainStory": True,
            "chapter": "Core Module",
        }
    ]


def get_game_detail(slug: str) -> dict | None:
    details = {
        "forces-motion-basics": {
            "name": "Forces and Motion: Basics",
            "slug": "forces-motion-basics",
            "description": "Explore forces, motion, and momentum with an interactive driving simulator.",
            "category": "physics",
            "difficulty": "medium",
            "estimatedTime": 30,
            "gradeLevel": ["6", "7", "8", "9"],
            "gameUrl": "https://ping.agaii.org/games/Force&Motion/index.html",
            "learningObjectives": [
                "Understand forces and motion",
                "Apply momentum and acceleration concepts",
                "Experiment with physics in a driving context",
            ],
            "statistics": {"totalPlays": 0, "averageScore": 0},
        }
    }
    return details.get(slug)


@router.post("/auth/login")
def sparc_login(payload: SparcLoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.email == payload.email, User.username == payload.email)
    ).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value}
    )
    return {"token": token, "user": build_sparc_user(db, user)}


@router.post("/auth/register")
def sparc_register(payload: SparcRegisterIn, request: Request, db: Session = Depends(get_db)):
    invite = db.query(InviteCode).filter(
        InviteCode.code == payload.invite_code,
        InviteCode.is_active == True
    ).first()

    if not invite:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite code")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite code has expired")
    if invite.max_uses is not None and invite.uses >= invite.max_uses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite code usage limit reached")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    role = UserRole.STUDENT
    if invite.role == InviteRole.TEACHER:
        role = UserRole.TEACHER

    organization_id = invite.organization_id
    class_obj = None
    if invite.role == InviteRole.STUDENT and invite.class_id:
        class_obj = db.query(Class).filter(Class.id == invite.class_id).first()
        if not class_obj or not class_obj.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite class is not available")
        organization_id = class_obj.organization_id

    new_user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.username,
        school=payload.school,
        course=payload.course,
        bio=payload.bio,
        avatar=payload.avatar,
        hashed_password=get_password_hash(payload.password),
        role=role,
        is_verified=False,
        organization_id=organization_id
    )
    db.add(new_user)
    db.flush()

    if invite.role == InviteRole.STUDENT and class_obj:
        db.add(ClassStudent(
            class_id=class_obj.id,
            user_id=new_user.id,
            invite_id=invite.id,
            invited_by=invite.created_by
        ))

    invite.uses += 1
    db.add(InviteUse(
        invite_id=invite.id,
        user_id=new_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))

    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        data={"sub": new_user.email, "user_id": new_user.id, "role": new_user.role.value}
    )
    return {"success": True, "token": token, "user": build_sparc_user(db, new_user)}


@router.get("/auth/me")
def sparc_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"user": build_sparc_user(db, current_user)}


@router.put("/auth/password")
def sparc_update_password(
    payload: SparcPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.currentPassword, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password")
    current_user.hashed_password = get_password_hash(payload.newPassword)
    db.commit()
    return {"success": True}


@router.get("/users/profile")
def sparc_get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"user": build_sparc_user(db, current_user)}


@router.put("/users/profile")
def sparc_update_profile(
    payload: SparcProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.username:
        current_user.username = payload.username
    if payload.email:
        current_user.email = payload.email
    if payload.school is not None:
        current_user.school = payload.school
    if payload.course is not None:
        current_user.course = payload.course
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.avatar is not None:
        current_user.avatar = payload.avatar
    db.commit()
    db.refresh(current_user)
    user_payload = build_sparc_user(db, current_user)
    return {"user": user_payload, "data": user_payload}


@router.get("/users/leaderboard")
def sparc_leaderboard(db: Session = Depends(get_db), limit: int = 20):
    scores = db.query(SparcWordGameScore).all()
    stats = {}
    for score in scores:
        name = score.player_name
        if name not in stats:
            stats[name] = {
                "playerName": name,
                "totalScore": 0,
                "gamesPlayed": 0,
                "bestScore": 0,
                "lastPlayed": None,
            }
        stats[name]["totalScore"] += score.score
        stats[name]["gamesPlayed"] += 1
        stats[name]["bestScore"] = max(stats[name]["bestScore"], score.score)
        if score.played_at and (not stats[name]["lastPlayed"] or score.played_at > stats[name]["lastPlayed"]):
            stats[name]["lastPlayed"] = score.played_at

    leaderboard = list(stats.values())
    leaderboard.sort(key=lambda item: item["totalScore"], reverse=True)
    leaderboard = leaderboard[:limit]
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
        entry["avgScore"] = round(entry["totalScore"] / max(entry["gamesPlayed"], 1), 1)
    return {"success": True, "data": leaderboard}


@router.get("/users/search/{query}")
def sparc_search_users(query: str, db: Session = Depends(get_db)):
    users = db.query(User).filter(
        or_(User.email.ilike(f"%{query}%"), User.username.ilike(f"%{query}%"))
    ).limit(20).all()
    return {"data": [build_sparc_user(db, user) for user in users]}


@router.get("/users/{user_id}")
def sparc_get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"user": build_sparc_user(db, user)}


@router.get("/users/{user_id}/history")
def sparc_user_history(user_id: int, db: Session = Depends(get_db)):
    sessions = db.query(SparcGameSession).filter(SparcGameSession.user_id == user_id).order_by(
        SparcGameSession.started_at.desc()
    ).all()
    return {"data": [session_to_payload(db, session) for session in sessions]}


def session_to_payload(db: Session, session: SparcGameSession) -> dict:
    game = get_game_detail(session.game_slug) or {"name": session.game_slug}
    return {
        "_id": session.id,
        "score": session.score,
        "completed": session.completed,
        "createdAt": session.started_at.isoformat() if session.started_at else None,
        "gameModule": {
            "title": game.get("name"),
            "icon": "🎮",
        },
    }


@router.get("/games")
def sparc_games():
    return {"games": get_game_catalog()}


@router.get("/games/knowledge-map")
def sparc_knowledge_map():
    return {"nodes": [], "edges": []}


@router.get("/games/{slug}")
def sparc_game_detail(slug: str):
    game = get_game_detail(slug)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return {"game": game}


@router.post("/games/session/start")
def sparc_start_session(
    payload: SparcSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slug = payload.slug or payload.gameId or "unknown"
    session = SparcGameSession(
        user_id=current_user.id,
        game_slug=slug,
        score=payload.score or 0,
        metadata_json=payload.metadata
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"data": session_to_payload(db, session)}


@router.put("/games/session/{session_id}")
def sparc_update_session(
    session_id: int,
    payload: SparcSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(SparcGameSession).filter(
        SparcGameSession.id == session_id,
        SparcGameSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if payload.score is not None:
        session.score = payload.score
    if payload.completed is not None:
        session.completed = payload.completed
        if payload.completed and not session.ended_at:
            session.ended_at = datetime.utcnow()
    if payload.metadata is not None:
        session.metadata_json = payload.metadata
    db.commit()
    db.refresh(session)
    return {"data": session_to_payload(db, session)}


@router.get("/games/session/history")
def sparc_session_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(SparcGameSession).filter(
        SparcGameSession.user_id == current_user.id
    ).order_by(SparcGameSession.started_at.desc()).all()
    return {"data": [session_to_payload(db, session) for session in sessions]}


@router.get("/games/sessions/my")
def sparc_my_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(SparcGameSession).filter(
        SparcGameSession.user_id == current_user.id
    ).order_by(SparcGameSession.started_at.desc()).all()
    return {"data": [session_to_payload(db, session) for session in sessions]}


@router.get("/achievements/my")
def sparc_my_achievements():
    return {"data": []}


@router.get("/wordgame-scores/stats")
def sparc_wordgame_stats(db: Session = Depends(get_db)):
    scores = db.query(SparcWordGameScore).all()
    if not scores:
        return {
            "success": True,
            "data": {
                "overview": {"totalGames": 0, "uniquePlayers": 0, "avgScore": 0, "highestScore": 0},
                "byScene": [],
            },
        }
    total_games = len(scores)
    players = {score.player_name for score in scores}
    total_score = sum(score.score for score in scores)
    highest_score = max(score.score for score in scores)
    avg_score = round(total_score / total_games, 1)
    by_scene = {}
    for score in scores:
        scene = score.scene or "Unknown"
        by_scene.setdefault(scene, []).append(score.score)
    return {
        "success": True,
        "data": {
            "overview": {
                "totalGames": total_games,
                "uniquePlayers": len(players),
                "avgScore": avg_score,
                "highestScore": highest_score,
            },
            "byScene": [
                {
                    "scene": scene,
                    "count": len(values),
                    "avgScore": round(sum(values) / len(values), 1),
                }
                for scene, values in by_scene.items()
            ],
        },
    }


@router.get("/wordgame-scores/leaderboard")
def sparc_wordgame_leaderboard(db: Session = Depends(get_db), limit: int = 20, scene: str | None = None):
    scores = db.query(SparcWordGameScore).all()
    if scene and scene != "all":
        scores = [score for score in scores if (score.scene or "Unknown") == scene]
    stats = {}
    for score in scores:
        name = score.player_name
        stats.setdefault(name, {"playerName": name, "totalScore": 0, "gamesPlayed": 0, "bestScore": 0, "lastPlayed": None})
        stats[name]["totalScore"] += score.score
        stats[name]["gamesPlayed"] += 1
        stats[name]["bestScore"] = max(stats[name]["bestScore"], score.score)
        if score.played_at and (not stats[name]["lastPlayed"] or score.played_at > stats[name]["lastPlayed"]):
            stats[name]["lastPlayed"] = score.played_at

    leaderboard = list(stats.values())
    leaderboard.sort(key=lambda item: item["totalScore"], reverse=True)
    leaderboard = leaderboard[:limit]
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
        entry["avgScore"] = round(entry["totalScore"] / max(entry["gamesPlayed"], 1), 1)
    return {"success": True, "data": leaderboard}


@router.get("/wordgame-scores/scores")
def sparc_wordgame_scores(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 100,
    scene: str | None = None,
    playerName: str | None = None,
):
    query = db.query(SparcWordGameScore)
    if scene and scene != "all":
        query = query.filter(SparcWordGameScore.scene == scene)
    if playerName:
        query = query.filter(SparcWordGameScore.player_name.ilike(f"%{playerName}%"))
    total = query.count()
    scores = query.order_by(SparcWordGameScore.played_at.desc().nullslast()).offset((page - 1) * limit).limit(limit).all()
    data = [
        {
            "playerName": score.player_name,
            "score": score.score,
            "scene": score.scene,
            "playedAt": score.played_at.isoformat() if score.played_at else None,
        }
        for score in scores
    ]
    return {
        "success": True,
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": max(1, (total + limit - 1) // limit),
        },
    }


@router.get("/reports/schools")
def sparc_report_schools():
    return {"data": []}


@router.get("/reports/courses")
def sparc_report_courses():
    return {"data": []}


@router.get("/reports/wordgame/class")
def sparc_report_wordgame_class():
    return {"data": []}


@router.get("/reports/wordgame/student/{student_id}")
def sparc_report_wordgame_student(student_id: str):
    return {"data": []}


@router.get("/reports/student/{student_id}")
def sparc_report_student(student_id: str):
    return {"data": []}


@router.get("/reports/class")
def sparc_report_class():
    return {"data": []}


@router.get("/reports/export/{student_id}")
def sparc_report_export(student_id: str):
    return {"data": []}


@router.get("/admin/dashboard")
def sparc_admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_admin(current_user)
    user_count = db.query(func.count(User.id)).scalar() or 0
    game_sessions = db.query(func.count(SparcGameSession.id)).scalar() or 0
    return {"data": {"users": user_count, "sessions": game_sessions}}


@router.get("/admin/users")
def sparc_admin_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_admin(current_user)
    users = db.query(User).order_by(User.id.desc()).all()
    return {"data": [build_sparc_user(db, user) for user in users]}


@router.put("/admin/users/{user_id}")
def sparc_admin_update_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if "role" in payload:
        role_map = {
            "admin": UserRole.PLATFORM_ADMIN,
            "teacher": UserRole.TEACHER,
            "student": UserRole.STUDENT,
        }
        if payload["role"] in role_map:
            user.role = role_map[payload["role"]]
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    db.commit()
    db.refresh(user)
    return {"user": build_sparc_user(db, user)}


@router.delete("/admin/users/{user_id}")
def sparc_admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    db.commit()
    return {"success": True}


@router.post("/admin/users/{user_id}/restore")
def sparc_admin_restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    db.commit()
    return {"success": True}


def seed_wordgame_scores(db: Session):
    data_path = os.getenv("SPARC_WORDGAME_DATA_PATH", "/www/wwwroot/game.agaii.org/backend/wordgame-data.json")
    if not os.path.exists(data_path):
        return
    if db.query(SparcWordGameScore).first():
        return

    try:
        with open(data_path, "r", encoding="utf-8") as handle:
            records = json.load(handle)
    except Exception:
        return

    for record in records:
        played_at = None
        if record.get("playedAt"):
            try:
                played_at = datetime.fromisoformat(record["playedAt"].replace("Z", "+00:00"))
            except ValueError:
                played_at = None
        db.add(SparcWordGameScore(
            player_name=record.get("playerName") or "Unknown",
            score=record.get("score") or 0,
            scene=record.get("scene"),
            played_at=played_at,
            original_id=record.get("originalId"),
        ))
    db.commit()
