// Global type declarations for Electron API and data models

// CSS Module Declaration
declare module "*.css" {
    const content: string;
    export default content;
}

// Data Models shared between main and renderer processes
declare namespace Models {
    // Raw materials - magazzino materia prima
    interface Material {
        id: string;
        name: string;
        costPerUnit: number; // prezzo unitario (€/g o €/pz)
        sellingPricePerUnit: number;
        stockQuantity: number;
        unit: "grammi" | "pezzi";
        lastUpdated: string;
    }

    // Colors - colori disponibili con stock
    interface InventoryItem {
        id: string;
        materialId: string;
        colorName?: string;
        quantity: number;
        lastUpdated: string;
    }

    // Articles - articoli composti da materiale+colore in quantità
    interface ArticleComposition {
        materialId: string;
        description?: string;
        quantity: number;
    }

    interface Article {
        id: string;
        code: string; // GU001A, PL001A etc
        name: string;
        composition: ArticleComposition[];
        laborHoursRequired: number; // ore di lavoro
        materialMarkupPct: number; // ricarica materiale %
        laborMarkupPct: number; // ricarica lavoro %
        createdAt: string;
    }

    // Labor cost configuration
    interface LaborConfig {
        hourlyRate: number; // €/ora
        lastUpdated: string;
    }

    // Orders/Quotes - preventivi e ordini
    interface OrderItem {
        articleId: string;
        quantity: number;
        unitPrice: number; // prezzo unitario articolo
        packaging?: boolean;
        colorSelections?: string[];
    }

    interface Client {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        createdAt: string;
    }

    interface Order {
        id: string;
        clientId?: string;
        clientFirstName?: string;
        clientLastName?: string;
        clientEmail?: string;
        clientPhone?: string;
        requestedDate?: string;
        deliveryDate?: string;
        items: OrderItem[];
        materialCost: number; // costo materia prima totale
        laborCost: number; // costo lavoro totale
        discountPercentage: number;
        finalAmount: number; // totale dopo sconto
        createdAt: string;
        status: "pending" | "refused" | "confirmed" | "processed";
        notes?: string;
        processedDate?: string;
        paymentReceived?: number;
    }

    interface IncomeMovement {
        id: string;
        orderId: string;
        amount: number;
        receivedDate: string;
        createdAt: string;
    }

    // KPI Dashboard
    interface KPI {
        totalOrders: number;
        totalRevenue: number;
        totalProfit: number;
        totalCost: number;
        salesTarget: number;
        targetPercentage: number;
    }
}

// Global type definitions
declare global {
    // Type aliases for convenience
    type Material = Models.Material;
    type InventoryItem = Models.InventoryItem;
    type Article = Models.Article;
    type ArticleComposition = Models.ArticleComposition;
    type Order = Models.Order;
    type OrderItem = Models.OrderItem;
    type LaborConfig = Models.LaborConfig;
    type KPI = Models.KPI;

    // Electron API interface
    interface ElectronAPI {
        // Materials
        getMaterials: () => Promise<Material[]>;
        saveMaterials: (materials: Material[]) => Promise<boolean>;

        // Colors
        getInventory: () => Promise<InventoryItem[]>;
        saveInventory: (items: InventoryItem[]) => Promise<boolean>;

        // Articles
        getArticles: () => Promise<Article[]>;
        saveArticles: (articles: Article[]) => Promise<boolean>;

        // Clients
        getClients: () => Promise<Client[]>;
        saveClients: (clients: Client[]) => Promise<boolean>;

        // Orders
        getOrders: () => Promise<Order[]>;
        saveOrders: (orders: Order[]) => Promise<boolean>;

        // Income Movements
        getIncomeMovements: () => Promise<IncomeMovement[]>;
        saveIncomeMovements: (items: IncomeMovement[]) => Promise<boolean>;

        // LaborConfig
        getLaborConfig: () => Promise<LaborConfig>;
        saveLaborConfig: (config: LaborConfig) => Promise<boolean>;

        // Dashboard config
        getDashboardConfig: () => Promise<{
            salesTarget: number;
            lastUpdated: string;
        }>;
        saveDashboardConfig: (config: {
            salesTarget: number;
            lastUpdated: string;
        }) => Promise<boolean>;
    }

    interface Window {
        api: ElectronAPI;
    }
}

export {};
