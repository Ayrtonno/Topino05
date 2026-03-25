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
        costPerGramm: number; // prezzo al grammo
        sellingPricePerGramm: number;
        currentStockGramms: number;
        unit: "grammi" | "pezzi";
        lastUpdated: string;
    }

    // Colors - colori disponibili con stock
    interface Color {
        id: string;
        materialId: string;
        colorName: string;
        colorCode?: string;
        stockInGramms: number; // giacenza in grammi
        lastUpdated: string;
    }

    // Articles - articoli composti da materiale+colore in quantità
    interface ArticleComposition {
        materialId: string;
        colorId: string;
        quantityGramms: number;
    }

    interface Article {
        id: string;
        code: string; // GU001A, PL001A etc
        name: string;
        composition: ArticleComposition[];
        laborHoursRequired: number; // ore di lavoro
        marginPercentage: number; // margine
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
    }

    interface Order {
        id: string;
        clientName: string;
        clientEmail?: string;
        items: OrderItem[];
        materialCost: number; // costo materia prima totale
        laborCost: number; // costo lavoro totale
        discountPercentage: number;
        finalAmount: number; // totale dopo sconto
        createdAt: string;
        status: "draft" | "sent" | "accepted" | "rejected" | "completed";
        notes?: string;
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
    type Color = Models.Color;
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
        getColors: () => Promise<Color[]>;
        saveColors: (colors: Color[]) => Promise<boolean>;

        // Articles
        getArticles: () => Promise<Article[]>;
        saveArticles: (articles: Article[]) => Promise<boolean>;

        // Orders
        getOrders: () => Promise<Order[]>;
        saveOrders: (orders: Order[]) => Promise<boolean>;

        // LaborConfig
        getLaborConfig: () => Promise<LaborConfig>;
        saveLaborConfig: (config: LaborConfig) => Promise<boolean>;

        // Dashboard config
        getDashboardConfig: () => Promise<{ salesTarget: number; lastUpdated: string }>;
        saveDashboardConfig: (config: { salesTarget: number; lastUpdated: string }) => Promise<boolean>;
    }

    interface Window {
        api: ElectronAPI;
    }
}

export {};
