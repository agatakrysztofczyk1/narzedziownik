// ==========================
// NARZĘDZIOWNIK – app.js (PWA + IndexedDB + modal + ukryty formularz)
// ==========================

// --- Elementy interfejsu ---
const form = document.getElementById("toolForm");
const list = document.getElementById("toolsList");
const searchInput = document.getElementById("searchInput");
const cancelEditBtn = document.getElementById("cancelEdit");
const offlineStatus = document.getElementById("offlineStatus");
const hashtagFilter = document.getElementById("hashtagFilter");
const formToggleBtn = document.getElementById("toggleFormBtn"); // nowy przycisk
const modal = document.getElementById("toolModal");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModalBtn");

let activeTag = null;

// --- Obsługa trybu offline ---
window.addEventListener("online", () => offlineStatus.textContent = "🟢 online");
window.addEventListener("offline", () => offlineStatus.textContent = "🔴 offline");

// --- Rejestracja Service Workera ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/narzedziownik/service-worker.js");
}

// ==========================
// DARK MODE - przełącznik
// ==========================
const body = document.body;
const themeToggleBtn = document.getElementById("toggleThemeBtn");
if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark");
  themeToggleBtn.textContent = "☀️ Tryb jasny";
}
themeToggleBtn.addEventListener("click", () => {
  body.classList.toggle("dark");
  const isDark = body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggleBtn.textContent = isDark ? "☀️ Tryb jasny" : "🌙 Tryb ciemny";
});

// ==========================
// FORMULARZ – ukrywanie/pokazywanie
// ==========================
document.getElementById("formSection").style.display = "none";
formToggleBtn.addEventListener("click", () => {
  const formSection = document.getElementById("formSection");
  const visible = formSection.style.display === "block";
  formSection.style.display = visible ? "none" : "block";
  formToggleBtn.textContent = visible ? "➕ Dodaj nowe narzędzie" : "✖️ Ukryj formularz";
});

// ==========================
// RENDEROWANIE LISTY – widok skrócony
// ==========================
async function renderTools(tools = null) {
  const all = tools || await getAllTools();
  list.innerHTML = "";

  if (all.length === 0) {
    list.innerHTML = "<p>Brak narzędzi.</p>";
    return;
  }

  all.forEach(tool => {
    const card = document.createElement("div");
    card.className = "card";
    card.addEventListener("click", () => openToolModal(tool)); // otwieranie modala

    const namePL = tool.nazwaPL ? `<h3>${tool.nazwaPL}</h3>` : "";
    const nameEN = tool.nazwaEN ? `<h4>${tool.nazwaEN}</h4>` : "";

    card.innerHTML = `
      ${namePL || nameEN || "<h3>Bez nazwy</h3>"}
      ${tool.kategoria ? `<p><strong>Kategoria:</strong> <span>${tool.kategoria}</span></p>` : ""}
      ${tool.potrzebne ? `<p><strong>Potrzebne:</strong> <span>${tool.potrzebne}</span></p>` : ""}
      ${tool.efekt ? `<p><strong>Efekt:</strong> <span>${tool.efekt}</span></p>` : ""}
      ${tool.czasEfektu ? `<p><strong>Czas efektu:</strong> <span>${tool.czasEfektu}</span></p>` : ""}
      ${tool.przeciwskazania ? `<p><strong>Przeciwwskazania:</strong> <span>${tool.przeciwskazania}</span></p>` : ""}
    `;
    list.appendChild(card);
  });

  renderTagFilters();
}

