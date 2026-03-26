import { app, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import * as path from "path";
import {
    getMaterials,
    saveMaterials,
    getInventory,
    saveInventory,
    getArticleInventory,
    saveArticleInventory,
    getArticles,
    saveArticles,
    getClients,
    saveClients,
    getOrders,
    saveOrders,
    getIncomeMovements,
    saveIncomeMovements,
    getLaborConfig,
    saveLaborConfig,
    getDashboardConfig,
    saveDashboardConfig,
} from "./store";

let mainWindow: BrowserWindow | null;

// Avoid noisy GPU crash logs on some Windows setups
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    mainWindow.once("ready-to-show", () => {
        mainWindow?.maximize();
        mainWindow?.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const child = new BrowserWindow({
            width: 1100,
            height: 800,
            show: false,
            parent: mainWindow || undefined,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
            },
        });
        child.once("ready-to-show", () => {
            child.maximize();
            child.show();
        });
        if (url.startsWith("file://")) {
            child.loadURL(url);
        }
        return { action: "deny" };
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

// IPC Handlers - Inventory
ipcMain.handle("get-inventory", async () => {
    return getInventory();
});

ipcMain.handle("save-inventory", async (_, items) => {
    return saveInventory(items);
});

// IPC Handlers - Article Inventory
ipcMain.handle("get-article-inventory", async () => {
    return getArticleInventory();
});

ipcMain.handle("save-article-inventory", async (_, items) => {
    return saveArticleInventory(items);
});

// IPC Handlers - Articles
ipcMain.handle("get-articles", async () => {
    return getArticles();
});

ipcMain.handle("save-articles", async (_, articles) => {
    return saveArticles(articles);
});

// IPC Handlers - Clients
ipcMain.handle("get-clients", async () => {
    return getClients();
});

ipcMain.handle("save-clients", async (_, clients) => {
    return saveClients(clients);
});

// IPC Handlers - Orders
ipcMain.handle("get-orders", async () => {
    return getOrders();
});

ipcMain.handle("save-orders", async (_, orders) => {
    return saveOrders(orders);
});

// IPC Handlers - Income Movements
ipcMain.handle("get-income-movements", async () => {
    return getIncomeMovements();
});

ipcMain.handle("save-income-movements", async (_, items) => {
    return saveIncomeMovements(items);
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

// IPC Handlers - Export PDF
ipcMain.handle("export-order-pdf", async (_, payload: { html: string; filename: string }) => {
    const { html, filename } = payload || {};
    if (!html) return { ok: false, message: "HTML mancante" };

    const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Esporta Preventivo PDF",
        defaultPath: filename || "preventivo.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            sandbox: true,
        },
    });
    try {
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
        await win.loadURL(dataUrl);
        const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: { marginType: "default" },
        });
        const fs = await import("fs");
        fs.writeFileSync(filePath, pdfBuffer);
        return { ok: true, filePath };
    } catch (err) {
        console.error("PDF export failed:", err);
        return { ok: false, message: "Errore esportazione PDF" };
    } finally {
        win.close();
    }
});
