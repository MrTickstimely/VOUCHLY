# Vouchly frontend

Next.js 16 (App Router), React 19 and Tailwind 3. Requires Node 20.9 or newer. No external fonts, scripts or trackers.

    cp .env.example .env.local   # set your domain, company name, contact email, jurisdiction
    npm install
    npm run dev

Routes: `/` (public), `/privacy`, `/terms`, and the workspace at `/queue`, `/submit`, `/review/[id]`.
The workspace runs on sample data in `lib/data.js`, shaped like `backend/app/db/models.py`.
Swap `mockReview` and the actions in `lib/store.js` for FastAPI calls when the endpoints exist.

## Connecting to the backend

Set `NEXT_PUBLIC_API_URL` in `.env.local` (for example `http://localhost:8000`) and start the backend with `uvicorn app.main:app --reload` from `backend/`.
Leave it empty to use sample data. The backend's CORS list in `app/main.py` must include the origin the frontend runs on.

`lib/api.js` only contains endpoints that exist in the backend today: `GET /health`, `GET /workspace/ai-disclosure` and `POST /content/{id}/review`.
The sidebar shows the connection state and the AI provider the backend reports. Items with a `remoteId` get a "Run check again" button on the review screen.

Still missing in the backend, so still sample data here: sign in, content list and create, finding decisions, comments, approvals and knowledge source upload.
When login exists, call `setToken()` from `lib/api.js` after sign in.
