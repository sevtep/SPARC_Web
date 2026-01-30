from sqlalchemy.orm import Session

from models import App

DEFAULT_APPS = [
    {
        "slug": "ping",
        "name": "PING Web",
        "description": "Primary learning portal",
        "base_url": "https://ping.agaii.org",
        "source_type": "ping"
    },
    {
        "slug": "sparc",
        "name": "SPARC Web",
        "description": "SPARC learning experience",
        "base_url": "https://game.agaii.org",
        "source_type": "sparc"
    }
]


def ensure_default_apps(db: Session):
    existing = {app.slug for app in db.query(App).all()}
    for app_data in DEFAULT_APPS:
        if app_data["slug"] not in existing:
            db.add(App(**app_data))
    db.commit()
