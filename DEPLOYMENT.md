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

## Temporary read-only test mode

Only enable this briefly. It makes the candidate profile and tracker readable
without signing in, so anyone with the site URL can view that data. Job updates
and agent runs remain protected.

Set both variables, then redeploy both services:

- Render: `JOBHUNT_TEST_READ_ONLY=true`
- Vercel: `VITE_TEST_READ_ONLY=true` (Config, not Secret)

After confirming the frontend/backend connection, remove the Vercel variable
and set Render's variable to `false` (or remove it), then redeploy both services
to restore normal login.
