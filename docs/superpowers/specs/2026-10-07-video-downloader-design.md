# Mobile Video Downloader: System and UI Design Spec

## 1. Overview and Goals

This specification defines a mobile-first web application for downloading, managing, and playing online videos. The user interface directly follows the aesthetic and screen layout of Dribbble concept 23157777, using soft lighting, layered background gradients, translucent glass elements, and diffused ambient shadows rather than rigid rectangular boxes.

The system runs as a full-stack web application with a Python FastAPI backend and a React progressive web application (PWA) client. It supports all major video platforms through native `yt-dlp` integration, handles stream muxing via `ffmpeg`, and provides real-time download telemetry over Server-Sent Events (SSE).

### Success Criteria
* Seamless URL inspection with instant thumbnail, author, duration, and resolution extraction.
* Floating yellow action button triggering a quality selection bottom sheet.
* Live download monitoring with speed display (for example, `20.00 Mb/s`), byte progress, and pause/resume controls.
* Organized library with tabs for downloads, music, and local videos.
* Built-in mobile video and audio player with byte-range scrubbing.
* One-tap direct export to phone storage.
* PIN-protected private vault with a dark-themed visual style.

---

## 2. Visual Design System: The Crystal Style

The visual design eliminates heavy border lines and sharp boxes, using depth, translucent layers, and ambient shadows.

### Design Tokens and Techniques
* **Canvas background**: Subtle multi-stop gradient (`from-slate-900 via-slate-800 to-slate-950` in dark views, `from-slate-100 via-slate-50 to-amber-50/20` in light views).
* **Crystal surfaces**: Translucent glass layers using Tailwind `backdrop-blur-xl` combined with semi-transparent fills (`bg-white/60` on light cards, `bg-slate-900/60` on dark vault cards).
* **Specular edges**: Single-pixel light catchers created with semi-transparent white highlight borders (`border border-white/20` or top-edge highlights `border-t border-white/40`) to mimic refraction without harsh outlines.
* **Diffused shadows**: Soft, multi-layered elevation shadows (`shadow-2xl shadow-black/10` and `shadow-cyan-500/20` glow on active cards) that float elements naturally above the canvas.
* **Curved geometry**: Generous border radii (`rounded-3xl` for cards, `rounded-full` for search pills, tabs, and buttons) to maintain an organic, fluid tactile feel.
* **Floating action button**: High-visibility yellow circle (`bg-amber-400 text-slate-950 shadow-xl shadow-amber-400/40`) holding a clean black download arrow.

---

## 3. Client Screens and User Experience

The application is structured as a mobile-optimized responsive web app with a persistent bottom navigation bar.

### Screen 1: In-App Inspector (`Home`)
* **Address pill**: A rounded-full input bar at the top with a search icon, URL input field, clear button, and an inspect action.
* **Video preview card**: Renders after URL inspection:
  * Video thumbnail or embedded video preview.
  * Title, channel avatar, creator name, and duration badge.
* **Quality selection bottom sheet**: Slides up when the floating yellow download button is tapped:
  * List of available video streams (1080p, 720p, 480p, 360p) with estimated file sizes.
  * Dedicated audio-only extract option (MP3 / M4A).
  * Destination toggle: Public Downloads or Private Vault.
  * Confirm download button.

### Screen 2: My Files and Active Transfers (`Files`)
* **Header and tabs**: Top title "My Files" with a three-segment pill selector: `Download`, `Music`, `Local Video`.
* **Active transfer card**: Floats at the top of the list when a download is in progress:
  * Thumbnail and media title.
  * Real-time transfer speed badge (e.g. `20.00 Mb/s`).
  * Cyan progress bar and downloaded size tracker (`120.00 MB / 165.00 MB`).
  * Pause, resume, and cancel buttons.
* **Completed file items**:
  * Thumbnail with duration overlay.
  * Title, file size label (e.g. `14.00 MB`), and format badge.
  * Quick-play button that opens the built-in media player modal.
  * Action menu: `Save to phone`, `Move to private vault`, `Rename`, `Delete`.

### Screen 3: Private Vault (`Vault`)
* **Dark theme view**: Immersive dark slate styling matching the right panel of the Dribbble concept.
* **Security lock gate**: Clean 4-digit PIN unlock keypad if locked.
* **Protected files list**: Lists vault items with options to play securely, export to device, or move back to public storage.

### Screen 4: Persistent Bottom Navigation
* `Back`: Returns to previous inspected URL.
* `Forward`: Advances forward in history.
* `Home`: URL inspector and browser view.
* `Files`: Active downloads and media library.
* `Vault`: PIN-protected private folder.

---

## 4. Backend Architecture and API Contracts

The backend is built with FastAPI and runs on Python 3.11+.

