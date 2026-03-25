/// <reference path="../../global.d.ts" />

import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const userDataPath = app.getPath("userData");
const dataDir = path.join(userDataPath, "data");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const MATERIALS_FILE = path.join(dataDir, "materials.json");
const COLORS_FILE = path.join(dataDir, "colors.json");
const ARTICLES_FILE = path.join(dataDir, "articles.json");
const ORDERS_FILE = path.join(dataDir, "orders.json");
const LABOR_CONFIG_FILE = path.join(dataDir, "labor-config.json");
const DASHBOARD_CONFIG_FILE = path.join(dataDir, "dashboard-config.json");

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
        return true;
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        return false;
    }
};

// ==================== MATERIALS ====================
export const getMaterials = (): Material[] => {
    return readJsonFile(MATERIALS_FILE, []);
};

export const saveMaterials = (materials: Material[]): boolean => {
    return writeJsonFile(MATERIALS_FILE, materials);
};

// ==================== COLORS ====================
export const getColors = (): Color[] => {
    return readJsonFile(COLORS_FILE, []);
};

export const saveColors = (colors: Color[]): boolean => {
    return writeJsonFile(COLORS_FILE, colors);
};

// ==================== ARTICLES ====================
export const getArticles = (): Article[] => {
    return readJsonFile(ARTICLES_FILE, []);
};

export const saveArticles = (articles: Article[]): boolean => {
    return writeJsonFile(ARTICLES_FILE, articles);
};

// ==================== ORDERS ====================
export const getOrders = (): Order[] => {
    return readJsonFile(ORDERS_FILE, []);
};

export const saveOrders = (orders: Order[]): boolean => {
    return writeJsonFile(ORDERS_FILE, orders);
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
    colors: Color[],
): number {
    let cost = 0;

    for (const comp of article.composition) {
        const material = materials.find((m) => m.id === comp.materialId);
        if (material) {
            cost += material.costPerGramm * comp.quantityGramms;
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
    colors: Color[],
    laborConfig: LaborConfig,
): number {
    const materialCost = calculateArticleCost(article, materials, colors);
    const laborCost = calculateLaborCost(article, laborConfig);
    const totalCost = materialCost + laborCost;
    const marginAmount = totalCost * (article.marginPercentage / 100);
    const finalPrice = totalCost + marginAmount;

    return parseFloat(finalPrice.toFixed(2));
}
