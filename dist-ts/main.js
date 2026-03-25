"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main/index.ts
var import_electron2 = require("electron");
var path2 = __toESM(require("path"));

// src/main/store.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_electron = require("electron");
var userDataPath = import_electron.app.getPath("userData");
var dataDir = path.join(userDataPath, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
var MATERIALS_FILE = path.join(dataDir, "materials.json");
var COLORS_FILE = path.join(dataDir, "colors.json");
var ARTICLES_FILE = path.join(dataDir, "articles.json");
var ORDERS_FILE = path.join(dataDir, "orders.json");
var LABOR_CONFIG_FILE = path.join(dataDir, "labor-config.json");
var DASHBOARD_CONFIG_FILE = path.join(dataDir, "dashboard-config.json");
var readJsonFile = (filePath, defaultValue) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
};
var writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
};
var getMaterials = () => {
  return readJsonFile(MATERIALS_FILE, []);
};
var saveMaterials = (materials) => {
  return writeJsonFile(MATERIALS_FILE, materials);
};
var getColors = () => {
  return readJsonFile(COLORS_FILE, []);
};
var saveColors = (colors) => {
  return writeJsonFile(COLORS_FILE, colors);
};
var getArticles = () => {
  return readJsonFile(ARTICLES_FILE, []);
};
var saveArticles = (articles) => {
  return writeJsonFile(ARTICLES_FILE, articles);
};
var getOrders = () => {
  return readJsonFile(ORDERS_FILE, []);
};
var saveOrders = (orders) => {
  return writeJsonFile(ORDERS_FILE, orders);
};
var DEFAULT_LABOR_CONFIG = {
  hourlyRate: 4,
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};
var getLaborConfig = () => {
  return readJsonFile(LABOR_CONFIG_FILE, DEFAULT_LABOR_CONFIG);
};
var saveLaborConfig = (config) => {
  return writeJsonFile(LABOR_CONFIG_FILE, config);
};
var DEFAULT_DASHBOARD_CONFIG = {
  salesTarget: 1e4,
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
};
var getDashboardConfig = () => {
  return readJsonFile(DASHBOARD_CONFIG_FILE, DEFAULT_DASHBOARD_CONFIG);
};
var saveDashboardConfig = (config) => {
  return writeJsonFile(DASHBOARD_CONFIG_FILE, config);
};

// src/main/index.ts
var mainWindow;
var createWindow = () => {
  mainWindow = new import_electron2.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path2.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  const isDevelopment = process.argv.includes("--dev");
  const startUrl = isDevelopment ? "http://localhost:3000" : `file://${path2.join(__dirname, "../build/index.html")}`;
  mainWindow.loadURL(startUrl);
  import_electron2.Menu.setApplicationMenu(null);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};
import_electron2.app.on("ready", createWindow);
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
import_electron2.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
import_electron2.ipcMain.handle("get-materials", async () => {
  return getMaterials();
});
import_electron2.ipcMain.handle("save-materials", async (_, materials) => {
  return saveMaterials(materials);
});
import_electron2.ipcMain.handle("get-colors", async () => {
  return getColors();
});
import_electron2.ipcMain.handle("save-colors", async (_, colors) => {
  return saveColors(colors);
});
import_electron2.ipcMain.handle("get-articles", async () => {
  return getArticles();
});
import_electron2.ipcMain.handle("save-articles", async (_, articles) => {
  return saveArticles(articles);
});
import_electron2.ipcMain.handle("get-orders", async () => {
  return getOrders();
});
import_electron2.ipcMain.handle("save-orders", async (_, orders) => {
  return saveOrders(orders);
});
import_electron2.ipcMain.handle("get-labor-config", async () => {
  return getLaborConfig();
});
import_electron2.ipcMain.handle("save-labor-config", async (_, config) => {
  return saveLaborConfig(config);
});
import_electron2.ipcMain.handle("get-dashboard-config", async () => {
  return getDashboardConfig();
});
import_electron2.ipcMain.handle("save-dashboard-config", async (_, config) => {
  return saveDashboardConfig(config);
});
//# sourceMappingURL=main.js.map
