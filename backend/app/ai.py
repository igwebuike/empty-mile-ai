import httpx
from .config import get_settings

SYSTEM_PROMPT = """You are Empty Mile AI, an expert logistics dispatcher assistant.
Your job is to help dispatchers reduce empty miles, find profitable return loads, estimate profit, and recommend practical dispatch decisions.
Speak clearly like a senior dispatcher. Be concise but useful.
When ranking loads, consider route fit, trailer fit, capacity, pickup timing, deadhead miles, loaded miles, rate per mile, fuel cost, and estimated net profit.
Never invent live load-board availability. Only use the candidate loads provided by the application.
"""

async def generate_dispatcher_answer(message: str, match_summaries: list[str]) -> str:
    settings = get_settings()
    context = "\n".join(match_summaries[:7]) or "No candidate loads are currently available."
    fallback = (
        "Dispatcher recommendation based on current candidate loads:\n\n"
        f"{context}\n\n"
        "Prioritize the match with strong net profit, low deadhead, correct trailer type, capacity fit, and pickup timing the driver can realistically meet."
    )
    if not settings.gemini_api_key:
        return fallback

    prompt = f"""{SYSTEM_PROMPT}

Dispatcher request:
{message}

Candidate load matches:
{context}

Return a practical answer with:
1. Best load
2. Estimated profit
3. Why it wins
4. Dispatcher next step
"""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
        async with httpx.AsyncClient(timeout=12) as client:
            res = await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.25, "maxOutputTokens": 900},
                },
            )
            res.raise_for_status()
            data = res.json()
            parts = data["candidates"][0]["content"].get("parts", [])
            return "\n".join(p.get("text", "") for p in parts).strip() or fallback
    except Exception:
        return fallback
