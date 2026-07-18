# Audiveris Docker Run
This repo uses the published Docker Hub image `drawliin/musical-ocr-audiveris:5.11.0` by default.

If you want to rebuild or customize the Audiveris image yourself, use `Dockerfile.build`

Run Audiveris in batch mode from the repository root against one local fixture file. The current fixture set includes `backend/tests/fixtures/simple-cdef-quarter.png`.

## Linux Or macOS (`bash`, `zsh`)

```bash
docker run --rm --entrypoint sh \
  -v "$(pwd)/backend/tests/fixtures:/input:ro" \
  -v "$(pwd)/.tmp/audiveris-output:/output" \
  drawliin/musical-ocr-audiveris:5.11.0 \
  -lc "xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/simple-cdef-quarter.png"
```

## Windows Git Bash (`MINGW64`)

Use `pwd -W` so Docker receives a Windows host path, and set `MSYS_NO_PATHCONV=1` to stop Git Bash from rewriting the bind mounts:

```bash
MSYS_NO_PATHCONV=1 docker run --rm --entrypoint sh \
  -v "$(pwd -W)/backend/tests/fixtures:/input:ro" \
  -v "$(pwd -W)/.tmp/audiveris-output:/output" \
  drawliin/musical-ocr-audiveris:5.11.0 \
  -lc "xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/simple-cdef-quarter.png"
```

## Windows PowerShell

```powershell
docker run --rm --entrypoint sh `
  -v "${PWD}/backend/tests/fixtures:/input:ro" `
  -v "${PWD}/.tmp/audiveris-output:/output" `
  drawliin/musical-ocr-audiveris:5.11.0 `
  -lc "xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/simple-cdef-quarter.png"
```

## Windows Command Prompt (`cmd.exe`)

```bat
docker run --rm --entrypoint sh ^
  -v "%cd%/backend/tests/fixtures:/input:ro" ^
  -v "%cd%/.tmp/audiveris-output:/output" ^
  drawliin/musical-ocr-audiveris:5.11.0 ^
  -lc "xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/simple-cdef-quarter.png"
```

Expected result:

- Audiveris reads `/input/simple-cdef-quarter.png`.
- Audiveris writes MusicXML output into `/output`.
- Docker creates `.tmp/audiveris-output` on the host if it does not already exist.
- Later backend work can reuse the same command shape: `xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24' /opt/audiveris/bin/Audiveris -batch -transcribe -export -output /output /input/<file>`.
