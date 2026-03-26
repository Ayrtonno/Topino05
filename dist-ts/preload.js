"use strict";

// src/main/preload.ts
var import_electron = require("electron");
var api = {
  // Materials API
  getMaterials: () => import_electron.ipcRenderer.invoke("get-materials"),
  saveMaterials: (materials) => import_electron.ipcRenderer.invoke("save-materials", materials),
  // Inventory API
  getInventory: () => import_electron.ipcRenderer.invoke("get-inventory"),
  saveInventory: (items) => import_electron.ipcRenderer.invoke("save-inventory", items),
  // Articles API
  getArticles: () => import_electron.ipcRenderer.invoke("get-articles"),
  saveArticles: (articles) => import_electron.ipcRenderer.invoke("save-articles", articles),
  // Orders API
  getOrders: () => import_electron.ipcRenderer.invoke("get-orders"),
  saveOrders: (orders) => import_electron.ipcRenderer.invoke("save-orders", orders),
  // Labor Config API
  getLaborConfig: () => import_electron.ipcRenderer.invoke("get-labor-config"),
  saveLaborConfig: (config) => import_electron.ipcRenderer.invoke("save-labor-config", config),
  // Dashboard Config API
  getDashboardConfig: () => import_electron.ipcRenderer.invoke("get-dashboard-config"),
  saveDashboardConfig: (config) => import_electron.ipcRenderer.invoke("save-dashboard-config", config)
};
import_electron.contextBridge.exposeInMainWorld("api", api);
//# sourceMappingURL=preload.js.map
