/// <reference path="../../global.d.ts" />

import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const appRoot = process.cwd();
const dataDir = path.join(appRoot, "DBStorage");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const MATERIALS_FILE = path.join(dataDir, "materials.json");
const INVENTORY_FILE = path.join(dataDir, "inventory.json");
const ARTICLE_INVENTORY_FILE = path.join(dataDir, "article-inventory.json");
const ARTICLES_FILE = path.join(dataDir, "articles.json");
const CLIENTS_FILE = path.join(dataDir, "clients.json");
const ORDERS_FILE = path.join(dataDir, "orders.json");
const INCOME_MOVEMENTS_FILE = path.join(dataDir, "income-movements.json");
const ECONOMIC_MOVEMENTS_FILE = path.join(dataDir, "economic-movements.json");
const MATERIAL_MOVEMENTS_FILE = path.join(dataDir, "material-movements.json");
const LABOR_CONFIG_FILE = path.join(dataDir, "labor-config.json");
const DASHBOARD_CONFIG_FILE = path.join(dataDir, "dashboard-config.json");

const readJsonFile = (filePath: string, defaultValue: any) => {
    try {
        if (fs.existsSync(filePath)) {
            let data = fs.readFileSync(filePath, "utf-8");
            // Strip BOM if present
            if (data.charCodeAt(0) === 0xfeff) {
                data = data.slice(1);
            }
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
        return true;
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        return false;
    }
};

function migrateMaterials(data: any) {
    if (!Array.isArray(data)) return { data, changed: false };
    let changed = false;
    const migrated = data.map((m: any) => {
        const material = { ...m };
        if (material.costPerUnit === undefined && material.costPerGramm !== undefined) {
            material.costPerUnit = material.costPerGramm;
            delete material.costPerGramm;
            changed = true;
        }
        if (material.sellingPricePerUnit === undefined && material.sellingPricePerGramm !== undefined) {
            material.sellingPricePerUnit = material.sellingPricePerGramm;
            delete material.sellingPricePerGramm;
            changed = true;
        }
        if (material.stockQuantity === undefined && material.currentStockGramms !== undefined) {
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

function migrateInventoryFromColors(colorsData: any) {
    if (!Array.isArray(colorsData)) return [];
    return colorsData.map((c: any) => ({
        id: c.id ?? Date.now().toString(),
        materialId: c.materialId,
        colorName: c.colorName,
        quantity: c.stockQuantity ?? c.stockInGramms ?? 0,
        lastUpdated: c.lastUpdated ?? new Date().toISOString(),
    }));
}

function migrateArticles(data: any) {
    if (!Array.isArray(data)) return { data, changed: false };
    let changed = false;
    const legacyColors = readJsonFile(path.join(dataDir, "colors.json"), []);
    const colorMap = new Map<string, string>();
    if (Array.isArray(legacyColors)) {
        legacyColors.forEach((c: any) => {
            if (c.id && c.colorName) {
                colorMap.set(c.id, c.colorName);
            }
        });
    }
    const migrated = data.map((a: any) => {
        const article = { ...a };
        if (Array.isArray(article.composition)) {
            article.composition = article.composition.map((comp: any) => {
                const next = { ...comp };
                if (next.quantity === undefined && next.quantityGramms !== undefined) {
                    next.quantity = next.quantityGramms;
                    delete next.quantityGramms;
                    changed = true;
                }
                if (next.colorName === undefined && next.colorId !== undefined) {
                    next.colorName = colorMap.get(next.colorId);
                    delete next.colorId;
                    changed = true;
                }
                if (next.description === undefined && next.colorName !== undefined) {
                    next.description = next.colorName;
                    delete next.colorName;
                    changed = true;
                }
                return next;
            });
        }
        if (article.materialMarkupPct === undefined) {
            article.materialMarkupPct = article.marginPercentage ?? 0;
            changed = true;
        }
        if (article.laborMarkupPct === undefined) {
            article.laborMarkupPct = 0;
            changed = true;
        }
        if (article.marginPercentage !== undefined) {
            delete article.marginPercentage;
            changed = true;
        }
        return article;
    });
    return { data: migrated, changed };
}

function readAndMigrate<T>(
    filePath: string,
    defaultValue: T,
    migrate: (data: any) => { data: any; changed: boolean },
) {
    const data = readJsonFile(filePath, defaultValue);
    const result = migrate(data);
    if (result.changed) {
        writeJsonFile(filePath, result.data);
    }
    return result.data as T;
}

// ==================== MATERIALS ====================
export const getMaterials = (): Material[] => {
    return readAndMigrate(MATERIALS_FILE, [], migrateMaterials);
};

export const saveMaterials = (materials: Material[]): boolean => {
    return writeJsonFile(MATERIALS_FILE, materials);
};

// ==================== INVENTORY ====================
export const getInventory = (): InventoryItem[] => {
    if (fs.existsSync(INVENTORY_FILE)) {
        return readJsonFile(INVENTORY_FILE, []);
    }
    // Migrate legacy colors.json to inventory.json if present
    const legacyColors = readJsonFile(path.join(dataDir, "colors.json"), []);
    const migrated = migrateInventoryFromColors(legacyColors);
    if (migrated.length > 0) {
        writeJsonFile(INVENTORY_FILE, migrated);
    }
    return migrated;
};

export const saveInventory = (items: InventoryItem[]): boolean => {
    return writeJsonFile(INVENTORY_FILE, items);
};

// ==================== ARTICLE INVENTORY ====================
export const getArticleInventory = (): ArticleInventoryItem[] => {
    return readJsonFile(ARTICLE_INVENTORY_FILE, []);
};

export const saveArticleInventory = (items: ArticleInventoryItem[]): boolean => {
    return writeJsonFile(ARTICLE_INVENTORY_FILE, items);
};

// ==================== ARTICLES ====================
export const getArticles = (): Article[] => {
    return readAndMigrate(ARTICLES_FILE, [], migrateArticles);
};

export const saveArticles = (articles: Article[]): boolean => {
    return writeJsonFile(ARTICLES_FILE, articles);
};

// ==================== CLIENTS ====================
export const getClients = (): any[] => {
    return readJsonFile(CLIENTS_FILE, []);
};

export const saveClients = (clients: any[]): boolean => {
    return writeJsonFile(CLIENTS_FILE, clients);
};

// ==================== ORDERS ====================
export const getOrders = (): Order[] => {
    return readJsonFile(ORDERS_FILE, []);
};

export const saveOrders = (orders: Order[]): boolean => {
    return writeJsonFile(ORDERS_FILE, orders);
};

// ==================== INCOME MOVEMENTS ====================
export const getIncomeMovements = (): any[] => {
    return readJsonFile(INCOME_MOVEMENTS_FILE, []);
};

export const saveIncomeMovements = (items: any[]): boolean => {
    return writeJsonFile(INCOME_MOVEMENTS_FILE, items);
};

function round2(value: number) {
    return parseFloat(value.toFixed(2));
}

function calculateInventoryMaterialCost(
    materials: Material[],
    inventory: InventoryItem[],
) {
    return inventory.reduce((sum, row) => {
        const material = materials.find((m) => m.id === row.materialId);
        if (!material) return sum;
        return sum + material.costPerUnit * row.quantity;
    }, 0);
}

function calculateArticleInventoryMaterialCost(
    articles: Article[],
    materials: Material[],
    articleInventory: ArticleInventoryItem[],
) {
    return articleInventory.reduce((sum, stockRow) => {
        if (!stockRow.quantity) return sum;
        const article = articles.find((a) => a.id === stockRow.articleId);
        if (!article) return sum;
        const unitMaterialCost = article.composition.reduce((acc, comp) => {
            const material = materials.find((m) => m.id === comp.materialId);
            if (!material) return acc;
            return acc + material.costPerUnit * comp.quantity;
        }, 0);
        return sum + unitMaterialCost * stockRow.quantity;
    }, 0);
}

function bootstrapEconomicMovements(): any[] {
    const materials = getMaterials();
    const inventory = getInventory();
    const articles = getArticles();
    const articleInventory = getArticleInventory();
    const orders = getOrders().filter((o) => o.status !== "refused");

    const currentRawStockCost = calculateInventoryMaterialCost(
        materials,
        inventory,
    );
    const currentFinishedStockCost = calculateArticleInventoryMaterialCost(
        articles,
        materials,
        articleInventory,
    );
    const historicalOrderMaterialCost = orders.reduce(
        (sum, o) => sum + (o.materialCost || 0),
        0,
    );
    const bootstrapAmount = round2(
        currentRawStockCost +
            currentFinishedStockCost +
            historicalOrderMaterialCost,
    );

    if (bootstrapAmount <= 0) return [];

    return [
        {
            id: "bootstrap-2025-12",
            date: "2025-12-01",
            type: "expense",
            category: "initial-stock",
            amount: bootstrapAmount,
            note: "Bootstrap storico: costo materia prima iniziale e materiale usato (dicembre 2025).",
            createdAt: new Date().toISOString(),
        },
    ];
}

// ==================== ECONOMIC MOVEMENTS ====================
export const getEconomicMovements = (): any[] => {
    const items = readJsonFile(ECONOMIC_MOVEMENTS_FILE, []);
    if (Array.isArray(items) && items.length > 0) {
        return items;
    }
    const bootstrap = bootstrapEconomicMovements();
    if (bootstrap.length > 0) {
        writeJsonFile(ECONOMIC_MOVEMENTS_FILE, bootstrap);
    }
    return bootstrap;
};

export const saveEconomicMovements = (items: any[]): boolean => {
    return writeJsonFile(ECONOMIC_MOVEMENTS_FILE, items);
};

// ==================== MATERIAL MOVEMENTS ====================
export const getMaterialMovements = (): any[] => {
    return readJsonFile(MATERIAL_MOVEMENTS_FILE, []);
};

export const saveMaterialMovements = (items: any[]): boolean => {
    return writeJsonFile(MATERIAL_MOVEMENTS_FILE, items);
};

// ==================== LABOR CONFIG ====================
const DEFAULT_LABOR_CONFIG: LaborConfig = {
    hourlyRate: 4,
    lastUpdated: new Date().toISOString(),
};

export const getLaborConfig = (): LaborConfig => {
    return readJsonFile(LABOR_CONFIG_FILE, DEFAULT_LABOR_CONFIG);
};

export const saveLaborConfig = (config: LaborConfig): boolean => {
    return writeJsonFile(LABOR_CONFIG_FILE, config);
};

// ==================== DASHBOARD CONFIG ====================
const DEFAULT_DASHBOARD_CONFIG = {
    salesTarget: 10000,
    lastUpdated: new Date().toISOString(),
};

export const getDashboardConfig = () => {
    return readJsonFile(DASHBOARD_CONFIG_FILE, DEFAULT_DASHBOARD_CONFIG);
};

export const saveDashboardConfig = (config: any): boolean => {
    return writeJsonFile(DASHBOARD_CONFIG_FILE, config);
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate the total cost of an article based on its composition
 */
export function calculateArticleCost(
    article: Article,
    materials: Material[],
): number {
    let cost = 0;

    for (const comp of article.composition) {
        const material = materials.find((m) => m.id === comp.materialId);
        if (material) {
            cost += material.costPerUnit * comp.quantity;
        }
    }

    return parseFloat(cost.toFixed(2));
}

/**
 * Calculate the labor cost for an article
 */
export function calculateLaborCost(
    article: Article,
    laborConfig: LaborConfig,
): number {
    return article.laborHoursRequired * laborConfig.hourlyRate;
}

/**
 * Calculate the final unit price of an article
 */
export function calculateArticlePrice(
    article: Article,
    materials: Material[],
    laborConfig: LaborConfig,
): number {
    const materialCost = calculateArticleCost(article, materials);
    const laborCost = calculateLaborCost(article, laborConfig);
    const materialSell = materialCost * (1 + article.materialMarkupPct / 100);
    const laborSell = laborCost * (1 + article.laborMarkupPct / 100);
    const finalPrice = materialSell + laborSell;

    return parseFloat(finalPrice.toFixed(2));
}
