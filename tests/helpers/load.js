/* Load the engine scripts the same way the page does - in order, each one
   adding itself to the GSN global - so tests exercise the shipped files. */
const path = require("path");

const ENGINE = ["core", "data"];

for (const f of ENGINE) require(path.join(__dirname, "..", "..", "js", f + ".js"));

module.exports = globalThis.GSN;
