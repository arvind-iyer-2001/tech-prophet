# 🤝 Developer & Agent Handoff: The Daily Tech-Prophet

This document provides context, state descriptions, and architectural details for developers or agentic assistants inheriting the **Daily Tech-Prophet** repository.

---

## 📋 Project State & Summary

**The Daily Tech-Prophet** is a local-first, highly aesthetic technology news aggregator and desktop reader styled in a Harry Potter "Daily Prophet" printed-newspaper theme. It aggregates RSS feeds, curates them using a local model on your Mac (via **Ollama**), and displays them with animated "moving photos," drop capitals, and aged parchment textures.

The codebase is fully functional, verified locally, and published to GitHub at:
🔗 [github.com/arvind-iyer-2001/tech-prophet](https://github.com/arvind-iyer-2001/tech-prophet)

---

## 🛠️ Technical Stack & Architecture

*   **Frontend:** React + Vite + Vanilla CSS.
*   **Desktop Shell:** Electron (Node main thread context).
*   **Local Curation:** Node.js fetching live Hacker News, TechCrunch, Wired, and VentureBeat RSS feeds, querying local Ollama (`http://localhost:11434/v1/chat/completions`), and outputting cache caches.
*   **Packaging:** `electron-builder` deploying packaged `.app` bundles directly to `~/Applications`.

---

## 🪄 Core Deliverables & Key Files

1.  **Curation Engine:**
    *   [`scripts/fetch_news.js`](file:///Users/arvindiyer/development/tech-news/scripts/fetch_news.js): Aggregates RSS items, builds the curation prompt containing your stack preferences, requests completion from Ollama, scrapes OpenGraph thumbnail images, and saves output to disk.
2.  **Electron Shell:**
    *   [`main.js`](file:///Users/arvindiyer/development/tech-news/main.js): Manages browser window, directory creation, file logging, environment variable configurations, and IPC communication.
    *   [`preload.js`](file:///Users/arvindiyer/development/tech-news/preload.js): Bridges safe IPC communication (fetches, file watch callbacks, environment preferences) to the React window.
3.  **React UI:**
    *   [`src/App.jsx`](file:///Users/arvindiyer/development/tech-news/src/App.jsx): Implements the multi-column newspaper layouts, animated frames (film projector flicker + Ken Burns zoom/pan effects), heart/bookmark state bindings, and toolbar actions.
4.  **Setup & Build Scripts:**
    *   [`run.sh`](file:///Users/arvindiyer/development/tech-news/run.sh): Launches Vite dev server, performs an active check to confirm the local Ollama server is running on port 11434, and boots the Electron window.
    *   [`scripts/build_app.sh`](file:///Users/arvindiyer/development/tech-news/scripts/build_app.sh): Compiles static assets, packages the application using `electron-builder --dir`, and deploys the bundle directly to `~/Applications/The Daily Tech-Prophet.app`.

---

## 🚀 Key Integrations & Features

*   **Auto-Fetch on Startup:** The app queries the preferred model (defined via `LOCAL_LLM_MODEL` in `.env`) and automatically triggers the news fetcher at boot time so you get fresh daily curation immediately when opening the app.
*   **Toolbar Refresh:** Replaced bulky model selector pickers with a clean **"Refresh Issue 🪄"** button in the toolbar.
*   **Real-Time Disk Sync (File Watcher):** The Electron main process watches the cached data directory. If `news.json` is modified externally (e.g., written by a cron job or the macOS Shortcuts app), it sends an IPC notification to the UI, which reloads the parchment feed in real-time.
*   **Shortcuts Ready:** By placing the compiled bundle in `~/Applications/`, macOS indexes the app, making it ready to be opened or triggered natively via the **Shortcuts app**, Spotlight, or Siri.

---

## ⚙️ Environment Variables (`.env`)

Configure variables to manage your local setup:
```env
LOCAL_LLM_API_URL="http://localhost:11434/v1"
LOCAL_LLM_MODEL="gemma4:latest"
```

---

## 🔎 Log Locations

Monitor curation runs, subprocesses, and filesystem watcher operations:
*   **App Logs:** `~/Library/Application Support/tech-prophet/app.log`
*   **Watch command:**
    ```bash
    tail -f ~/Library/Application\ Support/tech-prophet/app.log
    ```
*   **Data Cache:** `~/Library/Application Support/tech-prophet/data/news.json`

---

## 🪄 macOS Shortcuts App Integration

Because the application is packaged and deployed directly into `~/Applications/`, macOS indexes it automatically for search and Shortcuts execution.

### Creating a Shortcut
1.  Open the **Shortcuts** app on your Mac.
2.  Click the **`+` (Add)** icon to create a new shortcut named **"Open The Daily Tech-Prophet"**.
3.  Drag the **"Open App"** action into the editor workspace.
4.  Click on the faded blue **"App"** text and search for/select **"The Daily Tech-Prophet"**.
5.  *Alternatively*, use a **"Run Shell Script"** action containing:
    ```bash
    open "$HOME/Applications/The Daily Tech-Prophet.app"
    ```
6.  You can now trigger it from your Menu Bar, Spotlight, Siri, or tie it to custom cron schedules!
