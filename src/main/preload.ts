import { contextBridge, ipcRenderer } from "electron";

const api = {
    // Products API
    getProducts: () => ipcRenderer.invoke("get-products"),
    saveProducts: (products: any) =>
        ipcRenderer.invoke("save-products", products),

    // Inventory API
    getInventory: () => ipcRenderer.invoke("get-inventory"),
    saveInventory: (inventory: any) =>
        ipcRenderer.invoke("save-inventory", inventory),

    // Quotes API
    getQuotes: () => ipcRenderer.invoke("get-quotes"),
    saveQuotes: (quotes: any) => ipcRenderer.invoke("save-quotes", quotes),
};

contextBridge.exposeInMainWorld("api", api);

declare global {
    interface Window {
        api: typeof api;
    }
}
