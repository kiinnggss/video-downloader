# Bento Telemetry Studio and Private Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Crystal Video Downloader into a Bento Telemetry Studio inspired by Aveniq, Irma, and Sports Live Tracking while delivering an overhauled Private Vault with device PIN management, phone file imports, local persistence, delete buttons, multi-selection, and external VLC streaming.

**Architecture:** The backend SQLite schema and endpoints are extended to support device-specific PINs, vault file uploads, token-based streaming query parameters for external players like VLC, and M3U playlist generation. The frontend is styled using custom Tailwind and CSS tokens for obsidian Bento glass, neon telemetry gauges, and tactile spring physics. All existing video extraction, HLS probing, and download queues are preserved with zero functional regression.

**Tech Stack:** Python 3.12, FastAPI, SQLite, yt-dlp, FFmpeg, React 18, Vite, Tailwind CSS, Lucide React, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-11-09-bento-telemetry-ui-redesign.md`

## Global Constraints

- Confine all code changes strictly to the project directory `/home/joyboy/development/femi_projects/video-downloader`.
- Do not use em dashes anywhere in text, code, or documentation. Use periods or commas only, with no parentheses.
- Maintain mobile viewport responsiveness for phone screens at 390x844 resolution.
- Never remove or break existing capabilities: PlayVids extractor patches, format probing, pause, resume, cancel controls, keepalive heartbeat, PWA manifest, and device saving must remain 100 percent functional.
- All 58 existing backend tests must pass with zero failures.

---

### Task 1: Backend Vault Enhancements for Device PINs, File Uploads, and VLC Streaming

**Files:**
- Modify: `backend/app/db.py`
- Modify: `backend/app/services/vault.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_vault.py`

**Interfaces:**
- Produces: `POST /api/vault/set-pin`, `GET /api/vault/pin-status`, `POST /api/vault/upload`, `GET /api/vault/playlist.m3u`
- Updates: `GET /api/files/{file_id}/stream` to accept `?token=<vault_token>` in query parameters in addition to headers

- [ ] **Step 1: Write failing tests in `backend/tests/test_vault.py` for device PINs, token query streaming, and vault upload**

Add test cases verifying:
1. `GET /api/vault/pin-status` returns `{"has_pin": false}` when a device has no PIN.
2. `POST /api/vault/set-pin` sets the PIN for the specified device.
3. `POST /api/vault/unlock` unlocks with the device PIN and rejects incorrect PINs.
4. `POST /api/vault/upload` accepts a multipart file and creates a vault media entry with `in_vault = 1`.
5. `GET /api/files/{file_id}/stream?token=<token>` streams private vault content without requiring authorization headers.
6. `GET /api/vault/playlist.m3u?token=<token>&file_ids=id1,id2` returns a valid M3U playlist file for VLC.

- [ ] **Step 2: Run pytest to verify the new tests fail**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader && ./.venv/bin/pytest backend/tests/test_vault.py -v`

- [ ] **Step 3: Update `backend/app/db.py` and `backend/app/services/vault.py`**

Update `backend/app/db.py` to ensure `vault_auth` schema supports `device_id`:
```python
conn.execute("""
    CREATE TABLE IF NOT EXISTS vault_auth (
        device_id TEXT PRIMARY KEY,
        pin_hash TEXT NOT NULL
    )
""")
```

Update `backend/app/services/vault.py` with device aware functions:
```python
def set_pin(pin: str, device_id: str = "default", db_path: str = None):
    conn = get_connection(db_path)
    pin_h = hash_pin(pin)
    with conn:
        conn.execute("INSERT OR REPLACE INTO vault_auth (device_id, pin_hash) VALUES (?, ?)", (device_id, pin_h))
    conn.close()

def has_pin(device_id: str = "default", db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT pin_hash FROM vault_auth WHERE device_id = ?", (device_id,))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def verify_pin(pin: str, device_id: str = "default", db_path: str = None) -> bool:
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT pin_hash FROM vault_auth WHERE device_id = ?", (device_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return pin == DEFAULT_PIN
    return row["pin_hash"] == hash_pin(pin)
```

- [ ] **Step 4: Update `backend/app/main.py` with vault routes and streaming token support**

