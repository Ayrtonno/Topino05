// Global type declarations for Electron API and data models

// Data Models shared between main and renderer processes
declare namespace Models {
    interface Product {
        id: string;
        name: string;
        description: string;
        basePrice: number;
        category: string;
    }

    interface InventoryItem {
        productId: string;
        quantity: number;
        minQuantity: number;
        lastUpdated: string;
    }

    interface QuoteItem {
        productId: string;
        quantity: number;
        unitPrice: number;
    }

    interface Quote {
        id: string;
        clientName: string;
        clientEmail: string;
        items: QuoteItem[];
        totalAmount: number;
        discount: number;
        finalAmount: number;
        createdAt: string;
        status: "draft" | "sent" | "accepted" | "rejected";
        notes: string;
    }
}

// Global type definitions
declare global {
    // Type aliases for convenience
    type Product = Models.Product;
    type InventoryItem = Models.InventoryItem;
    type QuoteItem = Models.QuoteItem;
    type Quote = Models.Quote;

    // Electron API interface
    interface ElectronAPI {
        getProducts: () => Promise<Product[]>;
        saveProducts: (products: Product[]) => Promise<boolean>;
        getInventory: () => Promise<InventoryItem[]>;
        saveInventory: (inventory: InventoryItem[]) => Promise<boolean>;
        getQuotes: () => Promise<Quote[]>;
        saveQuotes: (quotes: Quote[]) => Promise<boolean>;
    }

    interface Window {
        api: ElectronAPI;
    }
}

export {};
