import { qs, showMessage, clearMessage } from "./shared";

type Article = {
    id: string;
    code: string;
    name: string;
    composition: { materialId: string; description?: string; quantity: number }[];
    laborHoursRequired: number;
    materialMarkupPct: number;
    laborMarkupPct: number;
    createdAt: string;
};

type Material = {
    id: string;
    costPerUnit: number;
};

let articles: Article[] = [];
let materials: Material[] = [];
let filterText = "";

const tbody = qs<HTMLTableSectionElement>("#articles-body");
const searchInput = qs<HTMLInputElement>("#search-articles");
const refreshBtn = qs<HTMLButtonElement>("#refresh-articles");

async function loadData() {
    try {
        articles = await window.api.getArticles();
        materials = await window.api.getMaterials();
        renderTable();
    } catch {
        showMessage("Errore nel caricamento dei dati", "error");
    }
}

function compositionCostFor(article: Article) {
    return article.composition.reduce((total, comp) => {
        const material = materials.find((m) => m.id === comp.materialId);
        return total + (material?.costPerUnit || 0) * comp.quantity;
    }, 0);
}

function renderTable() {
    tbody.innerHTML = "";
    const empty = document.getElementById("articles-empty");
    const filtered = articles.filter((a) => {
        const text = `${a.code} ${a.name}`.toLowerCase();
        return text.includes(filterText);
    });
    filtered.forEach((a) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", a.id);
        tr.innerHTML = `
            <td>${a.code}</td>
            <td>${a.name}</td>
            <td>${a.composition.length}</td>
            <td>${a.laborHoursRequired}h</td>
            <td>${a.materialMarkupPct}%</td>
            <td>${a.laborMarkupPct}%</td>
            <td>${compositionCostFor(a).toFixed(2)}</td>
            <td class="actions-cell">
                <a class="btn-small" href="article-form.html?id=${a.id}&return=articles.html&popup=1" target="_blank" rel="noopener">Modifica</a>
                <button class="btn-small btn-danger" data-action="delete" data-id="${a.id}">Elimina</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (empty) {
        empty.classList.toggle("hidden", filtered.length > 0);
    }
}

searchInput?.addEventListener("input", () => {
    filterText = searchInput.value.trim().toLowerCase();
    renderTable();
});

refreshBtn?.addEventListener("click", () => {
    loadData();
});

tbody.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest("tr");
    const rowId = row?.getAttribute("data-id");
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (action === "delete" && id) {
        if (!window.confirm("Eliminare questo articolo?")) return;
        const updated = articles.filter((a) => a.id !== id);
        const success = await window.api.saveArticles(updated);
        if (success) {
            articles = updated;
            renderTable();
            showMessage("Articolo eliminato!", "success");
            clearMessage();
        }
        return;
    }
    if (target.closest("a") || target.closest("button")) {
        return;
    }

    if (rowId) {
        window.location.href = `article-detail.html?id=${rowId}`;
    }
});

loadData();
