# Hosting & Live Demo Options

## GitHub Pages (static demo)
The UI can run entirely from static hosting using the embedded demo trace.

- Build env: `BASE_PATH=/<repo>/` and `VITE_FORCE_DEMO=1`
- Workflow: `.github/workflows/deploy-pages.yml`
- Note: GitHub Pages for private repos requires a Pro/Team/Enterprise plan. On Free, use a public demo repo or another host.

## Codespaces (instant live preview)
Codespaces boots the full stack and exposes the UI on port 5173.

- Devcontainer: `.devcontainer/devcontainer.json`
- Startup: `scripts/codespaces-start.sh`

## Cloudflare Pages (static demo)
Use the same static build output as GitHub Pages.

- Build command: `pnpm -C ui install && BASE_PATH=/ VITE_FORCE_DEMO=1 pnpm -C ui build`
- Output folder: `ui/dist`

## Render (full stack)
Host the Python API and static UI separately.

- API start: `python3 server/main.py`
- UI build: `pnpm -C ui install && pnpm -C ui build`

Once the API URL is known, set `VITE_API_BASE` for the UI build.