// ==========================
// MODAL – pełne szczegóły narzędzia
// ==========================
function openToolModal(tool) {
  modal.style.display = "block";
  modalContent.innerHTML = `
    <h2>${tool.nazwaPL || tool.nazwaEN || "Bez nazwy"}</h2>
    ${tool.nazwaEN ? `<p><strong>Nazwa (EN):</strong> ${tool.nazwaEN}</p>` : ""}
    ${tool.kategoria ? `<p><strong>Kategoria:</strong> ${tool.kategoria}</p>` : ""}
    ${tool.potrzebne ? `<p><strong>Co będzie potrzebne do wykonania?:</strong><br><span style="white-space: pre-line;">${tool.potrzebne}</span></p>` : ""}
    ${tool.efekt ? `<p><strong>Jaki daje efekt?:</strong><br><span style="white-space: pre-line;">${tool.efekt}</span></p>` : ""}
    ${tool.czasEfektu ? `<p><strong>Po jakim czasie można zauważyć efekt?:</strong><br><span style="white-space: pre-line;">${tool.czasEfektu}</span></p>` : ""}
    ${tool.przeciwskazania ? `<p><strong>Przeciwwskazania:</strong><br><span style="white-space: pre-line;">${tool.przeciwskazania}</span></p>` : ""}
    ${tool.instrukcja ? `<p><strong>Instrukcja:</strong><br><span style="white-space: pre-line;">${tool.instrukcja}</span></p>` : ""}
    ${tool.linkYoutube ? `<p><strong>🎥 Link do YouTube:</strong> <a href="${tool.linkYoutube}" target="_blank">${tool.linkYoutube}</a></p>` : ""}
    ${tool.linkWWW ? `<p><strong>🌐 Link do strony:</strong> <a href="${tool.linkWWW}" target="_blank">${tool.linkWWW}</a></p>` : ""}
    ${tool.nurt ? `<p><strong>W jakim nurcie psychoterapii jest wykorzystywane?:</strong> ${tool.nurt}</p>` : ""}
    ${tool.hasztagi?.length ? `<p><strong>Na co pomaga:</strong> ${(tool.hasztagi || []).map(h => `<span class="tag">${h}</span>`).join(" ")}</p>` : ""}
    <button id="closeModalBtnInner" class="close-modal-btn" aria-label="Zamknij okno">×</button>

  `;

  document.getElementById("closeModalBtnInner").addEventListener("click", closeModal);
}

function closeModal() {
  modal.style.display = "none";
  modalContent.innerHTML = "";
}

// ==========================
// FILTROWANIE PO HASZTAGACH
// ==========================
async function renderTagFilters() {
  const tools = await getAllTools();
  const tags = new Set(tools.flatMap(t => t.hasztagi || []));
  hashtagFilter.innerHTML = "";
  tags.forEach(tag => {
    const span = document.createElement("span");
    span.textContent = tag;
    span.className = "hashtag" + (tag === activeTag ? " active" : "");
    span.onclick = () => filterByTag(tag);
    hashtagFilter.appendChild(span);
  });
}

async function filterByTag(tag) {
  if (activeTag === tag) {
    activeTag = null;
    renderTools();
  } else {
    activeTag = tag;
    const filtered = await searchByTag(tag);
    renderTools(filtered);
  }
}

// ==========================
// OBSŁUGA FORMULARZA (dodawanie / edycja / usuwanie)
// ==========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("toolId").value;

  const nazwaPL = document.getElementById("nazwaPL").value.trim();
  const nazwaEN = document.getElementById("nazwaEN").value.trim();
  const kategoria = document.getElementById("kategoria").value.trim();
  const potrzebne = document.getElementById("potrzebne").value.trim();
  const efekt = document.getElementById("efekt").value.trim();
  const czasEfektu = document.getElementById("czasEfektu").value.trim();
  const przeciwskazania = document.getElementById("przeciwskazania").value.trim();
  const instrukcja = document.getElementById("instrukcja").value.trim();
  const linkYoutube = document.getElementById("linkYoutube").value.trim();
  const linkWWW = document.getElementById("linkWWW").value.trim();
  const hasztagi = document.getElementById("hasztagi").value
    .split(" ")
    .filter(h => h.startsWith("#") && h.length > 1);
  const nurt = document.getElementById("nurt").value.trim();

  if (!nazwaPL && !nazwaEN) {
    alert("Musisz podać co najmniej nazwę po polsku lub angielsku.");
    return;
  }

  const tool = {
    nazwaPL, nazwaEN, kategoria, potrzebne, efekt, czasEfektu,
    przeciwskazania, instrukcja, linkYoutube, linkWWW, hasztagi, nurt
  };

  if (id) {
    await updateTool(Number(id), tool);
  } else {
    await addTool(tool);
  }

  form.reset();
  cancelEditBtn.classList.add("hidden");
  form.style.display = "none";
  formToggleBtn.textContent = "➕ Dodaj nowe narzędzie";
  renderTools();
});

