import { qs, showMessage, clearMessage } from "./shared";

type ArticleComposition = {
    materialId: string;
    colorName?: string;
    quantity: number;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: ArticleComposition[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
    createdAt: string;
};

type Material = {
    id: string;
    name: string;
    costPerUnit: number;
    sellingPricePerUnit: number;
    unit: "grammi" | "pezzi";
};

let articles: Article[] = [];
let materials: Material[] = [];
let composition: ArticleComposition[] = [];
let hourlyRate = 0;
let editingId: string | null = null;

const form = qs<HTMLFormElement>("#article-form");
const compBody = qs<HTMLTableSectionElement>("#composition-body");
const compCost = qs<HTMLDivElement>("#composition-cost");
const unitLabel = qs<HTMLDivElement>("#comp-unit-label");

const codeInput = qs<HTMLInputElement>("#article-code");
const nameInput = qs<HTMLInputElement>("#article-name");
const laborInput = qs<HTMLInputElement>("#article-labor");
const materialMarkupInput = qs<HTMLInputElement>("#article-material-markup");
const laborMarkupInput = qs<HTMLInputElement>("#article-labor-markup");
const submitBtn = qs<HTMLButtonElement>("#submit-article");

const compMaterial = qs<HTMLSelectElement>("#comp-material");
const compColor = qs<HTMLInputElement>("#comp-color");
const compQty = qs<HTMLInputElement>("#comp-qty");
const addCompBtn = qs<HTMLButtonElement>("#add-comp");


function getQueryId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function renderMaterialOptions() {
    compMaterial.innerHTML = '<option value="">Seleziona materiale</option>';
    materials.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        compMaterial.appendChild(opt);
    });
}

function getMaterialName(id: string) {
    return materials.find((m) => m.id === id)?.name || "-";
}

function compositionCost() {
    return composition.reduce((total, comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        return total + (material?.costPerUnit || 0) * comp.quantity;
    }, 0);
}

function renderComposition() {
    compBody.innerHTML = "";
    composition.forEach((comp, idx) => {
        const material = getMaterialName(comp.materialId);
        const color = comp.colorName || "-";
        const materialData = materials.find((m) => m.id === comp.materialId);
        const materialCost = materialData?.costPerUnit || 0;
        const unitLabel = materialData?.unit === "pezzi" ? "pz" : "g";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${material}</td>
            <td>${color}</td>
            <td>${comp.quantity} ${unitLabel}</td>
            <td>EUR ${(materialCost * comp.quantity).toFixed(3)}</td>
            <td><button class="btn-small btn-danger" data-action="remove" data-index="${idx}">Rimuovi</button></td>
        `;
        compBody.appendChild(tr);
    });
    compCost.textContent = `Costo Materiale: EUR ${compositionCost().toFixed(2)}`;
}


async function loadData() {
    try {
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        const laborConfig = await window.api.getLaborConfig();
        hourlyRate = laborConfig.hourlyRate || 0;
        renderMaterialOptions();

        const id = getQueryId();
        if (id) {
            const article = articles.find((a) => a.id === id);
            if (article) {
                editingId = id;
                codeInput.value = article.code;
                nameInput.value = article.name;
                laborInput.value = article.laborHoursRequired.toString();
                materialMarkupInput.value = article.materialMarkupPct.toString();
                laborMarkupInput.value = article.laborMarkupPct.toString();
                composition = [...article.composition];
                const title = document.getElementById("form-title");
                if (title) title.textContent = "Modifica Articolo";
                submitBtn.textContent = "Salva Modifiche";
            }
        }
        renderComposition();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

compMaterial.addEventListener("change", () => {
    const materialId = compMaterial.value;
    const materialData = materials.find((m) => m.id === materialId);
    if (unitLabel) {
        const label = materialData?.unit === "pezzi" ? "pz" : "g";
        unitLabel.textContent = materialData ? `Unita: ${label}` : "Unita: -";
    }
});

addCompBtn.addEventListener("click", () => {
    if (!compMaterial.value || !compQty.value) {
        showMessage("Completa tutti i campi della composizione", "error");
        return;
    }
    const qty = parseFloat(compQty.value) || 0;
    if (qty <= 0) {
        showMessage("Quantita non valida", "error");
        return;
    }
    composition.push({
        materialId: compMaterial.value,
        colorName: compColor.value.trim() || undefined,
        quantity: qty,
    });
    compMaterial.value = "";
    compColor.value = "";
    compQty.value = "0";
    unitLabel.textContent = "Unita: -";
    renderComposition();
    showMessage("Componente aggiunto!", "success");
    clearMessage();
});

compBody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const indexStr = target.getAttribute("data-index");
    if (action !== "remove" || indexStr === null) return;
    const index = parseInt(indexStr, 10);
    composition = composition.filter((_, i) => i !== index);
    renderComposition();
});


form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!codeInput.value || !nameInput.value || composition.length === 0) {
        showMessage("Completa tutti i campi obbligatori", "error");
        return;
    }

    const data: Article = {
        id: editingId ?? Date.now().toString(),
        code: codeInput.value.trim(),
        name: nameInput.value.trim(),
        composition: composition,
        laborHoursRequired: parseFloat(laborInput.value) || 0,
        materialMarkupPct: parseFloat(materialMarkupInput.value) || 0,
        laborMarkupPct: parseFloat(laborMarkupInput.value) || 0,
        createdAt: editingId
            ? articles.find((a) => a.id === editingId)?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
    };

    let updated: Article[];
    if (editingId) {
        updated = articles.map((a) => (a.id === editingId ? data : a));
    } else {
        updated = [...articles, data];
    }

    const success = await window.api.saveArticles(updated);
    if (success) {
        showMessage("Articolo salvato!", "success");
        clearMessage();
        window.location.href = "articles.html";
    }
});

loadData();
