import { qs, showMessage, clearMessage, formatDate } from "./shared";

type ArticleInventoryItem = {
    id: string;
    articleId: string;
    variantCode: string;
    colors: string[];
    quantity: number;
    lastUpdated: string;
};

type Article = {
    id: string;
    code: string;
    name: string;
    composition: { materialId: string; description?: string; quantity: number }[];
};

type Material = {
    id: string;
    name: string;
    unit?: "grammi" | "pezzi";
};

type InventoryItem = {
    id: string;
    materialId: string;
    colorName?: string;
    quantity: number;
    lastUpdated: string;
};

let items: ArticleInventoryItem[] = [];
let articles: Article[] = [];
let materials: Material[] = [];
let inventory: InventoryItem[] = [];
let editingId: string | null = null;
let filterText = "";
let currentColorSelections: string[] = [];
let sortMode = "code-asc";
let editingColors: string[] = [];

const form = qs<HTMLFormElement>("#deposit-form");
const toggleBtn = qs<HTMLButtonElement>("#toggle-deposit-form");
const tbody = qs<HTMLTableSectionElement>("#deposit-body");
const searchInput = qs<HTMLInputElement>("#search-deposit");
const refreshBtn = document.querySelector<HTMLButtonElement>("#refresh-deposit");
const sortSelect = qs<HTMLSelectElement>("#sort-deposit");

const articleSelect = qs<HTMLSelectElement>("#deposit-article");
const qtyInput = qs<HTMLInputElement>("#deposit-qty");
const moveType = qs<HTMLSelectElement>("#deposit-move-type");
const submitBtn = qs<HTMLButtonElement>("#submit-deposit");
const colorsBody = qs<HTMLTableSectionElement>("#deposit-colors-body");

function setFormVisible(visible: boolean) {
    form.classList.toggle("hidden", !visible);
    toggleBtn.textContent = visible ? "Annulla" : "+ Nuova Giacenza";
}

function resetForm() {
    articleSelect.value = "";
    articleSelect.disabled = false;
    qtyInput.value = "0";
    moveType.value = "carico";
    submitBtn.textContent = "Salva";
    editingId = null;
    editingColors = [];
    currentColorSelections = [];
    colorsBody.innerHTML = "";
}

function newId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getArticleById(id: string) {
    return articles.find((a) => a.id === id);
}

function normalizeColor(value?: string) {
    return (value || "").trim().toLowerCase();
}

function normalizeColors(colors: string[], len: number) {
    return Array.from({ length: len }).map((_, i) => normalizeColor(colors[i]));
}

function getAvailableColors(materialId: string) {
    const colors = new Set<string>();
    inventory.forEach((row) => {
        if (row.materialId !== materialId) return;
        const name = (row.colorName || "").trim();
        if (name) colors.add(name);
    });
    return Array.from(colors).sort((a, b) => a.localeCompare(b));
}

function renderColorRows(article: Article | undefined) {
    colorsBody.innerHTML = "";
    currentColorSelections = [];
    if (!article) return;
    article.composition.forEach((comp, index) => {
        const material = materials.find((m) => m.id === comp.materialId);
        const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
        const colors = getAvailableColors(comp.materialId);
        const tr = document.createElement("tr");
        const colorCell = colors.length
            ? `<select data-color-index="${index}">
                    <option value="">Nessun colore</option>
                    ${colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
               </select>`
            : `<span class="muted">N/A</span>`;
        tr.innerHTML = `
            <td>${material?.name || "-"}</td>
            <td>${comp.description || "-"}</td>
            <td>${comp.quantity} ${unitLabel}</td>
            <td>${colorCell}</td>
        `;
        colorsBody.appendChild(tr);
        currentColorSelections[index] = "";
    });
}

function findVariant(articleId: string, colors: string[], compositionLength: number) {
    const normalized = normalizeColors(colors, compositionLength);
    return items.find((v) => {
        if (v.articleId !== articleId) return false;
        const stored = normalizeColors(v.colors || [], compositionLength);
        return stored.join("|") === normalized.join("|");
    });
}

function nextVariantCode(article: Article) {
    const prefix = `${article.code}-`;
    const existing = items
        .filter((v) => v.articleId === article.id && v.variantCode?.startsWith(prefix))
        .map((v) => parseInt(v.variantCode.replace(prefix, ""), 10))
        .filter((n) => !Number.isNaN(n));
    const next = existing.length ? Math.max(...existing) + 1 : 0;
    return `${article.code}-${next.toString().padStart(4, "0")}`;
}

function migrateLegacyVariants() {
    let changed = false;
    items = items.map((item) => {
        if (!item.variantCode || !Array.isArray(item.colors)) {
            const article = getArticleById(item.articleId);
            if (!article) return item;
            changed = true;
            return {
                ...item,
                variantCode: `${article.code}-0000`,
                colors: Array.from({ length: article.composition.length }).map(() => ""),
            };
        }
        return item;
    });
    return changed;
}

