// ============================================================
//  STORAGE – Pantry.cloud als Datenspeicher
// ============================================================

const Storage = (() => {
  let cache = null;

  const url = () =>
    `https://getpantry.cloud/apiv1/pantry/${CONFIG.PANTRY_ID}/basket/${CONFIG.BASKET}`;

  const defaultData = () => ({
    standorte: [
      { id: uid(), name: 'Zürich',   beschreibung: 'Kreis 1, Innenstadt' },
      { id: uid(), name: 'Bern',     beschreibung: 'Altstadt' },
      { id: uid(), name: 'Basel',    beschreibung: 'Innenstadt' },
    ],
    termine: [],
    anmeldungen: {},
  });

  async function load(force = false) {
    if (cache && !force) return cache;
    if (!CONFIG.PANTRY_ID) { cache = loadLocal(); return cache; }
    try {
      const res = await fetch(url());
      if (res.status === 400) { cache = defaultData(); return cache; }
      if (!res.ok) throw new Error(res.status);
      cache = await res.json();
      if (!cache.standorte) cache = defaultData();
      return cache;
    } catch (e) {
      console.warn('Pantry nicht erreichbar, nutze lokalen Speicher:', e);
      cache = loadLocal();
      return cache;
    }
  }

  async function save() {
    saveLocal();
    if (!CONFIG.PANTRY_ID) return;
    try {
      await fetch(url(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cache),
      });
    } catch (e) {
      console.warn('Pantry-Speicher fehlgeschlagen:', e);
    }
  }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem('minibridge') || 'null') || defaultData(); }
    catch { return defaultData(); }
  }
  function saveLocal() {
    if (cache) localStorage.setItem('minibridge', JSON.stringify(cache));
  }

  return {
    async getData(force) { return load(force); },
    async setData(fn) {
      const d = await load();
      fn(d);
      await save();
    },
    invalidate() { cache = null; },
  };
})();
