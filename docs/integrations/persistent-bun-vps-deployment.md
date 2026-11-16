# Deploying a Persistent Bun Backend on Auto-Detecting PaaS/VPS

**Path:** `docs/integration/persistent-bun-vps-deployment.md`  
**Author:** BIGDROPS Architecture  
**Context:** Decoupling a React and Vite frontend from a persistent Bun backend within a single monorepo.

---

## 1. Architectural Overview

The BOURXE application uses two distinct hosting environments:
- **Frontend:** Hosted on Vercel as a static Single Page Application (SPA).
- **Backend:** Hosted on a Platform as a Service (PaaS) or Virtual Private Server (VPS) as a persistent Bun container.

Serverless platforms enforce execution timeouts and stateless environments. Applications that require WebSocket connections, streaming AI responses, or persistent database connection pools need a continuous runtime. 

This document defines the sanitized deployment payload strategy. This strategy deploys a standalone server entry point (`server.ts`) without triggering frontend build tools on auto-detecting platforms.

---

## 2. Platform Buildpack Auto-Detection Failure

Modern PaaS providers (such as Cloudzyro, Railway, and Render) use buildpacks (such as Railpack or Nixpacks) to detect project types. The buildpack scans `package.json` and the repository root.

When the buildpack detects `vite`, `react`, or `vite.config.js`, the following failure sequence occurs:

1. The buildpack classifies the application as a **Static SPA**.
2. The buildpack runs the frontend build script (`npm run build`).
3. The buildpack creates an Nginx container and maps the web root to the `/dist` directory.
4. If `package.json` overrides the build script to skip Vite, no `/dist` directory is generated.
5. The container build fails with `exit code 1` because Docker cannot find `/dist`.

To deploy a persistent Node.js or Bun server, the deployment payload must exclude all frontend configuration and dependency markers.

---

## 3. Sanitized Archive Strategy

A sanitized archive forces the buildpack to select a Node.js or Bun server runtime instead of an Nginx container.

### 3.1 Security Verification
Before creating the archive, verify that source files do not contain plain-text credentials:
- Check all source files for API keys, bearer tokens, and database passwords.
- Configure credentials only through platform environment variables.
- Do not include local environment files (`.env`) in the archive.

### 3.2 Sanitized Manifest (`package.json`)
The deployment archive must contain a modified copy of `package.json`. Prepare this file as follows:

1. **Remove Frontend Dependencies:** Delete `vite`, `react`, `react-dom`, `@vitejs/plugin-react`, and user interface libraries from `dependencies` and `devDependencies`.
2. **Remove Build Scripts:** Delete `"build": "vite build"`.
3. **Configure the Start Command:** Set the entry point command:
   ```json
   "scripts": {
     "start": "bun run server.ts"
   }
   ```

### 3.3 Archive Exclusions
When packaging the `.zip` or `.tar` archive, apply the following exclusion rules:

| Item | Reason for Exclusion |
| :--- | :--- |
| `node_modules/` | The target platform must install native binaries for its operating system. |
| `.git/` | Prevents unnecessary archive size. |
| `dist/` | Prevents buildpack confusion between pre-built assets and server code. |
| `.env*` | Prevents credential exposure. |
| `vite.config.js` | Prevents the buildpack from classifying the project as a Vite frontend. |
| `index.html` | Prevents the buildpack from configuring static web routing. |
| `bun.lock` | Prevents `--frozen-lockfile` failures caused by pruned dependencies. |

> [!IMPORTANT]
> The modified `package.json` contains fewer dependencies than the original `bun.lock`. If the lockfile is included, the platform runs `bun install --frozen-lockfile` and aborts. Excluding `bun.lock` forces a clean dependency resolution for backend modules only.

### 3.4 Packaging Command Example
Use a selective packaging tool to build the archive:

```bash
# Windows bsdtar
bsdtar -a -cf cloudzyro-backend.zip src api public package.backend.json server.ts tsconfig.json
```

Ensure the archive places `package.backend.json` at the root as `package.json`.

---

## 4. Deployment Procedure

Follow these steps to deploy to a PaaS:

1. **Create Container:** If an earlier deployment failed as a static site, delete the cached instance and create a new service.
2. **Upload Archive:** Send the sanitized archive to the deployment endpoint.
3. **Observe Build:**
   - The buildpack detects `package.json` without Vite indicators.
   - The buildpack selects the Bun runtime.
   - The platform executes `bun install` without frozen lockfile restrictions.
   - The platform starts the process with `"start": "bun run server.ts"`.
4. **Configure Environment:** In the platform dashboard, set all required environment variables (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and AI provider keys). The container restarts with the new configuration.

---

## 5. Implementation for Virtual Private Servers (VPS) and Docker

When deploying to a raw virtual machine or container host, use a Dockerfile that implements the same isolation rules:

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# 1. Copy the sanitized backend manifest
COPY package.backend.json package.json

# 2. Install backend dependencies without frozen lockfile
RUN bun install

# 3. Copy backend source code and configuration
COPY server.ts tsconfig.json ./
COPY src/ ./src/
COPY api/ ./api/

# 4. Expose the server port and launch
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "server.ts"]
```

---

## 6. Frontend Integration

After the backend container is operational:

1. Copy the public backend URL (for example, `https://bourxe-api.cloudzyro.app`).
2. Open the Vercel project settings for the frontend application.
3. Update the `VITE_API_URL` environment variable with the backend domain.
4. Redeploy the frontend on Vercel to apply the updated configuration.
