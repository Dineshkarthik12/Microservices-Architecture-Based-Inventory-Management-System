import smtplib
from email.message import EmailMessage

from fastapi import BackgroundTasks, FastAPI

from .config import settings
from .schemas import SendEmailRequest

app = FastAPI(title="Notification Service", version="1.0.0")


def _send_email_sync(payload: SendEmailRequest):
    msg = EmailMessage()
    msg["Subject"] = payload.subject
    msg["From"] = settings.smtp_from
    msg["To"] = payload.email
    msg.set_content(payload.message)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/send-email")
async def send_email(payload: SendEmailRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_send_email_sync, payload)
    return {"queued": True}
