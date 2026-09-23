# One Nation, One Athlete

An athlete platform built with **separate React/Vite frontend and Express backend packages**, MongoDB Atlas support, and the supplied scroll-driven sporting footage.

```text
frontend/                 React + Vite application
  src/pages/              One file per workspace page
  src/components/         Forms, dialogs, charts, and brand
  src/lib/                API client, offline queue, pose inference
  src/styles/             Landing, workspace, and responsive styles
  public/30Frames/        Supplied original frames
  public/frames/          Optimized WebP frames
  tests/                  Browser workflow tests
backend/                  Independent Express application
  src/routes/             Auth, athletes, records, opportunities, files
  src/services/           Storage, intelligence, research, schemas, seed
  src/middleware/         Authentication and session handling
  tests/                  Isolated API and research tests
docs/                     Architecture, features, and limitations
scripts/                  Asset optimization
30Frames/                 Original supplied assets, preserved
sysarch.png               Supplied architecture reference, preserved
```

## Start both packages

Use Node.js 22.12+ or a newer supported version.

```powershell
cd "D:\One Nation One Athelete"
npm install
npm run setup
npm run dev
```

Open **http://localhost:5173**. API: **http://localhost:4000/api/health**.

The **Explore demo** footer button creates your own isolated sample account. Or register a real athlete, coach, organiser, or medical account. Data persists across restarts. No credentials are needed for local development mode.

## Run independently

Backend terminal:

```powershell
cd backend
npm install
npm run dev
```

Frontend terminal:

```powershell
cd frontend
npm install
npm run dev
```

Each folder has its own `package.json`, lockfile, scripts, dependencies, and environment example. The root package only coordinates development and tools.

## MongoDB Atlas

Copy `backend/.env.example` to `backend/.env`, set `MONGODB_URI` to your Atlas connection string including a database name, configure an Atlas database user and your machine's IP access, then restart the backend. Never commit credentials.

```dotenv
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER/one_nation_one_athlete
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
APP_ORIGIN=http://localhost:5173
PORT=4000
```

Without `MONGODB_URI`, the development store uses `backend/.data/database.json`. A configured but invalid Atlas connection fails startup instead of falling back. Uploads reside in `backend/.data/uploads` in either mode. Local data is not automatically migrated to Atlas.

## Verify and build

```powershell
npm run lint --prefix frontend
npm test
npm run build
# With npm run dev already running:
npm exec --prefix frontend -- playwright install chromium
npm run test:e2e
```

The video browser test downloads the real MediaPipe model and therefore requires internet. Browser screenshots are written to `frontend/artifacts/`.

To serve the production build locally:

```powershell
npm run build
npm start --prefix backend
```

Express serves the app and API at **http://localhost:4000**. Real production deployment needs an HTTPS origin, `NODE_ENV=production`, `JWT_SECRET`, a database, and persistent uploads. It has not been deployed or connected to Atlas in this workspace.

See [the project guide](docs/PROJECT_GUIDE.md) for workflows, the architecture mapping, offline behaviour, and the exact scope of the intelligence features.
