import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as isDev from "electron-is-dev";
import {
    getProducts,
    saveProducts,
    getInventory,
    saveInventory,
    getQuotes,
    saveQuotes,
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

    // Determina URL basato su modalità dev/prod
    const isProduction = !isDev || process.argv.includes("--prod");
    const startUrl = isProduction
        ? `file://${path.join(__dirname, "../build/index.html")}`
        : "http://localhost:3000";

    mainWindow.loadURL(startUrl);

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

// IPC Handlers
ipcMain.handle("get-products", async () => {
    return getProducts();
});

ipcMain.handle("save-products", async (_, products) => {
    saveProducts(products);
    return true;
});

ipcMain.handle("get-inventory", async () => {
    return getInventory();
});

ipcMain.handle("save-inventory", async (_, inventory) => {
    saveInventory(inventory);
    return true;
});

ipcMain.handle("get-quotes", async () => {
    return getQuotes();
});

ipcMain.handle("save-quotes", async (_, quotes) => {
    saveQuotes(quotes);
    return true;
});
