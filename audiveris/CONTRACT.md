# Audiveris Workspace Contract

## Purpose

This document defines the per-job folder layout and file expectations used when the backend runs Audiveris.

## Workspace Layout

Each recognition job must use its own temporary workspace outside the repository.

Example:

```text
<temp-root>/
    <job-id>/
    input/
        source.png
    output/
        result.mxl
        result.omr
        audiveris.log
```

## Rules

- Each job gets a unique `<job-id>` workspace.
- The backend writes exactly one uploaded image into `input/`.
- The backend must not reuse a workspace across jobs.
- Audiveris must write all generated files into `output/`.
- The backend must treat `output/result.mxl` as the canonical MusicXML result.
- `output/result.omr` is an intermediate Audiveris artifact and is not returned to the frontend.
- `audiveris.log` is optional diagnostic output.

## Input Contract

- Accepted input is one validated PNG or JPEG image.
- The backend writes the validated file as:
  - `input/source.png`, or
  - `input/source.jpg`
- The backend passes that exact file path to the Dockerized Audiveris command.

## Output Contract

A successful run is defined by:

- Audiveris exits with code `0`
- `output/result.mxl` exists and is non-empty

A failed run is defined by any of:

- Audiveris exits non-zero
- `output/result.mxl` is missing
- the process times out

## Cleanup

- On normal success, the backend deletes the entire `<job-id>` workspace after it no longer needs the files.
- On failure, the backend also deletes the entire `<job-id>` workspace.
- If a future diagnostics mode is enabled, cleanup rules may be relaxed for that job only.