### Component Breakdown
1. **API Router**: Exposes REST endpoints for inspection, control, and library listing.
2. **SSE Telemetry Engine**: Manages client event subscriptions, broadcasting live download progress directly from `yt-dlp` hooks.
3. **Download Worker**: Background thread pool running `yt-dlp` instances with `ffmpeg` post-processors.
4. **Storage Engine**: Manages files under `storage/public/` and `storage/vault/`, serving HTTP 206 partial content streams.
5. **Database**: SQLite store (`downloads.db`) tracking tasks, metadata, file paths, and vault PIN hashes.

### REST API Endpoints

#### URL Inspection
* **`POST /api/inspect`**
  * Request payload:
    ```json
    { "url": "https://example.com/watch?v=..." }
    ```
  * Response:
    ```json
    {
      "url": "https://example.com/watch?v=...",
      "title": "NATURE: Life is Easy",
      "author": "John Den",
      "duration": 214,
      "thumbnail": "https://...",
      "formats": [
        { "format_id": "137+140", "resolution": "1080p", "ext": "mp4", "filesize_approx": 173015040, "note": "HD" },
        { "format_id": "22", "resolution": "720p", "ext": "mp4", "filesize_approx": 92100000, "note": "HD" },
        { "format_id": "140", "resolution": "Audio", "ext": "m4a", "filesize_approx": 14200000, "note": "Audio only" }
      ]
    }
    ```

#### Download Management
* **`POST /api/downloads`**
  * Request payload:
    ```json
    {
      "url": "https://example.com/watch?v=...",
      "format_id": "137+140",
      "is_audio": false,
      "in_vault": false
    }
    ```
  * Response:
    ```json
    { "task_id": "550e8400-e29b-41d4-a716-446655440000", "status": "queued" }
    ```
* **`GET /api/downloads/stream`**
  * Server-Sent Events stream. Emits JSON events:
    ```json
    {
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "downloading",
      "speed": "20.00 Mb/s",
      "progress": 72.5,
      "downloaded_bytes": 125829120,
      "total_bytes": 173015040,
      "eta_seconds": 15
    }
    ```
* **`POST /api/downloads/{task_id}/pause`**
* **`POST /api/downloads/{task_id}/resume`**
* **`POST /api/downloads/{task_id}/cancel`**

#### Media Library and Streaming
* **`GET /api/files?category=download|music|video`**
  * Returns array of completed media items with metadata and paths.
* **`GET /api/files/{file_id}/stream`**
  * Range-enabled video stream with `Accept-Ranges: bytes` and `Content-Range` headers for smooth scrubbing in the mobile browser player.
* **`GET /api/files/{file_id}/download`**
  * Returns media with `Content-Disposition: attachment; filename="video.mp4"` to trigger native phone download into device storage.
* **`DELETE /api/files/{file_id}`**

#### Private Vault
* **`POST /api/vault/unlock`**
  * Request: `{ "pin": "1234" }`
  * Response: `{ "token": "vault-session-token", "expires_in": 1800 }`
* **`GET /api/vault/files`**
  * Requires valid vault token header.
* **`POST /api/vault/move`**
  * Request: `{ "file_id": "uuid", "to_vault": true }`

---

## 5. Storage Layout

The application isolates files inside project-scoped directories:

```
video-downloader/
  backend/
    storage/
      public/
        videos/
        music/
      vault/
    data/
      downloads.db
```

---

## 6. Error Handling and Edge Cases

* **Invalid or unsupported link**: The inspection service captures extraction errors from `yt-dlp` and returns clean HTTP 422 JSON errors with clear user instructions.
* **Encrypted or DRM-protected video**: If `yt-dlp` reports encrypted media (Widevine / FairPlay), the API returns HTTP 403 stating that the stream is DRM-protected and cannot be extracted.
* **Network interruption**: Download tasks register disconnected network states, update status to `paused` or `interrupted`, and preserve temporary chunk files so downloads can be resumed.
* **Muxing failures**: If `ffmpeg` encounters corrupted audio or video chunks, the worker cleans up temporary files and reports an explicit error message rather than hanging.

---

## 7. Verification and Test Strategy

### Backend Automated Tests
* Unit test format normalization and resolution parsing from raw `yt-dlp` payloads.
* Mocked extraction tests validating that `POST /api/inspect` returns expected models without external network traffic.
* SSE broadcast unit tests confirming that download hook callbacks deliver expected speed and progress messages.
* Range-request tests asserting that `GET /api/files/{file_id}/stream` correctly responds with `HTTP 206 Partial Content` on byte ranges.

### Frontend Component Tests
* Component tests for the crystal glass styling classes and shadows.
* State tests for the format selector bottom sheet.
* Telemetry hook tests verifying that incoming SSE events correctly update the progress bar and transfer speed without UI re-render thrashing.
