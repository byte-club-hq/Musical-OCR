# Architecture

How Sheet Music Scanner is put together, and where new code goes. Read this before picking up an issue; most design decisions are already made here so contributors can focus on one piece.

## The Flow In One Picture

```text
Client app (Expo: web + iOS + Android)
  │  POST /api/recognitions            (multipart, field "image")
  ▼
Backend (Express)
  ├─ validate image (PNG/JPEG, ≤ 10 MB, ≤ 6000×6000)
  ├─ create per-job temp workspace, write source image
  ├─ create job (pending) ──► queue (max N running, max M waiting)
  │                                │
  │                                ▼
  │                        Audiveris in Docker  ──► result.mxl
  │                                │
  │                    read .mxl into memory, delete workspace
  │                    build pitch summary (best effort)
  │                    job → completed | failed
  │
  │  GET /api/recognitions/:id            (client polls every 1.5 s)
  │  GET /api/recognitions/:id/musicxml   (download .mxl)
  ▼
Client shows status, pitches, and a MusicXML download
```

Everything is in memory in one backend process. There is no database and no persistent queue in the MVP; restarting the backend forgets all jobs.

## Repository Layout

```text
shared/      @musical-ocr/shared: the HTTP contract (TypeScript types only)
backend/     Express API + recognition pipeline
frontend/    Expo React Native client (web + mobile)
audiveris/   Docker image and folder contract for Audiveris
```

### `shared/`: the API contract

`shared/src/index.ts` defines every request/response shape and every error code. Both workspaces import it with `import type`, so it never exists at runtime. **Change the contract here first**; TypeScript then shows every place in the backend and frontend that must follow.

Rules: types only, no runtime values (constants or functions).

### `backend/src/`

| Module                      | Responsibility                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                  | Entry point: load config, create logger, start server, graceful shutdown. Nothing else.                                                   |
| `config.ts`                 | Reads and validates **all** environment variables. Other modules never read `process.env`.                                                |
| `app.ts`                    | `createApp(options)`: wires middleware and routers. Takes config, logger, and recognition service as arguments so tests can replace them. |
| `logger.ts`                 | JSON-lines logger with privacy rules (see below).                                                                                         |
| `cors.ts`                   | CORS middleware for the configured origin.                                                                                                |
| `http/errors.ts`            | Error catalog (code → HTTP status + user message), `sendError`, JSON 404, safe error handler.                                             |
| `uploads/`                  | Multipart parsing and image validation for `POST /api/recognitions`.                                                                      |
| `recognition/routes.ts`     | Router for `/api/recognitions`. Thin: HTTP ⇄ service calls.                                                                               |
| `recognition/service.ts`    | The pipeline: submit, queue, run Audiveris, store result, map failures.                                                                   |
| `recognition/job-store.ts`  | In-memory job states and MusicXML bytes, with retention.                                                                                  |
| `recognition/job-queue.ts`  | FIFO queue with a concurrency limit.                                                                                                      |
| `audiveris/adapter.ts`      | Builds and runs the Docker command, normalizes output to `result.mxl`, returns a typed result.                                            |
| `workspaces/`               | Per-job temp folders under the OS temp dir (`input/`, `output/`).                                                                         |
| `musicxml/mxl.ts`           | Unzips `.mxl` and returns the score's XML text.                                                                                           |
| `musicxml/pitch-summary.ts` | Pure function: MusicXML text → pitch list. **Stub, not implemented yet.**                                                                 |

### `frontend/src/`

| Module                                              | Responsibility                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `config/api.ts`                                     | Backend base URL (`EXPO_PUBLIC_API_BASE_URL`, default `http://localhost:3000`).          |
| `features/image-selection/api.ts`                   | The only module that calls the backend.                                                  |
| `features/image-selection/useRecognitionUpload.ts`  | Owns a scan's lifecycle: upload, polling, timeout, ignoring stale jobs. Exposes `state`. |
| `features/image-selection/picker.ts`                | Platform image picking (expo-image-picker) and local file checks.                        |
| `features/image-selection/components/`              | Presentational components. They receive props and never fetch.                           |
| `features/image-selection/ImageSelectionScreen.tsx` | Composes the above.                                                                      |

New screens go in their own `features/<name>/` folder with the same split: `api.ts` for HTTP, a hook for state, `components/` for UI.

## HTTP API

All error responses have the shape `{ "error": { "code": "...", "message": "..." } }`. `message` is safe to show to users. Clients should branch on `code`, never on `message`.

