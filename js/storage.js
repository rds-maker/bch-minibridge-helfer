// ============================================================
//  STORAGE – JSONBin als Datenspeicher
// ============================================================
const Storage = (() => {
  let cache = null;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${CONFIG.JB_BIN_ID}`;
  const HEADERS_READ  = { 'X-Master-Key': CONFIG.JB_KEY, 'X-Bin-Meta': 'false' };
  const HEADERS_WRITE = { 'X-Master-Key': CONFIG.JB_KEY, 'Content-Type': 'application/json' };

  const defaultData = () => ({
    standorte: [],
    termine: [],
    anmeldungen: {},
  });

  async function load(force = false) {
    if (cache && !force) return cache;
    // Immer zuerst JSONBin versuchen — kein sofortiger Fallback auf localStorage
    try {
      const res = await fetch(BASE_URL + '/latest', { headers: HEADERS_READ });
      if (!res.ok) throw new Error('JSONBin Fehler: ' + res.status);
      const data = await res.json();
      cache = (data && data.standorte) ? data : defaultData();
      saveLocal(); // lokale Kopie aktualisieren
      return cache;
    } catch (e) {
      console.warn('JSONBin nicht erreichbar:', e);
      // Nur als letzter Ausweg localStorage nutzen
      const local = loadLocal();
      if (local && local.standorte && local.standorte.length > 0) {
        console.warn('Nutze lokale Kopie als Fallback');
        cache = local;
      } else {
        cache = defaultData();
      }
      return cache;
    }
  }

  async function save() {
    if (!cache) return;
    saveLocal(); // immer lokal speichern
    // JSONBin speichern — PUT ersetzt den gesamten Bin-Inhalt
    try {
      const res = await fetch(BASE_URL, {
        method: 'PUT',
        headers: HEADERS_WRITE,
        body: JSON.stringify(cache),
      });
      if (!res.ok) throw new Error('Speicherfehler: ' + res.status);
    } catch (e) {
      console.warn('JSONBin-Speicher fehlgeschlagen:', e);
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
