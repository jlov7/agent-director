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

## Vercel (static demo)
Deploys the Vite UI as a static site with demo data baked in.

- Config: `vercel.json`
- Env vars: `VITE_FORCE_DEMO=1`, `VITE_HIDE_BUILD_DATE=1`
- Linked project: `jlov7s-projects/agent-director` (`agent-director.vercel.app`)
- Toolchain pin: root `package.json` enforces `packageManager: pnpm@10.29.3`
- Install command: `corepack pnpm install --frozen-lockfile`
- Build command: `pnpm -C ui build`
- Output directory: `ui/dist`

### Vercel deploy workflow (recommended)

1. Verify local build:
   - `pnpm -C ui install`
   - `pnpm -C ui build`
2. Verify Vercel project/link:
   - `vercel whoami`
   - `vercel project inspect agent-director`
3. Deploy:
   - Preview: `vercel deploy -y`
   - Production: `vercel deploy --prod -y`
4. Inspect deployment logs:
   - `vercel inspect agent-director.vercel.app --logs`
5. Confirm latest project deployments:
   - `vercel ls agent-director`
6. Run deterministic production status check:
   - `make vercel-check`

### Vercel quality checks

- Keep `VITE_FORCE_DEMO=1` in Preview and Production for a deterministic public demo.
- Keep `VITE_HIDE_BUILD_DATE=1` in Preview and Production for stable visuals/screenshots.
- `vercel.json` enforces security headers on all responses and immutable cache headers for `/assets/*`.
- Production alias should resolve to `https://agent-director.vercel.app`.
- `make vercel-check` should return `Vercel deployment check: PASS` before release sign-off.

## Render (full stack)
Host the Python API and static UI separately.

- API start: `python3 server/main.py`
- UI build: `pnpm -C ui install && pnpm -C ui build`

Once the API URL is known, set `VITE_API_BASE` for the UI build.
