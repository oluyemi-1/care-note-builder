/* Shared helpers, loaded first. Every script hangs what it exports off one
   global, GSN. They are classic scripts rather than ES modules on purpose:
   browsers refuse to load modules from a double-clicked file://, and opening
   index.html straight from disk has to keep working. */
(function (G) {
"use strict";

const PRON = {
  he:   {s:"he",   o:"him",  p:"his",   r:"himself",    vbe:"was",  vhave:"has"},
  she:  {s:"she",  o:"her",  p:"her",   r:"herself",    vbe:"was",  vhave:"has"},
  they: {s:"they", o:"them", p:"their", r:"themselves", vbe:"were", vhave:"have"}
};

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function hashStr(str){
  let h = 2166136261;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const toMins = t => { const [h,m] = (t || "0:0").split(":").map(Number); return (h||0)*60 + (m||0); };

/* {token} substitution, twice over so a value can itself carry a pronoun
   token (e.g. an option of "{p} teeth"). Unknown tokens are left visible
   rather than silently dropped. */
function fill(str, map){
  if(!str) return "";
  const once = t => t.replace(/\{(\w+)\}/g, (m, k) => (k in map) ? map[k] : m);
  return once(once(str));
}

/* the tokens that refer to the person: {N} initials, {s}/{S} he, {o} him,
   {p}/{P} his, {r} himself, and the verbs that change with they/them */
function personVars(initials, pronoun){
  const pr = PRON[pronoun] || PRON.they;
  return { N: initials || "[Initials]", s: pr.s, S: cap(pr.s), o: pr.o, p: pr.p, P: cap(pr.p), r: pr.r,
           vbe: pr.vbe, vhave: pr.vhave };
}

/* labels in the data carry HTML entities; text built for reading must not */
const plain = s => String(s == null ? "" : s).replace(/&mdash;/g, "\u2014").replace(/&ndash;/g, "\u2013")
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/* anything that did not come from our own source goes through this before innerHTML */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

const present = v => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== "";

G.core = { PRON, cap, hashStr, toMins, fill, personVars, plain, esc, present };
})(globalThis.GSN = globalThis.GSN || {});