async function loadData() {
    try {
        items = await window.api.getArticleInventory();
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        inventory = await window.api.getInventory();
        const migrated = migrateLegacyVariants();
        if (migrated) {
            await window.api.saveArticleInventory(items);
        }
        renderArticleOptions();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function renderArticleOptions() {
    articleSelect.innerHTML = '<option value="">Seleziona articolo</option>';
    articles.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `(${a.code}) ${a.name}`;
        articleSelect.appendChild(opt);
    });
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("deposit-empty");
    const filtered = items.filter((i) => {
        const article = getArticleById(i.articleId);
        const text = `${article?.code || ""} ${article?.name || ""}`.toLowerCase();
        return text.includes(filterText);
    });
    filtered.sort((a, b) => {
        const articleA = getArticleById(a.articleId);
        const articleB = getArticleById(b.articleId);
        const codeA = articleA?.code || "";
        const codeB = articleB?.code || "";
        const nameA = articleA?.name || "";
        const nameB = articleB?.name || "";
        const varA = parseInt(a.variantCode?.replace(`${codeA}-`, "").replace("-", "") || "0", 10);
        const varB = parseInt(b.variantCode?.replace(`${codeB}-`, "").replace("-", "") || "0", 10);
        switch (sortMode) {
            case "code-desc":
                return codeB.localeCompare(codeA);
            case "variant-asc":
                return varA - varB;
            case "variant-desc":
                return varB - varA;
            case "name-asc":
                return nameA.localeCompare(nameB);
            case "name-desc":
                return nameB.localeCompare(nameA);
            case "qty-asc":
                return a.quantity - b.quantity;
            case "qty-desc":
                return b.quantity - a.quantity;
            case "code-asc":
            default:
                return codeA.localeCompare(codeB);
        }
    });
    filtered.forEach((i) => {
        const article = getArticleById(i.articleId);
        const variantLabel = article && i.variantCode
            ? i.variantCode.replace(`${article.code}-`, "").replace("-", "")
            : "-";
        const colorsLabel = (i.colors || [])
            .map((c, idx) => {
                if (!c) return "";
                const materialId = article?.composition?.[idx]?.materialId;
                const material = materials.find((m) => m.id === materialId);
                return `${material?.name || "Materiale"}: ${c}`;
            })
            .filter(Boolean)
            .join(", ");
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${article?.code || "-"}</td>
            <td><span class="hover-hint" data-tooltip="${colorsLabel || "Nessun colore"}">${variantLabel}</span></td>
            <td>${article?.name || "-"}</td>
            <td>${i.quantity.toFixed(0)}</td>
            <td>${formatDate(i.lastUpdated)}</td>
            <td>
                <button class="btn-small" data-action="edit" data-id="${i.id}">Modifica</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", filtered.length > 0);
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!articleSelect.value || !qtyInput.value) {
        showMessage("Completa tutti i campi richiesti", "error");
        return;
    }
    const qtyValue = parseFloat(qtyInput.value) || 0;
    const now = new Date().toISOString();

    let updated = [...items];
    const article = getArticleById(articleSelect.value);
    if (!article) {
        showMessage("Articolo non valido", "error");
        return;
    }
    const variantColors = normalizeColors(currentColorSelections, article.composition.length)
        .map((_, idx) => currentColorSelections[idx] || "");

    if (editingId) {
        const current = updated.find((i) => i.id === editingId);
        if (!current) return;
        const normalizedNew = normalizeColors(variantColors, article.composition.length);
        const normalizedOld = normalizeColors(editingColors, article.composition.length);
        const colorsChanged = normalizedNew.join("|") !== normalizedOld.join("|");
        const target = findVariant(article.id, variantColors, article.composition.length);

        if (colorsChanged && target && target.id !== current.id) {
            // move quantity to existing variant and remove current
            target.quantity = qtyValue;
            target.lastUpdated = now;
            updated = updated.filter((i) => i.id !== current.id);
        } else {
            updated = updated.map((i) =>
                i.id === editingId
                    ? {
                          ...i,
                          quantity: qtyValue,
                          colors: variantColors,
                          variantCode: colorsChanged ? nextVariantCode(article) : i.variantCode,
                          lastUpdated: now,
                      }
                    : i
            );
        }
    } else {
        let row = findVariant(article.id, variantColors, article.composition.length);
        if (!row) {
            row = {
                id: newId(),
                articleId: article.id,
                variantCode: nextVariantCode(article),
                colors: variantColors,
                quantity: 0,
                lastUpdated: now,
            };
            updated.push(row);
        }
        const sign = moveType.value === "scarico" ? -1 : 1;
        const nextQty = row.quantity + qtyValue * sign;
        if (nextQty < 0) {
            showMessage("Giacenza insufficiente per lo scarico", "error");
            return;
        }
        row.quantity = nextQty;
        row.lastUpdated = now;
    }

    const success = await window.api.saveArticleInventory(updated);
    if (success) {
        items = updated;
        renderTable();
        setFormVisible(false);
        resetForm();
        showMessage("Deposito aggiornato!", "success");
        clearMessage();
    }
});

tbody.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;
    const row = items.find((i) => i.id === id);
    if (!row) return;
    if (action === "edit") {
        editingId = id;
        articleSelect.value = row.articleId;
        articleSelect.disabled = true;
        renderColorRows(getArticleById(row.articleId));
        const selects = colorsBody.querySelectorAll("select");
        const colorList = row.colors || [];
        selects.forEach((select) => {
            const indexStr = select.getAttribute("data-color-index");
            const index = indexStr ? parseInt(indexStr, 10) : -1;
            const value = index >= 0 ? colorList[index] : "";
            (select as HTMLSelectElement).value = value || "";
        });
        editingColors = [...(row.colors || [])];
        qtyInput.value = row.quantity.toString();
        submitBtn.textContent = "Salva Modifiche";
        setFormVisible(true);
    }
});

toggleBtn.addEventListener("click", () => {
    const visible = form.classList.contains("hidden");
    if (visible) resetForm();
    setFormVisible(visible);
});

searchInput.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
});

sortSelect.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderTable();
});

refreshBtn?.addEventListener("click", () => {
    loadData();
});

articleSelect.addEventListener("change", () => {
    const article = getArticleById(articleSelect.value);
    renderColorRows(article);
});

colorsBody.addEventListener("change", (e) => {
    const target = e.target as HTMLSelectElement;
    if (!target || target.tagName !== "SELECT") return;
    const indexStr = target.getAttribute("data-color-index");
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    currentColorSelections[index] = target.value;
});

loadData();
