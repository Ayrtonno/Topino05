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
var import_electron = require("electron");
var path2 = __toESM(require("path"));

// src/main/store.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var appRoot = process.cwd();
var dataDir = path.join(appRoot, "DBStorage");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
var MATERIALS_FILE = path.join(dataDir, "materials.json");
var INVENTORY_FILE = path.join(dataDir, "inventory.json");
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
function migrateMaterials(data) {
  if (!Array.isArray(data)) return { data, changed: false };
  let changed = false;
  const migrated = data.map((m) => {
    const material = { ...m };
    if (material.costPerUnit === void 0 && material.costPerGramm !== void 0) {
      material.costPerUnit = material.costPerGramm;
      delete material.costPerGramm;
      changed = true;
    }
    if (material.sellingPricePerUnit === void 0 && material.sellingPricePerGramm !== void 0) {
      material.sellingPricePerUnit = material.sellingPricePerGramm;
      delete material.sellingPricePerGramm;
      changed = true;
    }
    if (material.stockQuantity === void 0 && material.currentStockGramms !== void 0) {
      material.stockQuantity = material.currentStockGramms;
      delete material.currentStockGramms;
      changed = true;
    }
    if (!material.unit) {
      material.unit = "grammi";
      changed = true;
    }
    return material;
  });
  return { data: migrated, changed };
}
function migrateInventoryFromColors(colorsData) {
  if (!Array.isArray(colorsData)) return [];
  return colorsData.map((c) => ({
    id: c.id ?? Date.now().toString(),
    materialId: c.materialId,
    colorName: c.colorName,
    quantity: c.stockQuantity ?? c.stockInGramms ?? 0,
    lastUpdated: c.lastUpdated ?? (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function migrateArticles(data) {
  if (!Array.isArray(data)) return { data, changed: false };
  let changed = false;
  const legacyColors = readJsonFile(path.join(dataDir, "colors.json"), []);
  const colorMap = /* @__PURE__ */ new Map();
  if (Array.isArray(legacyColors)) {
    legacyColors.forEach((c) => {
      if (c.id && c.colorName) {
        colorMap.set(c.id, c.colorName);
      }
    });
  }
  const migrated = data.map((a) => {
    const article = { ...a };
    if (Array.isArray(article.composition)) {
      article.composition = article.composition.map((comp) => {
        const next = { ...comp };
        if (next.quantity === void 0 && next.quantityGramms !== void 0) {
          next.quantity = next.quantityGramms;
          delete next.quantityGramms;
          changed = true;
        }
        if (next.colorName === void 0 && next.colorId !== void 0) {
          next.colorName = colorMap.get(next.colorId);
          delete next.colorId;
          changed = true;
        }
        return next;
      });
    }
    return article;
  });
  return { data: migrated, changed };
}
function readAndMigrate(filePath, defaultValue, migrate) {
  const data = readJsonFile(filePath, defaultValue);
  const result = migrate(data);
  if (result.changed) {
    writeJsonFile(filePath, result.data);
  }
  return result.data;
}
var getMaterials = () => {
  return readAndMigrate(MATERIALS_FILE, [], migrateMaterials);
};
var saveMaterials = (materials) => {
  return writeJsonFile(MATERIALS_FILE, materials);
};
var getInventory = () => {
  if (fs.existsSync(INVENTORY_FILE)) {
    return readJsonFile(INVENTORY_FILE, []);
  }
  const legacyColors = readJsonFile(path.join(dataDir, "colors.json"), []);
  const migrated = migrateInventoryFromColors(legacyColors);
  if (migrated.length > 0) {
    writeJsonFile(INVENTORY_FILE, migrated);
  }
  return migrated;
};
var saveInventory = (items) => {
  return writeJsonFile(INVENTORY_FILE, items);
};
var getArticles = () => {
  return readAndMigrate(ARTICLES_FILE, [], migrateArticles);
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
  mainWindow = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path2.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  const rendererPath = path2.join(__dirname, "renderer", "pages", "index.html");
  mainWindow.loadFile(rendererPath);
  import_electron.Menu.setApplicationMenu(null);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};
import_electron.app.on("ready", createWindow);
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
import_electron.ipcMain.handle("get-materials", async () => {
  return getMaterials();
});
import_electron.ipcMain.handle("save-materials", async (_, materials) => {
  return saveMaterials(materials);
});
import_electron.ipcMain.handle("get-inventory", async () => {
  return getInventory();
});
import_electron.ipcMain.handle("save-inventory", async (_, items) => {
  return saveInventory(items);
});
import_electron.ipcMain.handle("get-articles", async () => {
  return getArticles();
});
import_electron.ipcMain.handle("save-articles", async (_, articles) => {
  return saveArticles(articles);
});
import_electron.ipcMain.handle("get-orders", async () => {
  return getOrders();
});
import_electron.ipcMain.handle("save-orders", async (_, orders) => {
  return saveOrders(orders);
});
import_electron.ipcMain.handle("get-labor-config", async () => {
  return getLaborConfig();
});
import_electron.ipcMain.handle("save-labor-config", async (_, config) => {
  return saveLaborConfig(config);
});
import_electron.ipcMain.handle("get-dashboard-config", async () => {
  return getDashboardConfig();
});
import_electron.ipcMain.handle("save-dashboard-config", async (_, config) => {
  return saveDashboardConfig(config);
});
//# sourceMappingURL=main.js.map
