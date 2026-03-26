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
  var tbody = qs("#articles-body");
  var searchInput = qs("#search-articles");
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
            <td>
                <a class="btn-small" href="article-form.html?id=${a.id}" target="_blank" rel="noopener">Modifica</a>
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
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
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
    if (rowId) {
      window.location.href = `article-detail.html?id=${rowId}`;
    }
  });
  loadData();
})();
//# sourceMappingURL=articles-list.js.map
