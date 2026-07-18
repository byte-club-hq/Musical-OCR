# Test Fixtures

These fixtures are intended for future upload validation and music recognition tests.

## Expected Success

- `simple-cdef-quarter.png`
  - Valid PNG containing four quarter notes: C4, D4, E4, and F4.

- `printed-sample.jpg`
  - Valid JPEG containing a printed sheet music sample intended as a more challenging recognition candidate.

## Expected Failure

- `blank.png`
  - Valid blank image with no musical notation.

- `corrupt.png`
  - Intentionally corrupted PNG file that should fail image decoding.

- `fake-image.png`
  - Plain text file renamed with a `.png` extension to simulate an invalid image upload.