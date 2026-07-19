const fs = require('fs');

let raw = fs.readFileSync('apps/web/src/data/thesis.ts', 'utf8');
let jsonStr = raw.replace('export const thesisData = ', '').replace(/;\n$/, '');

// using eval to parse the JS object literal safely since it's just our own data
let thesisData;
try {
  thesisData = eval('(' + jsonStr + ')');
} catch(e) {
  console.log("Error parsing JSON:", e);
  process.exit(1);
}

let sec9 = thesisData.sections.find(s => s.id === '9-the-cost-of-missing-context' || s.title.includes('9.'));
if (sec9) {
  sec9.content.push("");
  sec9.content.push("{{TABLE_1}}");
}

let sec13 = thesisData.sections.find(s => s.id === '13-the-contextual-architecture' || s.title.includes('13.'));
if (sec13) {
  sec13.content.push("");
  sec13.content.push("### 13.10 Orgni Model Architecture (O1)");
  sec13.content.push("");
  sec13.content.push("To process continuous operational signals and maintain a living contextual state, Orgni (O1) employs a specialised decoder-only transformer architecture.");
  sec13.content.push("");
  sec13.content.push("{{FIGURE_2}}");
  sec13.content.push("");
  sec13.content.push("{{TABLE_2}}");
  sec13.content.push("");
  sec13.content.push("The model utilises Multi-Head Latent Attention (MLA) and an optional Mixture of Experts (MoE) layer to efficiently process up to 128K tokens of continuous organisational context.");
  sec13.content.push("");
  sec13.content.push("{{FORMULA_ATTENTION}}");
  sec13.content.push("");
  sec13.content.push("{{FORMULA_MOE}}");
  sec13.content.push("");
  sec13.content.push("The contextual compression layer packs continuous signals—from emails, documents, system events, and communications—into dense embeddings before positional encoding and multi-head attention processing.");
  sec13.content.push("");
  sec13.content.push("{{FIGURE_1}}");
}

let sec11 = thesisData.sections.find(s => s.id === '11-orgni-as-a-living-system' || s.title.includes('11.'));
if (sec11) {
  let idx = sec11.content.indexOf("### 11.4 Verify");
  if (idx !== -1) {
    sec11.content.splice(idx + 3, 0, "", "{{FORMULA_CONFIDENCE}}", "");
  }
}

let out = "export const thesisData = " + JSON.stringify(thesisData, null, 2) + ";\n";
fs.writeFileSync('apps/web/src/data/thesis.ts', out);
console.log("Injected successfully.");
