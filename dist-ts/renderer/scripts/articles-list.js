"use strict";
(() => {
  // src/renderer/scripts/shared.ts
  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }
  function setActiveNav() {
    const page = document.body.getAttribute("data-page");
    qsa(".nav a").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
      }
    });
  }
  function showMessage(text, type = "success") {
    const msg = document.getElementById("message");
    if (!msg) return;
    msg.className = `message ${type}`;
    msg.textContent = text;
  }
  function clearMessage(delayMs = 2e3) {
    const msg = document.getElementById("message");
    if (!msg) return;
    setTimeout(() => {
      msg.className = "message";
      msg.textContent = "";
    }, delayMs);
  }
  setActiveNav();

  // src/renderer/scripts/articles-list.ts
  var articles = [];
  var materials = [];
  var filterText = "";
  var sortMode = "code-asc";
  var tbody = qs("#articles-body");
  var searchInput = qs("#search-articles");
  var refreshBtn = qs("#refresh-articles");
  var sortSelect = qs("#sort-articles");
  var duplicateModal = qs("#duplicate-modal");
  var dupNameInput = qs("#dup-name");
  var dupCodeInput = qs("#dup-code");
  var dupCancelBtn = qs("#dup-cancel");
  var dupConfirmBtn = qs("#dup-confirm");
  var dupBackdrop = qs("#duplicate-modal .modal-backdrop");
  var duplicateSourceId = null;
  async function loadData() {
    try {
      articles = await window.api.getArticles();
      materials = await window.api.getMaterials();
      renderTable();
    } catch {
      showMessage("Errore nel caricamento dei dati", "error");
    }
  }
  function compositionCostFor(article) {
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
    filtered.sort((a, b) => {
      switch (sortMode) {
        case "code-desc":
          return b.code.localeCompare(a.code);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "components-asc":
          return a.composition.length - b.composition.length;
        case "components-desc":
          return b.composition.length - a.composition.length;
        case "labor-asc":
          return a.laborHoursRequired - b.laborHoursRequired;
        case "labor-desc":
          return b.laborHoursRequired - a.laborHoursRequired;
        case "cost-asc":
          return compositionCostFor(a) - compositionCostFor(b);
        case "cost-desc":
          return compositionCostFor(b) - compositionCostFor(a);
        case "code-asc":
        default:
          return a.code.localeCompare(b.code);
      }
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
                <button class="icon-btn" data-action="duplicate" data-id="${a.id}" title="Duplica" aria-label="Duplica">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="9" y="9" width="11" height="11" rx="2"></rect>
                        <rect x="4" y="4" width="11" height="11" rx="2"></rect>
                    </svg>
                </button>
                <a class="icon-btn" href="article-form.html?id=${a.id}&return=articles.html&popup=1" target="_blank" rel="noopener" title="Modifica" aria-label="Modifica">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 16.5V20h3.5L18 9.5l-3.5-3.5L4 16.5z"></path>
                        <path d="M13.5 6.5l3.5 3.5"></path>
                    </svg>
                </a>
                <button class="icon-btn danger" data-action="delete" data-id="${a.id}" title="Elimina" aria-label="Elimina">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 7h12"></path>
                        <path d="M9 7V5h6v2"></path>
                        <path d="M8 7l1 12h6l1-12"></path>
                    </svg>
                </button>
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
  sortSelect?.addEventListener("change", () => {
    sortMode = sortSelect.value;
    renderTable();
  });
  refreshBtn?.addEventListener("click", () => {
    loadData();
  });
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    const row = target.closest("tr");
    const rowId = row?.getAttribute("data-id");
    const actionEl = target.closest("[data-action]");
    const action = actionEl?.getAttribute("data-action");
    const id = actionEl?.getAttribute("data-id") || rowId;
    if (action === "delete" && id) {
      e.preventDefault();
      e.stopPropagation();
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
    if (action === "duplicate" && id) {
      e.preventDefault();
      e.stopPropagation();
      const original = articles.find((a) => a.id === id);
      if (!original) return;
      duplicateSourceId = id;
      dupNameInput.value = `${original.name} (copia)`;
      dupCodeInput.value = original.code;
      duplicateModal.classList.remove("hidden");
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
  function closeDuplicateModal() {
    duplicateModal.classList.add("hidden");
    duplicateSourceId = null;
  }
  dupCancelBtn.addEventListener("click", () => closeDuplicateModal());
  dupBackdrop.addEventListener("click", () => closeDuplicateModal());
  dupConfirmBtn.addEventListener("click", async () => {
    if (!duplicateSourceId) return;
    const original = articles.find((a) => a.id === duplicateSourceId);
    if (!original) {
      closeDuplicateModal();
      return;
    }
    const trimmedName = dupNameInput.value.trim();
    const trimmedCode = dupCodeInput.value.trim().toUpperCase();
    if (!trimmedName) {
      showMessage("Nome non valido", "error");
      return;
    }
    if (!trimmedCode) {
      showMessage("Codice non valido", "error");
      return;
    }
    const exists = articles.some((a) => a.code.toUpperCase() === trimmedCode);
    if (exists) {
      showMessage("Codice gia esistente", "error");
      return;
    }
    const newArticle = {
      ...original,
      id: Date.now().toString(),
      code: trimmedCode,
      name: trimmedName,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const updated = [...articles, newArticle];
    const success = await window.api.saveArticles(updated);
    if (success) {
      articles = updated;
      renderTable();
      const url = `article-form.html?id=${newArticle.id}&return=articles.html&popup=1`;
      window.open(url, "_blank", "width=1200,height=800");
      showMessage("Articolo duplicato!", "success");
      clearMessage();
      closeDuplicateModal();
    }
  });
})();
//# sourceMappingURL=articles-list.js.map
