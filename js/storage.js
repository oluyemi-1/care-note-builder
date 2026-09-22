/* Structured history on this device (IndexedDB). Nothing here ever leaves
   the browser. Clearing the browser's site data deletes it, so staff are told
   that plainly and can export a backup. */
(function (G) {
"use strict";

const DB = "gsn-history", STORE = "observations";
let dbp = null;

function open(){
  if(dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if(!globalThis.indexedDB){ reject(new Error("This browser cannot keep history.")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const os = req.result.createObjectStore(STORE, { keyPath: "id" });
      os.createIndex("person", "person");
      os.createIndex("date", "date");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}

/* one transaction, as a promise */
function tx(mode, fn){
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const history = {
  put: rec => tx("readwrite", os => os.put(rec)),
  putAll: recs => tx("readwrite", os => { recs.forEach(r => os.put(r)); }),
  byPerson: person => tx("readonly", os => os.index("person").getAll(person)),
  all: () => tx("readonly", os => os.getAll()),
  remove: id => tx("readwrite", os => os.delete(id)),
  count: () => tx("readonly", os => os.count()),
  clear: () => tx("readwrite", os => os.clear()),
  deletePerson: person => tx("readwrite", os => {
    const req = os.index("person").openCursor(IDBKeyRange.only(person));
    req.onsuccess = () => { const c = req.result; if(c){ c.delete(); c.continue(); } };
  })
};

/* ask the browser not to clear this site's storage under pressure; it may say no */
function persist(){
  return navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(() => false) : Promise.resolve(false);
}

G.storage = { history, persist, open };
})(globalThis.GSN = globalThis.GSN || {});