Add endpoints:
- `GET /api/vault/pin-status`
- `POST /api/vault/set-pin`
- `POST /api/vault/upload` using `UploadFile`
- `DELETE /api/vault/files/{file_id}` or update `/api/files/{file_id}`
- `GET /api/vault/playlist.m3u`
- Update `stream_media` and `download_media` to extract token from `request.query_params.get("token")` or headers.

- [ ] **Step 5: Run pytest to verify all tests pass**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader && ./.venv/bin/pytest backend/tests/ -v`

- [ ] **Step 6: Commit backend vault enhancements**

Run command:
`git add backend/`
`git commit -m "feat(backend): add device PIN management, vault uploads, and VLC streaming token support"`

---

### Task 2: Design Tokens, CSS Blooms, and Typography

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Configure Tailwind colors and fonts**

Add custom colors:
- `obsidian`: `#04060d`
- `lime-neon`: `#ccff00`
- `cyan-cyber`: `#00f0ff`
- `crimson-tactical`: `#ff3366`
- `amber-vault`: `#ffb800`

- [ ] **Step 2: Add custom CSS utility classes in `frontend/src/index.css`**

Add styling for:
- `.bento-card`: Glass fill with backdrop blur, specular border, and inner top highlight.
- `.bento-glow-lime` and `.bento-glow-cyan`: Ambient blur glow backgrounds.
- `.radar-beacon`: Pulsing live animation dot.
- `.spring-press`: Active scale compression with cubic-bezier transition.

- [ ] **Step 3: Run `npm run build` in `frontend/` to verify styling compiles**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 4: Commit CSS design tokens**

Run command:
`git add frontend/src/index.css frontend/tailwind.config.js`
`git commit -m "style: define Bento Telemetry design tokens, glows, and animations"`

---

### Task 3: Aveniq-Style Command Bar and Bento Inspector View

**Files:**
- Modify: `frontend/src/components/InspectorView.jsx`

- [ ] **Step 1: Redesign header and command bar**

Implement:
- Floating glass command input with glowing focus ring, paste button, and clear icon.
- Interactive platform suggestion chips for YouTube, TikTok, PlayVids, and Instagram.
- Header cluster preserving CookieSettingsModal and InstallAppModal triggers.

- [ ] **Step 2: Redesign inspection result card**

Implement:
- Bento layout with video preview thumbnail, duration badge, author pill, title, and bold lime Download trigger button.

- [ ] **Step 3: Verify build and component exports**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 4: Commit InspectorView redesign**

Run command:
`git add frontend/src/components/InspectorView.jsx`
`git commit -m "feat(frontend): redesign InspectorView with Aveniq command bar and Bento cards"`

---

### Task 4: Sports Telemetry Scorecard and Live Progress Banner

**Files:**
- Modify: `frontend/src/components/ActiveDownloadCard.jsx`
- Modify: `frontend/src/components/MiniDownloadBanner.jsx`

- [ ] **Step 1: Redesign `ActiveDownloadCard.jsx`**

Implement:
- Pulsing green live radar beacon with `LIVE TRANSFER` badge.
- Prominent monospace speedometer in electric lime displaying real-time download speed.
- Segmented progress bar with gradient fill.
- Split telemetry chips for ETA, fragments downloaded, and total bytes.
- High-contrast tactile pill buttons for Pause, Resume, and Cancel.

- [ ] **Step 2: Redesign `MiniDownloadBanner.jsx`**

Implement:
- Compact floating Bento card above navigation dock with speed ticker, pause, resume, and cancel buttons.

- [ ] **Step 3: Verify build in `frontend/`**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 4: Commit telemetry components**

Run command:
`git add frontend/src/components/ActiveDownloadCard.jsx frontend/src/components/MiniDownloadBanner.jsx`
`git commit -m "feat(frontend): style ActiveDownloadCard and MiniDownloadBanner as sports telemetry scorecards"`

---

### Task 5: Irma-Inspired Tactile Bottom Sheet Format Picker

**Files:**
- Modify: `frontend/src/components/FormatPickerModal.jsx`

- [ ] **Step 1: Redesign `FormatPickerModal.jsx`**

Implement:
- Frosted glass bottom sheet with smooth spring open animation.
- Resolution option cards with accurate bitrate calculated filesize chips.
- Audio-only toggle switch and Private Vault checkbox with smooth spring physics.