async function removeTool(id) {
  await deleteTool(id);
  renderTools();
}

async function editTool(id) {
  const tool = await db.tools.get(id);
  document.getElementById("toolId").value = tool.id;
  document.getElementById("nazwaPL").value = tool.nazwaPL || "";
  document.getElementById("nazwaEN").value = tool.nazwaEN || "";
  document.getElementById("kategoria").value = tool.kategoria || "";
  document.getElementById("potrzebne").value = tool.potrzebne || "";
  document.getElementById("efekt").value = tool.efekt || "";
  document.getElementById("czasEfektu").value = tool.czasEfektu || "";
  document.getElementById("przeciwskazania").value = tool.przeciwskazania || "";
  document.getElementById("instrukcja").value = tool.instrukcja || "";
  document.getElementById("linkYoutube").value = tool.linkYoutube || "";
  document.getElementById("linkWWW").value = tool.linkWWW || "";
  document.getElementById("hasztagi").value = (tool.hasztagi || []).join(" ");
  document.getElementById("nurt").value = tool.nurt || "";
  cancelEditBtn.classList.remove("hidden");
  form.style.display = "block";
  formToggleBtn.textContent = "✖️ Ukryj formularz";
}

cancelEditBtn.addEventListener("click", () => {
  form.reset();
  cancelEditBtn.classList.add("hidden");
  form.style.display = "none";
  formToggleBtn.textContent = "➕ Dodaj nowe narzędzie";
});

// ==========================
// WYSZUKIWANIE
// ==========================
searchInput.addEventListener("input", async () => {
  const term = searchInput.value.toLowerCase();
  const all = await getAllTools();
  const filtered = all.filter(t =>
    (t.nazwaPL?.toLowerCase().includes(term)) ||
    (t.nazwaEN?.toLowerCase().includes(term)) ||
    (t.kategoria?.toLowerCase().includes(term)) ||
    (t.efekt?.toLowerCase().includes(term)) ||
    (t.instrukcja?.toLowerCase().includes(term))
  );
  renderTools(filtered);
});

// ==========================
// IMPORT CSV (separator | + <EOL> + enter)
// ==========================
async function importToolsFromCSV() {
  try {
    const response = await fetch("tools.csv");
    if (!response.ok) return;

    const text = await response.text();
    const rawRecords = text.split(/<EOL>\r?\n/).filter(r => r.trim().length > 0);
    const headerLine = rawRecords.shift();
    const headers = headerLine.split("|").map(h => h.trim());

    for (const record of rawRecords) {
      const values = record.split("|");
      const item = {};
      headers.forEach((h, i) => item[h] = values[i] !== undefined ? values[i] : "");

      const hasztagi = (item["Na co pomaga (hashtagi)"] || "")
	    .split(" ")
		.filter(h => h.startsWith("#"));


      await addTool({
        nazwaPL: item["Nazwa narzędzia (PL)"],
        nazwaEN: item["Nazwa narzędzia (EN)"],
        kategoria: item["Kategoria"],
        potrzebne: item["Co będzie potrzebne do wykonania?"],
        efekt: item["Jaki daje efekt?"],
        czasEfektu: item["Po jakim czasie można zauważyć efekt?"],
        przeciwskazania: item["Przeciwskazania"],
        instrukcja: item["Instrukcja"],
        linkYoutube: item["Link do instruktażu na youtube"],
        linkWWW: item["Link do strony www z opisem"],
        hasztagi,
        nurt: item["W jakim nurcie psychoterapii jest wykorzystywane?"]
      });
    }

    console.log(`✅ Zaimportowano ${rawRecords.length} rekordów z tools.csv`);
  } catch (err) {
    console.error("❌ Błąd importu CSV:", err);
  }
}

// ==========================
// INICJALIZACJA
// ==========================
window.addEventListener("load", async () => {
  const tools = await getAllTools();
  if (!tools.length) {
    await importToolsFromCSV();
  }
  renderTools(await getAllTools());
});

