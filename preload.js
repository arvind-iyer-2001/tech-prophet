const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchNews: (modelName) => ipcRenderer.invoke('fetch-news', modelName),
  getNews: () => ipcRenderer.invoke('get-news'),
  openLink: (url) => ipcRenderer.send('open-link', url),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  onNewsUpdated: (callback) => {
    const subscription = (_event) => callback();
    ipcRenderer.on('news-updated', subscription);
    return () => {
      ipcRenderer.removeListener('news-updated', subscription);
    };
  }
});
