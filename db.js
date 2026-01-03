// ==========================
// db.js — konfiguracja IndexedDB (Dexie)
// ==========================

const db = new Dexie("narzedziownikDB");

db.version(3).stores({
  tools: `
    ++id,
    nazwaPL,
    nazwaEN,
    kategoria,
    potrzebne,
    efekt,
    czasEfektu,
    przeciwskazania,
    instrukcja,
    linkYoutube,
    linkWWW,
    hasztagi,
    nurt
  `
});

// --- podstawowe operacje ---
async function addTool(tool) {
  return await db.tools.add(tool);
}

async function getAllTools() {
  return await db.tools.toArray();
}

async function updateTool(id, tool) {
  return await db.tools.update(id, tool);
}

async function deleteTool(id) {
  return await db.tools.delete(id);
}

async function searchByTag(tag) {
  const all = await getAllTools();
  return all.filter(t => (t.hasztagi || []).includes(tag));
}

// --- reset bazy i ponowny import ---
async function resetDatabaseAndImport() {
  await db.delete();
  if (typeof importToolsFromCSV === "function") {
    await importToolsFromCSV();
    console.log("🔄 Baza danych zresetowana i ponownie zaimportowana.");
  } else {
    console.warn("⚠️ Funkcja importToolsFromCSV nie została jeszcze załadowana.");
  }
}
