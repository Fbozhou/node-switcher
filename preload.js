/*
 * @Description: 
 * @Author: FBZ
 * @Date: 2025-12-24 11:10:33
 * @LastEditors: FBZ
 * @LastEditTime: 2025-12-24 11:39:13
 */
// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nvmAPI", {
  list: () => ipcRenderer.invoke("nvm:list"),
  use: (version) => ipcRenderer.invoke("nvm:use", version)
});

contextBridge.exposeInMainWorld("appAPI", {
  setAlwaysOnTop: (flag) => ipcRenderer.invoke("win:set-always-on-top", flag),
  getAlwaysOnTop: () => ipcRenderer.invoke("win:get-always-on-top")
});
