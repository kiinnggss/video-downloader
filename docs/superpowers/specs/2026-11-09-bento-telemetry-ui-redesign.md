# Bento Telemetry Studio UI Redesign Specification

## 1. Goal and Visual Identity

This specification defines the visual transformation of the Crystal Video Downloader web application into a cohesive Bento Telemetry Studio. The aesthetic synthesizes three design references:

1. **Aveniq AI Agent Platform:** Ambient dual-light blooms, Bento grid layout with specular glass borders, intelligent floating command bar, and platform quick-filter chips.
2. **Irma Wellness App:** Ultra-tactile organic surfaces, rounded 3xl capsules, milky frosted glass overlays, and spring physics micro-interactions on buttons and modal bottom sheets.
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
   - Private vault with 4-digit PIN authentication and token sessions
   - 25-second keepalive heartbeat ping preventing container idle sleep
   - Screen Wake Lock API keeping mobile screens on during active transfers
   - PWA manifest and network-first service worker

---

## 4. Component Redesign Plan

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

### 6. `frontend/src/components/FilesView.jsx` & `VaultView.jsx`
- Bento video cards with clean typography, duration tags, and file sizes.
- Category filter capsules for All, Videos, Audio, and Vault.
- Stream modal player with high-fidelity glass frame.

---

## 5. Verification Plan

1. **Automated Backend Tests:**
   - Run `pytest backend/tests/ -v` to verify all 58 tests pass without regression.

2. **Frontend Compilation:**
   - Run `npm run build` inside `frontend/` to confirm zero Vite compilation errors.

3. **Live End-to-End Test:**
   - Test PlayVids inspection and size estimation: `POST /api/inspect` with `https://www.playvids.com/v/f8HpS2VVD73`.
   - Verify start download, pause, resume, and cancel dispatch.
   - Verify mobile viewport layout at 390x844 resolution using browser-harness.
