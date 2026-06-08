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
    try {
      const res = await fetch(BASE_URL + '/latest', { headers: HEADERS_READ });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      cache = (data && data.standorte) ? data : defaultData();
      return cache;
    } catch (e) {
      console.warn('JSONBin nicht erreichbar, nutze lokalen Speicher:', e);
      cache = loadLocal();
      return cache;
    }
  }

  async function save() {
    saveLocal();
    try {
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: HEADERS_WRITE,
        body: JSON.stringify(cache),
      });
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
