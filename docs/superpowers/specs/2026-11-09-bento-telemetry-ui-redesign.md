# Bento Telemetry Studio UI Redesign and Private Vault Architecture

## 1. Goal and Visual Identity

This specification defines the visual and functional transformation of the Crystal Video Downloader web application into a cohesive Bento Telemetry Studio with a private vault. The aesthetic synthesizes three design references:

1. **Aveniq AI Agent Platform:** Ambient dual-light blooms, Bento grid layout with specular glass borders, intelligent floating command bar, and platform quick-filter chips.
2. **Irma Wellness App:** Ultra-tactile organic surfaces, rounded 3xl capsules, milky frosted glass overlays, and spring physics micro-interactions on buttons, PIN keypads, and modal sheets.
3. **Sports Live Scores and Match Tracking:** Dynamic telemetry scorecard, real-time neon lime download speed gauges, pulsing live radar beacon, segmented progress tracks, and tactile match-action buttons.

A strict non-negotiable requirement is zero functional regression. All existing download capabilities, formats, PlayVids and video stream patches, background task queues, pause and resume and cancel controls, private vault, and device saving must remain fully operational.

---

## 2. Design Tokens and Styling

### Palette
- **Obsidian Base:** `#04060d`
- **Surface Card Fill:** `rgba(255, 255, 255, 0.03)` with `backdrop-blur-2xl`
- **Specular Card Border:** `rgba(255, 255, 255, 0.08)`
- **Card Top Inner Highlight:** `inset 0 1px 1px rgba(255, 255, 255, 0.12)`
- **Electric Lime:** `#ccff00` for live speeds, status beacon, active progress fill, and download buttons
- **Cyber Cyan:** `#00f0ff` for search glow, source chips, and secondary accents
- **Tactical Crimson:** `#ff3366` for cancel and delete controls
- **Amber Gold:** `#ffb800` for vault security, padlock states, and confidential files

### Typography
- **Headings and Body:** Plus Jakarta Sans for geometric layout and high contrast readability
- **Data and Telemetry:** JetBrains Mono for download speeds, byte counters, durations, and resolution badges

---

## 3. Preserved Capabilities and Functional Integrity

The following features and endpoints remain completely intact:

1. **URL Inspection:**
   - Endpoint: `POST /api/inspect`
   - Preserves YouTube cookie authentication modal via CookieSettingsModal
   - Preserves PlayVids monkey-patched player extraction and HTML fallback stream discovery
   - Preserves accurate HLS format size calculation from bitrate and duration

2. **Download Execution and Queue:**
   - Endpoint: `POST /api/downloads`
   - Preserves background worker thread dispatch and device isolation via `X-Device-Id`
   - Preserves SSE live telemetry streaming via `/api/downloads/stream`
   - Preserves thread-safe pause, resume, and cancel controls via `/api/downloads/{task_id}/pause`, `/api/downloads/{task_id}/resume`, and `/api/downloads/{task_id}/cancel`

3. **Storage and Device Saving:**
   - Automatic browser trigger to save finished videos directly to device storage
   - Byte-range HTTP 206 streaming for video playback via `/api/files/{id}/stream`
   - Direct download via `/api/files/{id}/download` and file deletion via `DELETE /api/files/{id}`

4. **Security and Platform Resilience:**
   - Private vault with PIN authentication and token sessions
   - 25-second keepalive heartbeat ping preventing container idle sleep
   - Screen Wake Lock API keeping mobile screens on during active transfers
   - PWA manifest and network-first service worker

---

## 4. Private Vault Architecture and Features

### 1. Device-Specific PIN Setup and Modification
- **First Access Check:** When a device navigates to the Vault, the frontend checks if a PIN has been set for this specific `device_id` via `GET /api/vault/pin-status`.
- **Set Initial PIN:** If no PIN is configured on the device, the UI presents an initial setup screen: "Choose your 4-digit Vault PIN for this device".
- **Enter PIN:** If a PIN exists, the user enters their PIN to unlock.
- **Change PIN:** Inside the unlocked vault header, a "Change PIN" button allows updating the device PIN at any time. Requires entering the current PIN before saving the new PIN.
- **Backend Schema:** `vault_auth` table updated to store `(device_id TEXT PRIMARY KEY, pin_hash TEXT NOT NULL)`. Fallback to default device `1` for backwards compatibility.

### 2. Local Device File Import (Add to Vault)
- An "Add Media" button inside the unlocked vault opens a file picker on the user's phone or computer.
- Selected video or audio files are uploaded via `POST /api/vault/upload` with `in_vault = 1` and associated with the device's `device_id`.
- The file is saved directly into the vault directory on disk and indexed in `media_files`.
- **Client-Side Persistence:** Uploaded and downloaded vault media are also stored locally in the browser's IndexedDB / local cache storage, so files persist directly on the phone even when offline.

