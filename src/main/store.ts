import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const userDataPath = app.getPath("userData");
const dataDir = path.join(userDataPath, "data");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const PRODUCTS_FILE = path.join(dataDir, "products.json");
const INVENTORY_FILE = path.join(dataDir, "inventory.json");
const QUOTES_FILE = path.join(dataDir, "quotes.json");

export interface Product {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    category: string;
}

export interface InventoryItem {
    productId: string;
    quantity: number;
    minQuantity: number;
    lastUpdated: string;
}

export interface QuoteItem {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface Quote {
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

const readJsonFile = (filePath: string, defaultValue: any) => {
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

const writeJsonFile = (filePath: string, data: any) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
    }
};

export const getProducts = (): Product[] => {
    return readJsonFile(PRODUCTS_FILE, []);
};

export const saveProducts = (products: Product[]) => {
    writeJsonFile(PRODUCTS_FILE, products);
};

export const getInventory = (): InventoryItem[] => {
    return readJsonFile(INVENTORY_FILE, []);
};

export const saveInventory = (inventory: InventoryItem[]) => {
    writeJsonFile(INVENTORY_FILE, inventory);
};

export const getQuotes = (): Quote[] => {
    return readJsonFile(QUOTES_FILE, []);
};

export const saveQuotes = (quotes: Quote[]) => {
    writeJsonFile(QUOTES_FILE, quotes);
};
