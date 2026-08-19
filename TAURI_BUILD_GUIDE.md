# Tauri Portable EXE Build & GitHub Workflow Guide

This project is fully pre-configured to build a standalone, self-contained Windows Portable Executable (`.exe`) and NSIS installer using **Tauri v1/v2** and **GitHub Actions**.

---

## 🚀 1. GitHub Actions Automated Build Workflow (Recommended)

The GitHub Actions workflow is defined in [`.github/workflows/tauri-build.yml`](.github/workflows/tauri-build.yml).

### Features:
- **Automated Windows Runner**: Uses `windows-latest` with Microsoft Visual C++ Build Tools & Rust MSVC toolchain.
- **Portable Executable Production**: Compiles the frontend (`Vite/React`) + backend Rust core into a single portable `.exe`.
- **Artifact Publishing**: Automatically uploads the compiled `.exe` to the GitHub Actions Run summary page (retained for 30 days).
- **Release Automation**: Whenever a version tag is pushed (e.g. `v1.0.0`) or manually dispatched, it automatically creates a GitHub Release with attached Windows portable binaries.

### How to Trigger the GitHub Workflow:

#### Option A: Manual Trigger via GitHub UI
1. Go to your repository on **GitHub.com**.
2. Click on the **Actions** tab.
3. Select **Build Tauri Portable EXE** from the left workflow list.
4. Click **Run workflow** -> Select `main` branch -> Click **Run workflow**.
5. Once complete (typically ~3-5 minutes), scroll down to **Artifacts** to download `PayrollMaster-ERP-Windows-Portable-v1.0.0.zip`.

#### Option B: Release Tag Push
```bash
git tag v1.0.0
git push origin v1.0.0
```
This automatically builds and attaches `PayrollMasterERP_1.0.0_x64-setup.exe` and `PayrollMasterERP_portable.exe` directly to the GitHub Releases page!

---

## 💻 2. Local Windows Portable EXE Build Instructions

To compile the portable executable on your local Windows machine:

### Prerequisites:
1. **Node.js**: v18 or higher.
2. **Rust Toolchain**: Install via [rustup.rs](https://rustup.rs/) (Select `x86_64-pc-windows-msvc`).
3. **C++ Build Tools**: Installed via Visual Studio Community (Desktop development with C++).

### Build Commands:
```bash
# 1. Install Node.js dependencies
npm install

# 2. Build Web Frontend & Tauri Executable
npm run tauri:build
```

### Output Location:
Your compiled portable executable will be generated at:
```text
src-tauri/target/release/PayrollMasterERP.exe
src-tauri/target/release/bundle/nsis/PayrollMasterERP_1.0.0_x64-setup.exe
```

---

## 🛠️ Configuration Files Reference

- **`.github/workflows/tauri-build.yml`**: GitHub Actions workflow runner.
- **`src-tauri/tauri.conf.json`**: Tauri window, security CSP, and bundle target settings (`targets: ["nsis", "portable"]`).
- **`src-tauri/Cargo.toml`**: Rust dependencies and package definitions.
- **`package.json`**: Frontend dependencies and `npm run tauri:build` scripts.
