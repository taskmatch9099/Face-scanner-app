# Skin Health AI Integration (Replacement)

This replaces the previous face-scanner implementation with the uploaded `skin-health-ai.zip` as the new, authoritative service. It adds a Python FastAPI backend, Docker support, a typed frontend client, and CI sanity checks.

## Layout

- `integrations/skin-health-ai/backend` – FastAPI backend (from zip, runs as microservice)
- `integrations/skin-health-ai/frontend` – Optional UI (from zip; kept separate)
- `frontend/src/services/skinHealthApi.ts` – Typed client for image analysis
- `frontend/src/pages/SkinHealthDemo.tsx` – Minimal UI to upload an image and view results
- `integrations/skin-health-ai/backend/Dockerfile` – Reproducible backend image
- `docker-compose.skin-health-ai.yml` – Dev compose
- `scripts/setup-skin-health-ai.sh` – One-shot extraction from the uploaded zip
- `.github/workflows/skin-health-ai.yml` – CI import checks

## Prerequisites

- Python 3.10+ (3.11 recommended)
- Node 18+ (if using the demo UI)
- System libs for OpenCV:
  - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y libgl1 libglib2.0-0 libjpeg62-turbo libpng16-16`
  - macOS: `brew install opencv jpeg libpng`
  - Windows: Prefer WSL2 or run via Docker (recommended)

## 1) Extract the uploaded zip

```bash
bash scripts/setup-skin-health-ai.sh
# Creates:
#   integrations/skin-health-ai/backend/...
#   integrations/skin-health-ai/frontend/...
```

## 2) Run backend (native)

```bash
cd integrations/skin-health-ai/backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install --upgrade pip wheel setuptools

if [ -f requirements.txt ]; then
  pip install -r requirements.txt
else
  pip install \
    fastapi uvicorn[standard] python-multipart \
    opencv-python numpy scipy matplotlib pillow \
    pydantic scikit-image
fi

uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# Visit http://localhost:8001/docs to confirm endpoints
```

Expected endpoints:
- POST `/api/analysis/face` (multipart/form-data with `file`) → `{ face_analyses: [...] }`
- GET `/docs` (Swagger UI), optional `GET /health`

## 3) Frontend dev proxy (Vite)

Add to your `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api/skin-health': {
      target: 'http://localhost:8001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/skin-health/, ''),
    },
  },
},
```

## 4) Use the client

```ts
import { analyzeImage } from '@/services/skinHealthApi';

const res = await analyzeImage(file); // File or Blob
console.log(res.face_analyses);
```

## 5) Docker (recommended)

```bash
docker compose -f docker-compose.skin-health-ai.yml up --build
# Backend up at http://localhost:8001
```

## CI

CI validates imports (opencv, fastapi, numpy, etc.) for reliability.

## Notes

- Do not commit secrets; ensure `.env` is gitignored.
- For assets/models >50MB, use Git LFS.
- This PR replaces the prior face-scanner path with a service-backed approach using the uploaded zip as source-of-truth.
