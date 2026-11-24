# Deploying Job Hunt

## Backend on Render

1. Create a new **Web Service** from this repository.
2. Set the runtime to **Python**.
3. Use:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add `ALLOWED_ORIGINS` with the Vercel frontend URL, for example:
   `https://jobhunt.vercel.app`
   Add `JOBHUNT_PASSWORD` with a strong, unique workspace password.
5. Deploy. The API health endpoint is `/api/health`.

Keep provider keys and mail settings on Render, never in the frontend.
For live dashboard runs, also set `SMTP_USER`, `SMTP_PASS`, and `MAIL_TO`.
Use a Gmail App Password for `SMTP_PASS`, not the account password.

## Frontend on Vercel

1. Import the same repository in Vercel.
2. Set the root directory to `frontend`.
3. Set `VITE_API_URL` to the Render service URL, without a trailing slash.
4. Deploy.

The frontend keeps a restrained demo fallback available if the API is not
configured yet, so previews remain useful during setup.