| Method and path                      | Success                                                                     | Errors                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/health`                    | `200 { "status": "ok" }`                                                    |                                                                                   |
| `POST /api/recognitions`             | `202 RecognitionAccepted` `{ jobId, status: "pending" }`                    | `400 invalid_upload`, `503 recognition_busy`, `500 recognition_unavailable`       |
| `GET /api/recognitions/:id`          | `200 RecognitionResult` (see below)                                         | `404 recognition_not_found`                                                       |
| `GET /api/recognitions/:id/musicxml` | `200` `.mxl` bytes, `application/vnd.recordare.musicxml`, `sheet-music.mxl` | `404 recognition_not_found`, `409 musicxml_not_ready`, `409 musicxml_unavailable` |
| anything else                        |                                                                             | `404 not_found`                                                                   |

`RecognitionResult` by status:

- `pending`: accepted, waiting for a worker slot.
- `processing`: Audiveris is running.
- `completed`: `pitches` (may be empty) and `musicXmlReady: true`.
- `failed`: `error.code` is one of `recognition_failed`, `recognition_timeout`, `recognition_no_result`, plus `musicXmlReady: false`.

## Recognition Job Lifecycle

1. **Upload accepted:** a workspace is created, the image is written as `input/source.png` or `input/source.jpg`, and the job is `pending`.
2. **Queue:** at most `RECOGNITION_CONCURRENCY` jobs run at once. If `RECOGNITION_MAX_QUEUED_JOBS` jobs are already waiting, new uploads get `503 recognition_busy` before anything touches the disk.
3. **Run:** the job becomes `processing` and Audiveris runs in Docker with the workspace mounted (`input/` read-only).
4. **Finish:** the `.mxl` is read into memory, **then the workspace is deleted**, **then** the job becomes `completed` or `failed`. A finished job never has temp files left behind.
5. **Summary:** the pitch summary is best effort. If it throws, the job still completes with `pitches: []`, because the MusicXML download is the real result.
6. **Retention:** finished jobs (and their MusicXML) are forgotten `RECOGNITION_RETENTION_MINUTES` after finishing. Unfinished jobs never expire.

Failure mapping (`recognition/service.ts`):

| Audiveris adapter result | Public code             |
| ------------------------ | ----------------------- |
| `timeout`                | `recognition_timeout`   |
| `missing-output`         | `recognition_no_result` |
| `process-failed`         | `recognition_failed`    |
| any thrown error         | `recognition_failed`    |

## Configuration

All variables are optional. Copy `backend/.env.example` to `backend/.env`; `npm run dev` loads it automatically.

| Variable                        | Default                                 | Meaning                                     |
| ------------------------------- | --------------------------------------- | ------------------------------------------- |
| `PORT`                          | `3000`                                  | HTTP port                                   |
| `HOST`                          | `0.0.0.0`                               | Bind address (all interfaces, for phones)   |
| `CORS_ORIGIN`                   | `*`                                     | `Access-Control-Allow-Origin` value         |
| `RECOGNITION_CONCURRENCY`       | `2`                                     | Audiveris runs at once                      |
| `RECOGNITION_MAX_QUEUED_JOBS`   | `20`                                    | Waiting jobs before `503 recognition_busy`  |
| `RECOGNITION_RETENTION_MINUTES` | `60`                                    | How long finished results stay downloadable |
| `AUDIVERIS_IMAGE`               | `drawliin/musical-ocr-audiveris:5.11.0` | Docker image                                |
| `AUDIVERIS_TIMEOUT_SECONDS`     | `120`                                   | Kill Audiveris after this long              |

Frontend: `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:3000`). On a phone, use your computer's LAN IP.

## Privacy And Safety Rules

These apply to every change:

- **Never log** image bytes, user filenames, filesystem paths, or raw Audiveris/Docker output. Log event names, job ids, codes, counts, and durations (`logger.ts`).
- **Never return** internal error text to clients. Use a code from the catalog in `http/errors.ts`.
- **Never trust** file extensions or client MIME types; `uploads/image-upload.ts` checks the actual bytes.
- **Never keep** uploaded images after a job finishes; workspaces are deleted on every path.

## Deliberate MVP Limits

- One backend process, in-memory state, no auth, no rate limiting beyond the queue limit.
- Audiveris runs through the host's Docker daemon, so the backend itself runs on the host (not in a container).
- Results are `.mxl` only; there is no notation rendering in the app.
