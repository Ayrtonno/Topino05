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
  function formatDate(dateIso) {
    if (!dateIso) return "-";
    try {
      return new Date(dateIso).toLocaleDateString();
    } catch {
      return "-";
    }
  }
  setActiveNav();

  // src/renderer/scripts/deposito.ts
  var items = [];
  var articles = [];
  var materials = [];
  var inventory = [];
  var editingId = null;
  var filterText = "";
  var currentColorSelections = [];
  var form = qs("#deposit-form");
  var toggleBtn = qs("#toggle-deposit-form");
  var tbody = qs("#deposit-body");
  var searchInput = qs("#search-deposit");
  var refreshBtn = qs("#refresh-deposit");
  var articleSelect = qs("#deposit-article");
  var qtyInput = qs("#deposit-qty");
  var moveType = qs("#deposit-move-type");
  var submitBtn = qs("#submit-deposit");
  var colorsBody = qs("#deposit-colors-body");
  function setFormVisible(visible) {
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
    currentColorSelections = [];
    colorsBody.innerHTML = "";
  }
  function newId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function getArticleById(id) {
    return articles.find((a) => a.id === id);
  }
  function normalizeColor(value) {
    return (value || "").trim().toLowerCase();
  }
  function normalizeColors(colors, len) {
    return Array.from({ length: len }).map((_, i) => normalizeColor(colors[i]));
  }
  function getAvailableColors(materialId) {
    const colors = /* @__PURE__ */ new Set();
    inventory.forEach((row) => {
      if (row.materialId !== materialId) return;
      const name = (row.colorName || "").trim();
      if (name) colors.add(name);
    });
    return Array.from(colors).sort((a, b) => a.localeCompare(b));
  }
  function renderColorRows(article) {
    colorsBody.innerHTML = "";
    currentColorSelections = [];
    if (!article) return;
    article.composition.forEach((comp, index) => {
      const material = materials.find((m) => m.id === comp.materialId);
      const unitLabel = material?.unit === "pezzi" ? "pz" : "g";
      const colors = getAvailableColors(comp.materialId);
      const tr = document.createElement("tr");
      const colorCell = colors.length ? `<select data-color-index="${index}">
                    <option value="">Nessun colore</option>
                    ${colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
               </select>` : `<span class="muted">N/A</span>`;
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
  function findVariant(articleId, colors, compositionLength) {
    const normalized = normalizeColors(colors, compositionLength);
    return items.find((v) => {
      if (v.articleId !== articleId) return false;
      const stored = normalizeColors(v.colors || [], compositionLength);
      return stored.join("|") === normalized.join("|");
    });
  }
  function nextVariantCode(article) {
    const prefix = `${article.code}-`;
    const existing = items.filter((v) => v.articleId === article.id && v.variantCode?.startsWith(prefix)).map((v) => parseInt(v.variantCode.replace(prefix, ""), 10)).filter((n) => !Number.isNaN(n));
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
          colors: Array.from({ length: article.composition.length }).map(() => "")
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
    filtered.forEach((i) => {
      const article = getArticleById(i.articleId);
      const variantLabel = article && i.variantCode ? i.variantCode.replace(`${article.code}-`, "").replace("-", "") : "-";
      const colorsLabel = (i.colors || []).map((c, idx) => {
        if (!c) return "";
        const materialId = article?.composition?.[idx]?.materialId;
        const material = materials.find((m) => m.id === materialId);
        return `${material?.name || "Materiale"}: ${c}`;
      }).filter(Boolean).join(", ");
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let updated = [...items];
    const article = getArticleById(articleSelect.value);
    if (!article) {
      showMessage("Articolo non valido", "error");
      return;
    }
    const variantColors = normalizeColors(currentColorSelections, article.composition.length).map((_, idx) => currentColorSelections[idx] || "");
    if (editingId) {
      updated = updated.map(
        (i) => i.id === editingId ? { ...i, quantity: qtyValue, lastUpdated: now } : i
      );
    } else {
      let row = findVariant(article.id, variantColors, article.composition.length);
      if (!row) {
        row = {
          id: newId(),
          articleId: article.id,
          variantCode: nextVariantCode(article),
          colors: variantColors,
          quantity: 0,
          lastUpdated: now
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
    const target = e.target;
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
      selects.forEach((select, idx) => {
        const value = row.colors?.[idx] || "";
        select.value = value;
        select.disabled = true;
      });
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
  refreshBtn.addEventListener("click", () => {
    loadData();
  });
  articleSelect.addEventListener("change", () => {
    const article = getArticleById(articleSelect.value);
    renderColorRows(article);
  });
  colorsBody.addEventListener("change", (e) => {
    const target = e.target;
    if (!target || target.tagName !== "SELECT") return;
    const indexStr = target.getAttribute("data-color-index");
    if (indexStr === null) return;
    const index = parseInt(indexStr, 10);
    currentColorSelections[index] = target.value;
  });
  loadData();
})();
//# sourceMappingURL=deposito.js.map
