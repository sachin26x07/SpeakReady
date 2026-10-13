# Deployment

The frontend deploys to Netlify and the API deploys to Render.

1. Import the repository into Netlify. `netlify.toml` configures the frontend build and client-side route fallback.
2. Create the Render web service from `render.yaml`. Set `FRONTEND_URL` to the deployed Netlify site URL (for example, `https://your-site.netlify.app`) and provide at least one AI provider key (`GROQ_API_KEY` or `GEMINI_API_KEY`). Groq uses `openai/gpt-oss-120b` by default; set `GROQ_MODEL` in the backend environment to override it.
3. After the Render service is live, set the Netlify environment variable `VITE_API_URL` to the Render service URL (for example, `https://speakready-api.onrender.com`), with no trailing slash, then trigger a new frontend deploy.

Render supplies `PORT` automatically. Provider API keys belong in Render's environment settings or the backend `.env` file for local development, not in the frontend.
