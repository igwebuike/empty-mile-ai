# Empty Mile AI — World-Class MVP Rebuild

AI-native logistics platform for dispatchers, drivers, documents, messaging, voice commands, maps, and heuristic load matching.

## Backend Render service
Root Directory: `backend`
Build Command: `pip install -r requirements.txt`
Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Recommended envs:
```
DATABASE_URL=sqlite:///./empty_mile_ai.db
CORS_ORIGINS=*
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_MAPS_API_KEY=
ROUTES_API_KEY=
RESEND_API_KEY=
FROM_EMAIL=dispatch@emptymileai.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

## Frontend Render static site
Root Directory: `frontend`
Build Command: `npm install && npm run build`
Publish Directory: `dist`

Recommended envs:
```
VITE_API_BASE_URL=https://api.emptymileai.com
VITE_GOOGLE_MAPS_API_KEY=
VITE_TEST_EMAIL=
VITE_TEST_PHONE=
```

## Included features
- Login / create workspace demo flow
- Role-aware dashboards: Admin, Dispatcher, Driver, Broker
- AI-first dispatcher command center
- Browser speech recognition
- Voice extraction via backend
- Heuristic load generator
- Load recommendations and broker/driver drafts
- Resend email endpoint integration
- Twilio SMS endpoint integration
- Document Hub with upload endpoint
- Messaging center for driver/broker/shipper
- Google Maps embed when key is configured
- Render-safe dependency pins
