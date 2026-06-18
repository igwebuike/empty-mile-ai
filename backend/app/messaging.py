import base64
import httpx
from .config import get_settings

async def send_email(to: str, subject: str, body: str):
    settings = get_settings()
    if not settings.resend_api_key:
        return {"status": "mock_sent", "channel": "email", "to": to, "subject": subject, "detail": "RESEND_API_KEY not configured; email simulated."}
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"},
            json={"from": settings.from_email, "to": [to], "subject": subject, "text": body},
        )
        res.raise_for_status()
        return {"status": "sent", "channel": "email", "provider_response": res.json()}

async def send_sms(to: str, body: str):
    settings = get_settings()
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
        return {"status": "mock_sent", "channel": "sms", "to": to, "detail": "Twilio env vars not configured; SMS simulated."}
    token = base64.b64encode(f"{settings.twilio_account_sid}:{settings.twilio_auth_token}".encode()).decode()
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            url,
            headers={"Authorization": f"Basic {token}"},
            data={"From": settings.twilio_from_number, "To": to, "Body": body},
        )
        res.raise_for_status()
        return {"status": "sent", "channel": "sms", "provider_response": res.json()}
