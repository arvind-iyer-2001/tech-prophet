const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { fetchNews } = require('./scripts/fetch_news.js');

let mainWindow;
let logFile;
let newsWatcher;

function setupNewsFileWatcher() {
  if (newsWatcher) {
    newsWatcher.close();
  }

  const dataDir = getDataDirectory();
  console.log('Setting up real-time news.json file watcher in:', dataDir);

  try {
    newsWatcher = fs.watch(dataDir, (eventType, filename) => {
      if (filename === 'news.json') {
        // debounce slightly to prevent double-firing during write
        setTimeout(() => {
          if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            console.log('Real-time update: news.json change detected. Notifying renderer.');
            mainWindow.webContents.send('news-updated');
          }
        }, 150);
      }
    });
  } catch (e) {
    console.error('Failed to start news file watcher:', e.message);
  }
}

function setupLogging() {
  const userDataPath = app.getPath('userData');
  logFile = path.join(userDataPath, 'app.log');
  
  // Reset log file on launch
  fs.writeFileSync(logFile, `=== The Daily Tech-Prophet Log Launch: ${new Date().toISOString()} ===\n`, 'utf8');

  const logToFile = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n';
    try {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}`, 'utf8');
    } catch (e) {
      // fallback
    }
    process.stdout.write(`[LOG] ${message}`);
  };

  const errorToFile = (...args) => {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n';
    try {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] [ERROR] ${message}`, 'utf8');
    } catch (e) {
      // fallback
    }
    process.stderr.write(`[ERR] ${message}`);
  };

  // Override standard console logging
  console.log = logToFile;
  console.error = errorToFile;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f4e4bc',
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function getDataDirectory() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

app.whenReady().then(() => {
  setupLogging();
  getDataDirectory();
  
  console.log('User Data Directory:', app.getPath('userData'));
  console.log('App Log Location:', logFile);

  createWindow();
  setupNewsFileWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      setupNewsFileWatcher();
    }
  });
});

app.on('window-all-closed', () => {
  if (newsWatcher) {
    newsWatcher.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (newsWatcher) {
    newsWatcher.close();
  }
});

// Fetch available models from local Ollama tags API
ipcMain.handle('get-ollama-models', async () => {
  const apiUrl = process.env.LOCAL_LLM_API_URL || 'http://localhost:11434/v1';
  let hostUrl = 'http://localhost:11434';
  try {
    const parsed = new URL(apiUrl);
    hostUrl = `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    // fallback
  }

  try {
    const response = await fetch(`${hostUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      if (data.models && Array.isArray(data.models)) {
        // filter out embedding-only models
        const llms = data.models
          .filter(m => m.capabilities && m.capabilities.includes('completion'))
          .map(m => m.name);
        if (llms.length > 0) return llms;
      }
    }
  } catch (e) {
    console.error('Failed to get local Ollama models:', e.message);
  }
  return ['gemma4:latest']; // fallback default
});

// Run script to fetch news using local Ollama model
ipcMain.handle('fetch-news', async (event, modelName) => {
  const targetModel = modelName || 'gemma4:latest';
  const dataDir = getDataDirectory();

  // Load local environment settings if available
  const dotenvPath = path.join(__dirname, '.env');
  if (fs.existsSync(dotenvPath)) {
    const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
    dotenvContent.split('\n').forEach(line => {
      const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (parts) {
        const key = parts[1];
        let value = parts[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }

  try {
    await fetchNews(targetModel, dataDir);
    return { success: true };
  } catch (error) {
    console.error('Error running direct fetchNews module:', error);
    throw error;
  }
});

// Load cached news
ipcMain.handle('get-news', async () => {
  const dataDir = getDataDirectory();
  const dataPath = path.join(dataDir, 'news.json');
  if (fs.existsSync(dataPath)) {
    try {
      const content = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse cached news:', e);
      return null;
    }
  }
  return null;
});

// Open external links in systems default browser
ipcMain.on('open-link', (event, url) => {
  if (url && url.startsWith('http')) {
    shell.openExternal(url);
  }
});
