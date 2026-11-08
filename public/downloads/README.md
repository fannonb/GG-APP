# APK downloads

The web Docker build downloads the pinned, signed APK and verifies its SHA-256
before placing it at `public/downloads/ggapp.apk`. Vite copies it into the served
site at `/downloads/ggapp.apk`. A clean Git checkout therefore includes the APK
in the deployed site without manually copying a binary into the release package.

Current Android source: mobile commit `12b150045fa7cffe1cad2f3affb887eb4e6562ea`.
EAS build: `10e8f2e7-a670-4f2c-bfe3-87143f1fbdbf` (preview APK).
SHA-256: `a1824a1fdcee552f542c17401869bdb64103675e0dfefca0beab74a68b66750e`.

To publish another Android release, build a signed APK with EAS, verify that its
signing certificate matches the existing app, and update both `ANDROID_APK_URL`
and `ANDROID_APK_SHA256` in the root Dockerfile. The build fails if the download
or checksum verification fails. APKs are excluded from Docker and Railway source
uploads; the pinned artifact is fetched during the Docker build.
