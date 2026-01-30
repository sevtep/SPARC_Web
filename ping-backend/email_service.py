import os
import smtplib
from email.message import EmailMessage


def send_email(recipient: str, subject: str, body: str) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", user)
    sender_name = os.getenv("SMTP_FROM_NAME")
    use_tls = os.getenv("SMTP_TLS", "true").lower() == "true"
    use_ssl = os.getenv("SMTP_SSL", "false").lower() == "true"

    if not host or not sender:
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    message["Subject"] = subject
    if sender_name:
        message["From"] = f"{sender_name} <{sender}>"
    else:
        message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    if use_ssl:
        server = smtplib.SMTP_SSL(host, port)
    else:
        server = smtplib.SMTP(host, port)

    try:
        server.ehlo()
        if use_tls and not use_ssl:
            server.starttls()
            server.ehlo()
        if user and password:
            server.login(user, password)
        server.send_message(message)
    finally:
        server.quit()


def render_template(content: str, context: dict) -> str:
    result = content
    for key, value in context.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result
