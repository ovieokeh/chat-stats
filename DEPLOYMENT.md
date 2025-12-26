# Deployment Guide

This application consists of a Next.js frontend and a Python ML backend. Due to the size of ML models, a split deployment is recommended.

## 1. Deploy the Backend (Python ML Service)

The backend is dockerized and ready for any container hosting provider.

### Option A: Railway (Easiest)

1. Fork/Push your repo to GitHub.
2. Connect GitHub to [Railway](https://railway.app/).
3. Create a new project from your repo.
4. Railway will detect the `service/Dockerfile` (you may need to specify the root directory as `/service`).
5. Once deployed, Railway will provide a URL (e.g., `https://my-backend.up.railway.app`).

### Option B: Render or Fly.io

Follow similar steps to deploy the `service/` directory as a Docker container.

## 2. Deploy the Frontend (Vercel)

1. Push your repo to GitHub.
2. Connect GitHub to [Vercel](https://vercel.com/import).
3. In the "Environment Variables" section, add:
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://my-backend.up.railway.app`).
4. Click **Deploy**.

## 3. Configuration Check

Ensure the `NEXT_PUBLIC_API_URL` does NOT end with a trailing slash. The app will use this URL to call the `/cluster` and `/health` endpoints.

### Offline Note

Even when deployed, the app uses **IndexedDB** for chat storage and **local sentiment analysis** in the browser. The Python backend is only invoked for "Smart Topics" (clustering), ensuring most features work blazingly fast.
