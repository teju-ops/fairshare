# FairShare

Monorepo for the FairShare frontend and backend.

## Apps

- `FairShare/fairshare-frontend`: React + Vite client
- `FairShare/fairshare-backend`: Express API

## Local development

Frontend:

```bash
cd FairShare/fairshare-frontend
npm install
npm run dev
```

Backend:

```bash
cd FairShare/fairshare-backend
npm install
npm run dev
```

## Deployment

- Frontend is configured for Netlify with `netlify.toml`
- Backend is configured for Render with `render.yaml`
- Set `VITE_API_BASE_URL` on Netlify if you want to override the default Render API URL
