# Sheet Music Scanner

A web-first project for converting photos of printed sheet music into editable music data, starting with MusicXML.

## Overview

The project turns a sheet music image into structured music data. The core flow is:

```text
Take or upload a photo
        ->
Recognize the musical symbols
        ->
Convert them into music data
        ->
Generate MusicXML
        ->
Open the result in MuseScore
```

## What The Project Is For

Sheet Music Scanner is focused on practical optical music recognition for printed scores.

The goal is to build a clear path from image input to editable score output, with a web app for the user interface and a backend for image processing and recognition work.

## What OMR Means

OMR means Optical Music Recognition.

It is similar to OCR, but instead of reading letters and words, it reads musical symbols such as:

- noteheads
- stems
- rests
- clefs
- accidentals
- measures

## Architecture

The project follows a simple layered flow:

```text
User
  ->
Web app
  ->
Backend
  ->
OMR pipeline
  ->
Score data
  ->
MusicXML
```

Responsibilities:

- `Web app`: capture or upload sheet music images and show results
- `Backend`: receive images, validate input, and coordinate processing
- `OMR pipeline`: preprocess images, detect notation, and build score data
- `MusicXML output`: produce a file that can be opened in notation software

## Repository Structure

```text
sheet-music-scanner/
|-- apps/
|   |-- web/
|   `-- backend/
|-- README.md
`-- CONTRIBUTING.md
```

## Current State

The repository currently contains the web and backend workspace scaffolds.

- `apps/web/` contains the frontend entry point
- `apps/backend/` contains the backend entry point

## Contributing

If you want to help, check the open issues and pick a task that matches your skills.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow.