### 3. Deletion Controls
- Every card in the Vault has an individual delete button with a confirmation prompt.
- Invokes `DELETE /api/files/{file_id}` with vault token authorization to remove the file from storage, the database, and client-side IndexedDB.

### 4. Multi-Select and Batch Operations
- A "Select" toggle button in the Vault header enables multi-selection mode.
- Users can tap cards to select multiple videos with visual checkmark badges.
- A floating bottom action bar appears with two primary actions:
  - **Delete Selected:** Batch deletes all highlighted items.
  - **Play in External App (VLC):** Offers external playback options.

### 5. External App Playback (VLC Integration)
- **Token Query Parameter Support:** Update `stream_media` and `download_media` in `backend/app/main.py` to accept tokens via `?token=<token>` in addition to `Authorization: Bearer <token>`. External apps like VLC do not send custom HTTP authorization headers.
- **VLC Protocol Link:** Supports `vlc://<stream_url_with_token>` for direct launch in VLC on desktop and mobile.
- **Android Intent Link:** Generates an intent link `intent://...#Intent;package=org.videolan.vlc;type=video/*;end` targeting the VLC player app.
- **M3U Playlist Export:** When multiple files are highlighted, the user can download a generated `.m3u` playlist containing the secure stream URLs. VLC, MX Player, and other media apps immediately open the file and queue the selected videos as a playlist.
- **Native Share Sheet:** Uses `navigator.share` with file or stream link on mobile devices to let the user select any installed media player.

---

## 5. Component Redesign Plan

### 1. `frontend/src/index.css` & `tailwind.config.js`
- Define CSS custom classes for Bento glass, inner specular highlights, glowing ambient blooms, and spring active scaling.
- Configure neon lime, cyber cyan, and obsidian token extensions.

### 2. `frontend/src/components/InspectorView.jsx`
- Replace plain search input with Aveniq-styled floating command bar with glowing focus ring and quick paste button.
- Add platform suggestion chips for YouTube, TikTok, PlayVids, and Instagram.
- Redesign inspection card into a high-contrast Bento card with thumbnail preview, duration badge, author pill, and bold download trigger button.
- Retain Get App PWA modal and Cookie Settings buttons in the header row.

### 3. `frontend/src/components/ActiveDownloadCard.jsx` & `MiniDownloadBanner.jsx`
- Re-architect into a sports telemetry match card:
  - Live radar beacon dot pulsing in green with `LIVE TRANSFER` badge.
  - Large monospace speedometer in electric lime displaying real-time speed.
  - Segmented progress bar with gradient fill.
  - Split telemetry metrics: ETA timer, fragment count, and downloaded versus total bytes.
  - High-contrast tactile pill buttons for Pause, Resume, and Cancel.

### 4. `frontend/src/components/FormatPickerModal.jsx`
- Redesign modal into an Irma-inspired tactile bottom sheet.
- Cards for available resolutions with format bitrate and accurate filesize badge.
- Audio-only toggle switch and Private Vault checkbox with smooth spring physics.

### 5. `frontend/src/components/BottomNav.jsx`
- Ergonomic floating dock with curved cutout and glowing active indicator capsule.
- Pulsing neon lime badge on Downloads tab when a transfer is running.
- Seamless transition to amber security styling when switching to Vault tab.

### 6. `frontend/src/components/FilesView.jsx`
- Bento video cards with clean typography, duration tags, and file sizes.
- Category filter capsules for All, Videos, Audio, and Vault.
- Stream modal player with high-fidelity glass frame.

### 7. `frontend/src/components/VaultView.jsx`
- Implement device-specific PIN setup and verification.
- Add Change PIN modal.
- Add file upload button to import videos from phone storage into vault.
- Add delete button per file and multi-select batch controls.
- Add external player integration with VLC protocol, M3U playlist, and Android Intent.
- Integrate IndexedDB storage for offline local persistence.

---

## 6. Verification Plan

1. **Automated Backend Tests:**
   - Run `pytest backend/tests/ -v` to verify existing and new tests pass.
   - Add unit tests for device-specific PIN endpoints, vault upload, and token query streaming.

2. **Frontend Compilation:**
   - Run `npm run build` inside `frontend/` to confirm zero Vite compilation errors.

3. **Live End-to-End Test:**
   - Test PlayVids inspection and size estimation: `POST /api/inspect` with `https://www.playvids.com/v/f8HpS2VVD73`.
   - Verify start download, pause, resume, and cancel dispatch.
   - Verify vault PIN setup, unlock, upload from local file, delete, multi-select, and VLC link.
   - Verify mobile viewport layout at 390x844 resolution using browser-harness.
