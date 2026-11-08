# Polyfork 3D Asset Integration Guide

## 1. Overview

[Polyfork](https://polyfork.dev) is an AI-native parametric 3D asset library built for applications, interactive environments, games, and AI coding agents. 

Unlike conventional 3D asset platforms that offer only opaque, static binaries (`.fbx` or `.obj`), Polyfork exposes:
1. **Parametric Modules (`.mjs`):** Code-native assets returning Three.js `Object3D`/`Group` instances directly via zero-loader imports, customizable via typed runtime knobs.
2. **Standard glTF 2.0 (`.glb`):** Clean, uncompressed/indexed models ready for Three.js, Unity, Unreal Engine, Godot, and Blender.
3. **High-Resolution Vector/Transparent 3D Renders (`hero.png`, `front.png`):** Transparent pre-rendered isometric and studio captures ideal for web UI, avatars, and 2.5D visual storytelling.
4. **Programmatic Catalog & MCP Server:** Self-describing REST endpoints and an agent-ready Model Context Protocol (MCP) server (`https://polyfork.dev/mcp`).

---

## 2. API Locations & Base Endpoints

All public catalog discovery endpoints require **no authentication**.

| Purpose | Method | Endpoint / URL | Notes |
| :--- | :--- | :--- | :--- |
| **Catalog Search** | `GET` | `https://polyfork.dev/api/assets` | Query filters: `q`, `class`, `free`, `kit`, `ik`, `max_triangles`, `min_triangles`, `sort`, `page`, `per_page` |
| **Asset Details** | `GET` | `https://polyfork.dev/api/assets/{id}` | Dimensions (`size_m`), triangle count, palette (sRGB hex), rigs, decals, joints, renders |
| **Matching Assets** | `GET` | `https://polyfork.dev/api/assets/{id}/matching` | Returns assets from the same kit, shared palette, or matching real-world scale across complementary classes |
| **Parametric Variant** | `GET` | `https://polyfork.dev/api/assets/{id}/variant?want={text}` | Resolves natural-language descriptions into typed knob parameters for `createAsset()` |
| **Knob Schema** | `GET` | `https://polyfork.dev/cdn/{id}-params.json` | JSON schema of all knobs, options, defaults, presets, and `night` emissive maps |
| **Kits Index** | `GET` | `https://polyfork.dev/api/kits` | Lists coherent sets sharing palette, grid, and scale |
| **Kit Contract** | `GET` | `https://polyfork.dev/api/kits/{id}` | Assembly contract (`usage`), grid snapping (`grid_m`), scene knobs, and layout arrangements |
| **Terrain Service** | `GET` | `https://polyfork.dev/api/terrain/{id}` | Elevation and slope querying (`?at=x,z`), scatter points (`?scatter=n`), flat building sites (`flat_areas`) |
| **Self-Describing API**| `GET` | `https://polyfork.dev/api` | Full machine-readable route registry and global conventions |
| **Account & Quota** | `GET` | `https://polyfork.dev/api/me` | Account profile, tier, and remaining hourly/weekly remix allowances (Requires Bearer token) |
| **Demand Request** | `POST` | `https://polyfork.dev/api/demand` | Register unmet asset requirements when a search query yields poor coverage |
| **Interactive Scene** | Web | `https://polyfork.dev/scene?ids={id1},{id2}` | Sharable 3D orbital web page without requiring a local bundler |
| **MCP Server** | MCP | `https://polyfork.dev/mcp` | Remote Model Context Protocol endpoint for agent tool calling |

---

## 3. CDN & Download Endpoints

Free low-poly assets do not require an API key to download or hotlink:

```
# Standard 3D Formats
GLB (Mesh & Vertex Colors):   https://polyfork.dev/cdn/{id}.glb
ES Module (Three.js Group):   https://polyfork.dev/cdn/{id}.mjs
Remix / Restyled Mesh:        https://polyfork.dev/cdn/{id}-remix.glb?look=palette:gameboy

# Studio Renders (Transparent PNGs)
Hero Isometric Render:        https://polyfork.dev/files/{id}/renders/hero.png
Front Orthographic:           https://polyfork.dev/files/{id}/renders/front.png
Close-up Detail:              https://polyfork.dev/files/{id}/renders/close.png

# Universal Exports (Generated on first request)
FBX:                          https://polyfork.dev/dl/{id}.fbx
USDZ (Apple AR Quick Look):   https://polyfork.dev/dl/{id}.usdz
USDA (Isaac Sim, Blender):    https://polyfork.dev/dl/{id}.usda
OBJ + MTL:                    https://polyfork.dev/dl/{id}.obj
```

---

## 4. Global Conventions & Standards

When positioning and rendering Polyfork assets, the catalog provides guaranteed invariants:

1. **Coordinate System:** Y-up, right-handed coordinates.
2. **Units & Scale:** 1 unit = 1 real-world meter (`size_m`). Never rescale to fit; choose matching assets.
3. **Grounding & Origin:**
   - Ground models rest on `y = 0` and are centered on X and Z.
   - Placing an object at `position.set(x, 0, z)` lands it flush on the ground plane without bounding-box calculation.
   - Wall/ceiling fixtures have a positive `origin_y` (built at installed height).
   - Terrain and ground tiles have a negative `origin_y` (top surface lands at `y = 0`).
4. **Orientation:** Models face `+Z` by default.
5. **Materials & Shading:**
   - Authored with flat-shaded vertex colors (`COLOR_0`) on a single material (1 draw call per model).
   - Authored for neutral/standard color space (no heavy ACES tone mapping required).
6. **Night Lighting:** Models with `has_night: true` define an emissive color map in `{id}-params.json` keyed by albedo color.

---

## 5. Humanoid Characters & Animation

Characters in Polyfork are configured parametric humanoids built on a unified skeleton:

- **Rig Structure:** 31 joints conforming to Mixamo naming (22 body bones + 9 `Face_*` joints).
- **Proportions:** Bone lengths adapt automatically to age and body build configs while keeping hip translation normalized.
- **Clips Runtime:** Free animation clips can be attached using `clips.mjs`:
  ```javascript
  import { animate } from 'https://polyfork.dev/cdn/clips.mjs';
  const anim = await animate(characterMesh);
  anim.locomotion(metresPerSecond); // Smoothly blends Idle, Walk, and Run
  ```
- **Animation Index:** `GET https://polyfork.dev/cdn/anim-index.json`
- **Mixamo Compatibility:** Any skinless Mixamo animation FBX retargets using `https://polyfork.dev/cdn/mixamo.mjs`.

---

## 6. Inverse Kinematics (IK)

Models with `has_ik: true` (`ik_type: 'legs' | 'arm'`) include solvers that plant feet to ground heights or aim booms:

```javascript
import { walker, raycastGround } from 'https://polyfork.dev/cdn/walk.mjs';

const gait = walker(model, { ground: raycastGround([terrainMesh]) });
// Advance distance travelled (keeps feet locked without foot slipping):
distance += speed * delta;
model.position.z = distance;
gait.poseAt(distance);
```

---

## 7. Scene Composition & Kits

When assembling multiple models into a scene:
1. **Kit Coherence:** Use models belonging to the same `kit` to ensure identical color palettes, scales, and grid snap units (`grid_m`).
2. **Kit Builder Runtime:**
   ```javascript
   import { buildKit } from 'https://polyfork.dev/cdn/kit.mjs';
   import { stage } from 'https://polyfork.dev/cdn/stage.mjs';

   const place = await buildKit({
     kit: 'cozy-farm-cc979f',
     params: { season: 'autumn' },
   });
   scene.add(place.group);

   const look = stage(renderer, scene, { time: 'day' });
   look.shadows(place.group);
   ```
3. **Instancing:** For repeating clutter (vegetation, crates, rocks), use `THREE.InstancedMesh` with slight 90-degree rotations or parameter variations rather than fetching different models.
4. **Draw-Call Merging:** Merge static props via `https://polyfork.dev/cdn/merge.mjs` into a single batch draw call.

---

## 8. Command-Line Interface (`npx polyfork`)

Polyfork provides a zero-install CLI for scripting and project setup:

```bash
# Search catalog
npx polyfork search <keywords>

# Download GLB into public/models
npx polyfork add <asset-id>

# Download ES Module source
npx polyfork add <asset-id> --format mjs

# Machine-readable JSON output
npx polyfork search "worker" --json
```

---

## 9. Current BIGDROPS Implementation

Polyfork assets are actively utilized in the BOURXE / BIGDROPS codebase:

### Integrated Characters in Onboarding Experience V5 (`src/components/onboarding-v5/`)

| Role | Asset ID | Title | Kit | Tris | Scene Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Site Technician** | `construction-worker-c1ad8c` | Construction Worker | `nyc-city-kit-fbca88` | 3,861 | Workspaces (Activa Electrical) & Field Service Inspection |
| **Fleet Courier** | `delivery-courier-327e30` | Delivery Courier | `nyc-city-kit-fbca88` | 3,523 | Workspaces (Northline Fleet) & Logistics Route |
| **Store Merchant** | `shopkeeper-be5547` | Shopkeeper | `japanese-suburban-city-street-baa482` | 4,347 | Workspaces (Marketline Supply Retail Counter) |
| **Commercial Lead** | `standing-worker-on-a-8a0f9a` | Standing Worker On A Call | `office-794453` | 2,969 | Commercial Sales Workroom |
| **Finance Controller**| `seated-office-worker-854671` | Seated Office Worker | `office-794453` | 3,027 | Finance & Taxation Command Centre |

### Design Lab Preview
- **Route:** `/design-lab/cold-launch` (simulates startup tenant-tree boot sequences across themes and network states).
- **Onboarding V5 Route:** `/design-lab/onboarding-v5`.

---

## 10. Authentication & Security Guardrails

- **Key Storage:** The Polyfork API key is stored strictly in the root `.env` file under `POLYFORK_KEY`:
  ```bash
  POLYFORK_KEY=pf_YOUR_KEY
  ```
- **Security Rule:** Never check the key into Git, source files, or log outputs.
- **Account Tier:**
  - Account: `Bigdrops` (`jaiyewisdom@gmail.com`)
  - Plan: Free tier (signed in)
  - Allowance: 100 remix bakes/hour, 300 remix bakes/week
  - Free low-poly models (`.glb` and `.mjs`) require no paid licensing for app/product inclusion.

---

## 11. Licensing & Legal Guidelines

- **Usage:** Permitted for commercial games, web applications, client solutions, and commercial products. No attribution required for app embedding.
- **Mesh License:** Free model meshes (GLB, FBX, USD, OBJ) carry CC BY 4.0 rights when distributed as raw standalone 3D files.
- **Restrictions:** Re-selling raw `.mjs` code modules, hosting a competing 3D model generator, or re-serving HD editions to third-party end users requires a platform license (`https://polyfork.dev/platform`).
- **Legal Terms Reference:** [https://polyfork.dev/licensing](https://polyfork.dev/licensing).
