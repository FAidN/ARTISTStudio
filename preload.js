const { contextBridge, ipcRenderer } = require('electron');
const call = c => (...a) => ipcRenderer.invoke(c, ...a);
contextBridge.exposeInMainWorld('api', {
  load: call('load'), save: call('save'), token: call('token'),
  publish: call('publish'), addFiles: call('addFiles'), open: call('open'), setKey: call('setKey'), stats: call('stats'), version: call('version'), ttConnect: call('ttConnect'), exportFile: call('exportFile'), importFile: call('importFile'), backup: call('backup')
});
