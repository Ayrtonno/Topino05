import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import {
    getMaterials,
    saveMaterials,
    getColors,
    saveColors,
    getArticles,
    saveArticles,
    getOrders,
    saveOrders,
    getLaborConfig,
    saveLaborConfig,
    getDashboardConfig,
    saveDashboardConfig,
} from "./store";

let mainWindow: BrowserWindow | null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    const rendererPath = path.join(__dirname, "renderer", "pages", "index.html");
    mainWindow.loadFile(rendererPath);

    // Nascondi la barra dei menu
    Menu.setApplicationMenu(null);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers - Materials
ipcMain.handle("get-materials", async () => {
    return getMaterials();
});

ipcMain.handle("save-materials", async (_, materials) => {
    return saveMaterials(materials);
});

// IPC Handlers - Colors
ipcMain.handle("get-colors", async () => {
    return getColors();
});

ipcMain.handle("save-colors", async (_, colors) => {
    return saveColors(colors);
});

// IPC Handlers - Articles
ipcMain.handle("get-articles", async () => {
    return getArticles();
});

ipcMain.handle("save-articles", async (_, articles) => {
    return saveArticles(articles);
});

// IPC Handlers - Orders
ipcMain.handle("get-orders", async () => {
    return getOrders();
});

ipcMain.handle("save-orders", async (_, orders) => {
    return saveOrders(orders);
});

// IPC Handlers - Labor Config
ipcMain.handle("get-labor-config", async () => {
    return getLaborConfig();
});

ipcMain.handle("save-labor-config", async (_, config) => {
    return saveLaborConfig(config);
});

// IPC Handlers - Dashboard Config
ipcMain.handle("get-dashboard-config", async () => {
    return getDashboardConfig();
});

ipcMain.handle("save-dashboard-config", async (_, config) => {
    return saveDashboardConfig(config);
});
