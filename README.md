# Sheet Music Scanner

A web-first project for converting photos of printed sheet music into editable music data, starting with MusicXML.

## Overview

The project turns a sheet-music image into editable music data by using Audiveris as the recognition engine.

For the MVP, the repository focuses on a simple and practical flow:

- accept one sheet-music image upload;
- send that image to Audiveris;
- receive MusicXML output;
- extract a small result summary for the UI;
- let the user download the MusicXML.
- optionally play the music within app

## What The Project Is For

Sheet Music Scanner is focused on practical optical music recognition for printed scores.

The goal is not to build a custom OMR engine in this MVP. The goal is to build a clear, reliable product workflow around Audiveris so users can go from image input to editable MusicXML output with a web frontend and backend.

## Product Flow

The MVP goal is simple:

1. A user uploads a sheet-music image.
2. The backend sends that image to Audiveris.
3. Audiveris produces MusicXML.
4. The app shows a small result summary.
5. The user downloads the MusicXML.

You do not need to understand full music OMR to contribute. Most issues focus on making one part of this flow reliable, testable, and easy to run.

## What Is Audiveris?

[Audiveris](https://audiveris.github.io/audiveris/) is the optical music recognition engine used by this project for the MVP.

In simple terms, Audiveris reads printed sheet-music images and produces structured music data, including MusicXML output. In this project, contributors do not need to understand Audiveris internals to help. Most tasks treat it as an external tool in the workflow:

sheet-music image -> Audiveris -> MusicXML -> app result

For the MVP, this repository focuses on integrating Audiveris cleanly and reliably rather than building a custom music-recognition engine from scratch.

## What OMR Means

OMR means Optical Music Recognition.

It is similar to OCR, but instead of reading letters and words, it reads musical notation from sheet music and converts it into structured music data.

## Architecture

The project follows a simple integration flow:

```text
User
  ->
Web app
  ->
Backend
  ->
Audiveris
  ->
MusicXML
  ->
Result summary + download + Possible Audio Play
```

Responsibilities:

- `Web app`: accept an image, show upload state, show result state, and provide the MusicXML download
- `Backend`: validate uploads, manage temporary work, run Audiveris, track job state, and expose result endpoints
- `Audiveris`: read printed sheet-music images and produce MusicXML
- `Result summary`: extract a small pitch/result view from MusicXML for the frontend
- `MusicXML output`: provide the downloadable editable score file

## Repository Structure

```text
sheet-music-scanner/
|-- frontend/
|-- backend/
|-- README.md
`-- CONTRIBUTING.md
```

## Current State

The repository contains runnable web frontend and backend workspaces.

- `frontend/` contains the React, Vite, and TypeScript web application
- `backend/` contains the Express and TypeScript API, including its health endpoint

## Audiveris Local Docker Run

The repository now uses a pinned Audiveris Docker Hub image for local batch runs.

- Version pinned: `5.11.0`
- Published image: `drawliin/musical-ocr-audiveris:5.11.0`
- Optional custom-build file: [audiveris/Dockerfile.build](/D:/Projects/Musical-OCR/audiveris/Dockerfile.build)
- Wrapper Dockerfile: [audiveris/Dockerfile](/D:/Projects/Musical-OCR/audiveris/Dockerfile)
- Local run guide: [audiveris/README.md](/D:/Projects/Musical-OCR/audiveris/README.md)

This is the command shape the backend will later reuse:

```text
xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/<image-file>
```

## Development Commands

| Command                | Description                                                                            |                           Stays running                            |
| ---------------------- | -------------------------------------------------------------------------------------- | :----------------------------------------------------------------: |
| `npm run dev`          | Starts the frontend and backend development servers together.                          |                                Yes                                 |
| `npm run build`        | Builds both workspaces.                                                                |                                 No                                 |
| `npm run typecheck`    | Runs TypeScript type checking for both workspaces without emitting files.              |                                 No                                 |
| `npm test`             | Runs the frontend and backend test suites once.                                        |                                 No                                 |
| `npm run lint`         | Checks TypeScript, TSX, test, and configuration files with ESLint.                     |                                 No                                 |
| `npm run format`       | Formats TypeScript, TSX, JSON, and Markdown files with Prettier.                       |                                 No                                 |
| `npm run format:check` | Checks formatting of TypeScript, TSX, JSON, and Markdown files without modifying them. |                                 No                                 |

## Contributing

If you want to help, check the open issues and pick a task that matches your skills.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.
