# Deploying Job Hunt

## Backend on Render

1. Create a new **Web Service** from this repository.
2. Set the runtime to **Python**.
3. Use:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Set `ALLOWED_ORIGINS` to the exact Production domain shown by the separate
   frontend's Vercel project, with no trailing slash.
5. Set `JOBHUNT_PASSWORD` to a new strong, unique workspace password. If you
   don't know the old value, replace it here; Render does not reveal saved
   secret values.
6. Deploy. The API health endpoint is `/api/health`.

Keep provider keys and mail settings on Render, never in the frontend.
For live dashboard runs, also set `SMTP_USER`, `SMTP_PASS`, and `MAIL_TO`.
Use a Gmail App Password for `SMTP_PASS`, not the account password.

## Frontend on Vercel

The frontend lives in the separate `Personal_job_search_agent_frontend`
repository. Import that repository into Vercel with root directory `./` and
build command `npm run build`. Set `VITE_API_URL` to the Render service URL as
a Config variable. The login screen and API authentication are enabled.
