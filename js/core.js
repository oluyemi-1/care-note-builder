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

function durText(a, b){
  const d = toMins(b) - toMins(a);
  if(d <= 0) return "";
  const h = Math.floor(d / 60), m = d % 60;
  const words = ["","one hour","two hours","three hours","four hours","five hours","six hours"];
  const H = words[h] || (h + " hours");
  if(h && m) return H + " and " + m + " minutes";
  if(h) return H;
  return m + " minutes";
}

G.core = { PRON, cap, hashStr, toMins, durText };
})(globalThis.GSN = globalThis.GSN || {});
