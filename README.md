# 🪄 The Daily Tech-Prophet

A local-first, highly aesthetic technology news curator and desktop reader styled in a Harry Potter "Daily Prophet" editorial theme. It aggregates live RSS feeds, curates them using a local model on your Mac (via **Ollama**), and displays them with animated "moving photos," drop capitals, and aged parchment textures.

---

## 🎨 Wizarding World Aesthetics & UI

The application UI is designed to look and feel like a premium magical newspaper:
*   **Moving Pictures:** Images slowly zoom and pan continuously, mimicking the shifting movements of photos in the wizarding world.
*   **Film Flicker & Tint:** Portrait frames are styled with heavy sepia/monochrome filters and overlayed with a vintage 24fps projector brightness flicker.
*   **Gothic Drop Capitals:** The lead letter of focused articles is dynamically rendered as an enlarged gothic capital (using Georgia/Lora serif families).
*   **Aged Parchment Texture:** Styled using fine CSS gradients, double borders, and muted carbon-ink colors to emulate a printed paper journal.

---

## ⚡ Core Architecture & Features

1.  **Local Curation Loop:**
    *   Programmatically parses RSS feeds from Hacker News, TechCrunch, Wired, and VentureBeat.
    *   Filters and aggregates the latest items, formatting a comprehensive system instruction and sending it to your local Ollama completions API.
    *   Curates exactly 10 articles + 1 **Hidden Gem** (less mainstream but highly useful for senior developers) and writes them to a local JSON cache.
2.  **Dynamic Model Discovery:**
    *   Electron queries the local Ollama tags API (`http://localhost:11434/api/tags`) at startup.
    *   Filters out embedding-only models, populating the UI dropdown with only your installed text generation models (e.g. `gemma4:latest`).
3.  **Real-Time Disk Synchronization:**
    *   Includes a directory watcher inside the Electron main process that monitors the curation cache folder.
    *   Whenever `news.json` is updated externally (e.g., by the macOS Shortcuts app or a cron job), it pushes an IPC reload event to the frontend, updating your feed in real-time.
4.  **Shortcuts Deployment:**
    *   Contains build scripts to package and compile the desktop app, copying it directly to `~/Applications` so macOS indices it for native Shortcuts or Spotlight search.

---

## 🚀 Getting Started

### Prerequisites
1.  **Node.js & npm** (Node 18+ recommended)
2.  **Ollama** installed on your Mac. Download it from [ollama.com](https://ollama.com) or run:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```
3.  **Gemma 4 model** pulled locally:
    ```bash
    ollama run gemma4
    ```

### Installation
1.  Clone this repository and navigate to the directory:
    ```bash
    cd tech-news
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Set up your `.env` file (optional, defaults are automatic):
    ```env
    LOCAL_LLM_API_URL="http://localhost:11434/v1"
    LOCAL_LLM_MODEL="gemma4:latest"
    ```

### Running in Development
Run the startup script:
```bash
./run.sh
```
This script will verify that your local Ollama server is running, launch the Vite dev server, and open the Electron application window.

---

## 📦 Compiling & Packaging (macOS App)

To package the application and copy it directly to your macOS `~/Applications/` directory:
```bash
./scripts/build_app.sh
```
Once deployed, the app is fully indexed, allowing you to launch it via Siri, Spotlight, or the macOS **Shortcuts** app.

---

## 📝 Real-Time Log Monitoring
All logs, RSS requests, and Ollama completion streams are written in real-time. You can monitor the system output in your terminal while launching or fetching:
```bash
tail -f ~/Library/Application\ Support/tech-prophet/app.log
```