- [ ] **Step 2: Verify build in `frontend/`**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 3: Commit FormatPickerModal update**

Run command:
`git add frontend/src/components/FormatPickerModal.jsx`
`git commit -m "feat(frontend): style FormatPickerModal as an Irma tactile bottom sheet"`

---

### Task 6: Fluid Floating Curved Bottom Navigation

**Files:**
- Modify: `frontend/src/components/BottomNav.jsx`

- [ ] **Step 1: Refine `BottomNav.jsx` styling**

Implement:
- Ergonomic floating dock with curved notch and glowing indicator capsule.
- Pulsing neon lime badge on Downloads tab when active transfers exist.
- Dynamic theme transition into amber gold when switching to Vault tab.

- [ ] **Step 2: Verify build in `frontend/`**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 3: Commit BottomNav update**

Run command:
`git add frontend/src/components/BottomNav.jsx`
`git commit -m "feat(frontend): polish BottomNav curved dock with dynamic theme transitions"`

---

### Task 7: Media Library Bento Cards

**Files:**
- Modify: `frontend/src/components/FilesView.jsx`

- [ ] **Step 1: Redesign `FilesView.jsx`**

Implement:
- Category filter capsules for All, Videos, Audio, and Vault.
- Bento cards with thumbnail, duration badge, filesize chip, play trigger, and delete button.

- [ ] **Step 2: Verify build in `frontend/`**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 3: Commit FilesView update**

Run command:
`git add frontend/src/components/FilesView.jsx`
`git commit -m "feat(frontend): style FilesView with Bento media cards and category filters"`

---

### Task 8: Complete Private Vault Overhaul with Device PINs, Local File Uploads, Delete, Multi-Select, and VLC Playback

**Files:**
- Create: `frontend/src/utils/vaultStorage.js`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/components/VaultView.jsx`

- [ ] **Step 1: Create IndexedDB persistence helper in `frontend/src/utils/vaultStorage.js`**

Implement:
- Functions to store, list, and delete media blobs locally in browser IndexedDB so vault files stay on the user's phone or computer even offline.

- [ ] **Step 2: Update `frontend/src/api/client.js` with vault endpoints**

Implement:
- `checkVaultPinStatus(deviceId)`
- `setVaultPin(pin, deviceId, currentPin)`
- `uploadVaultFile(file, deviceId, token)`
- `deleteVaultFile(fileId, token)`
- `getVaultPlaylistUrl(fileIds, token)`

- [ ] **Step 3: Redesign `VaultView.jsx`**

Implement:
- Device PIN check on load: If no PIN is configured on this device, display initial setup view asking the user to choose their 4-digit PIN.
- Change PIN modal inside unlocked vault.
- Add Media button opening native file picker to import local videos into vault.
- Individual delete button on every card with confirmation.
- Select toggle button enabling multi-select checkmarks.
- Bottom action bar for selected items:
  - Delete Selected button.
  - Play in VLC button: triggers `vlc://` stream link, downloads `.m3u` playlist, or triggers Web Share API.

- [ ] **Step 4: Verify build in `frontend/`**

Run command:
`cd /home/joyboy/development/femi_projects/video-downloader/frontend && npm run build`

- [ ] **Step 5: Commit VaultView overhaul**

Run command:
`git add frontend/src/utils/vaultStorage.js frontend/src/api/client.js frontend/src/components/VaultView.jsx`
`git commit -m "feat(frontend): overhaul VaultView with device PIN, local upload, delete, multi-select, and VLC playback"`

---

### Task 9: Full End-to-End Verification, Frontend Precompilation, and Deployment

**Files:**
- Modify: `backend/app/main.py`
- Compile: `frontend/dist`
- Synchronize: `/home/joyboy/projects/isaac-portfolio/lib/projects-data.ts`

- [ ] **Step 1: Bump build tag in `backend/app/main.py` to `v4-bento-telemetry-vault`**
- [ ] **Step 2: Precompile production frontend bundle into `frontend/dist`**
- [ ] **Step 3: Run full backend test suite (`pytest backend/tests/ -v`)**
- [ ] **Step 4: Verify live endpoints and PlayVids extraction**
- [ ] **Step 5: Update portfolio metrics and run `sync-portfolio.sh`**
- [ ] **Step 6: Commit and push all changes to GitHub `main`**
