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
VITE_API_BASE_URL=https://your-backend.onrender.com
```

## Voice command examples

Say:

```text
Truck 104 is empty in Houston at 9 AM tomorrow. Find the most profitable return load to Dallas.
```

The UI will fill truck/unit/location/destination/trailer fields and ask the AI dispatcher for a recommendation.

## Security note

If keys were ever shown in screenshots, regenerate/rotate them before using them in Render. Never commit real keys to GitHub.
