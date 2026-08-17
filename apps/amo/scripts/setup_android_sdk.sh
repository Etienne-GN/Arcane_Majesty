#!/usr/bin/env bash
# One-time Android build environment for the Arcane Majesty launcher (Debian).
# Installs JDK 21 + Android command-line tools under /opt/android-sdk.
# Idempotent — safe to re-run. Requires sudo + network.
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-/opt/android-sdk}"
CMDLINE_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
CMDLINE_ZIP="/tmp/commandlinetools.zip"

echo "==> [1/4] JDK 21"
if ! java -version 2>&1 | grep -q 'version "21'; then
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jdk-headless
fi

echo "==> [2/4] Android command-line tools (${SDK_ROOT})"
if [ ! -d "${SDK_ROOT}/cmdline-tools/latest" ]; then
  sudo mkdir -p "${SDK_ROOT}/cmdline-tools"
  curl -fsSL -o "${CMDLINE_ZIP}" "${CMDLINE_ZIP_URL}"
  sudo unzip -q -o "${CMDLINE_ZIP}" -d "${SDK_ROOT}/cmdline-tools"
  sudo mv "${SDK_ROOT}/cmdline-tools/cmdline-tools" "${SDK_ROOT}/cmdline-tools/latest"
  rm -f "${CMDLINE_ZIP}"
fi

echo "==> [3/4] SDK packages"
sudo "${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" \
  --sdk_root="${SDK_ROOT}" --install \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"
yes | sudo "${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${SDK_ROOT}" --licenses > /dev/null

echo "==> [4/4] Environment"
echo "export ANDROID_HOME=${SDK_ROOT}"
echo "export PATH=${SDK_ROOT}/platform-tools:${SDK_ROOT}/cmdline-tools/latest/bin:\$PATH"
echo "Done. Source the exports above (or add them to ~/.bashrc)."