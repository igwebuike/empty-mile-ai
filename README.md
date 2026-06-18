# Empty Mile AI - Voice Dispatcher MVP

A Render-ready logistics AI MVP for reducing empty return miles.

## What is included

- Sleek logistics dashboard UI inspired by the warehouse/robot interface
- Voice command support using browser Web Speech API
- Gemini-powered AI dispatcher
- Google Maps route/profit support with fallback demo logic
- Fleet KPIs, load recommendations, AI response, broker email draft, and driver message draft
- FastAPI backend + Vite React frontend

## Local backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend docs:

```text
http://localhost:8000/docs
```

## Local frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Environment variables

Backend Render env:

```env
GEMINI_API_KEY=your_rotated_gemini_key
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_MAPS_API_KEY=your_rotated_maps_key
DATABASE_URL=sqlite:///./empty_mile_ai.db
CORS_ORIGINS=http://localhost:5173,https://your-frontend.onrender.com
```

Frontend Render env:

```env
VITE_API_BASE_URL=https://empty-mile-ai-api.onrender.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_javascript_key
VITE_DEMO_BROKER_EMAIL=broker@example.com
VITE_DEMO_DRIVER_PHONE=+15550100
```

## Voice command examples

Say:

```text
Truck 104 is empty in Houston at 9 AM tomorrow. Find the most profitable return load to Dallas.
```

The UI will fill truck/unit/location/destination/trailer fields and ask the AI dispatcher for a recommendation.

## Security note

If keys were ever shown in screenshots, regenerate/rotate them before using them in Render. Never commit real keys to GitHub.


## Fixes included in this build

- Voice button records speech, extracts dispatch details, and auto-runs the dispatch flow.
- AI Dispatcher calls the backend Gemini endpoint.
- Load cards auto-populate after voice, ask, or match actions.
- Broker Email button calls `/api/messages/email` using Resend when configured, otherwise returns `mock_sent`.
- Driver SMS button calls `/api/messages/sms` using Twilio when configured, otherwise returns `mock_sent`.
- Fleet map loads Google Maps when `VITE_GOOGLE_MAPS_API_KEY` is set and falls back to the styled demo map when not set.
- Backend `/health` route is available.
- Backend schemas include safe defaults to prevent common 422 errors from missing fields.
- Frontend defaults to `https://empty-mile-ai-api.onrender.com` unless `VITE_API_BASE_URL` is provided.
- Render-safe package versions and build outputs are included.
