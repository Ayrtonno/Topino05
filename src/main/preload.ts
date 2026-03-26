import { contextBridge, ipcRenderer } from "electron";

const api = {
    // Materials API
    getMaterials: () =>
        ipcRenderer.invoke("get-materials") as Promise<Material[]>,
    saveMaterials: (materials: Material[]) =>
        ipcRenderer.invoke("save-materials", materials) as Promise<boolean>,

    // Inventory API
    getInventory: () => ipcRenderer.invoke("get-inventory") as Promise<InventoryItem[]>,
    saveInventory: (items: InventoryItem[]) =>
        ipcRenderer.invoke("save-inventory", items) as Promise<boolean>,

    // Articles API
    getArticles: () => ipcRenderer.invoke("get-articles") as Promise<Article[]>,
    saveArticles: (articles: Article[]) =>
        ipcRenderer.invoke("save-articles", articles) as Promise<boolean>,

    // Clients API
    getClients: () => ipcRenderer.invoke("get-clients") as Promise<any[]>,
    saveClients: (clients: any[]) =>
        ipcRenderer.invoke("save-clients", clients) as Promise<boolean>,

    // Orders API
    getOrders: () => ipcRenderer.invoke("get-orders") as Promise<Order[]>,
    saveOrders: (orders: Order[]) =>
        ipcRenderer.invoke("save-orders", orders) as Promise<boolean>,

    // Income Movements API
    getIncomeMovements: () =>
        ipcRenderer.invoke("get-income-movements") as Promise<any[]>,
    saveIncomeMovements: (items: any[]) =>
        ipcRenderer.invoke("save-income-movements", items) as Promise<boolean>,

    // Labor Config API
    getLaborConfig: () =>
        ipcRenderer.invoke("get-labor-config") as Promise<LaborConfig>,
    saveLaborConfig: (config: LaborConfig) =>
        ipcRenderer.invoke("save-labor-config", config) as Promise<boolean>,

    // Dashboard Config API
    getDashboardConfig: () =>
        ipcRenderer.invoke("get-dashboard-config") as Promise<any>,
    saveDashboardConfig: (config: any) =>
        ipcRenderer.invoke("save-dashboard-config", config) as Promise<boolean>,
};

contextBridge.exposeInMainWorld("api", api);
