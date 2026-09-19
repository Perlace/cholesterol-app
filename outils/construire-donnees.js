// Fabrique data/aliments.js à partir de la table Ciqual (ANSES).
// Usage : cd outils && npm install && node construire-donnees.js
// Le fichier .xls est téléchargé automatiquement s'il manque.
const fs = require("fs");
const path = require("path");
const https = require("https");
const X = require("xlsx");

const URL_CIQUAL = "https://ciqual.anses.fr/cms/sites/default/files/inline-files/Table%20Ciqual%202020_FR_2020%2007%2007.xls";
const XLS = path.join(__dirname, "ciqual.xls");
const SORTIE = path.join(__dirname, "..", "data", "aliments.js");

function telecharger(url, dest) {
  return new Promise((ok, ko) => {
    const f = fs.createWriteStream(dest);
    https.get(url, r => {
      if (r.statusCode >= 300 && r.headers.location) return telecharger(r.headers.location, dest).then(ok, ko);
      r.pipe(f); f.on("finish", () => f.close(ok));
    }).on("error", ko);
  });
}

// "12,3" -> 12.3 ; "< 0,5" -> "<0.5" ; "traces" -> "tr" ; "-" -> null
function valeur(v) {
  if (v === undefined || v === null || v === "" || v === "-") return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  const s = String(v).trim().replace(",", ".");
  if (s === "traces") return "tr";
  if (s.startsWith("<")) return "<" + parseFloat(s.slice(1));
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function colonne(entete, motif) {
  const i = entete.findIndex(h => motif.test(String(h)));
  if (i < 0) throw new Error("Colonne introuvable : " + motif);
  return i;
}

(async () => {
  if (!fs.existsSync(XLS)) { console.log("Téléchargement de la table Ciqual…"); await telecharger(URL_CIQUAL, XLS); }
  const wb = X.readFile(XLS);
  const lignes = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  const H = lignes[0];
  const c = {
    grp: colonne(H, /^alim_grp_nom_fr$/), ssgrp: colonne(H, /^alim_ssgrp_nom_fr$/),
    code: colonne(H, /^alim_code$/), nom: colonne(H, /^alim_nom_fr$/),
    kcal: colonne(H, /^Energie, Règlement UE.*kcal/), prot: colonne(H, /^Protéines, N x 6\.25/),
    glu: colonne(H, /^Glucides/), suc: colonne(H, /^Sucres/), fib: colonne(H, /^Fibres/),
    lip: colonne(H, /^Lipides/), ags: colonne(H, /^AG saturés/), agm: colonne(H, /^AG monoinsaturés/),
    agp: colonne(H, /^AG polyinsaturés/), chol: colonne(H, /^Cholestérol/), sel: colonne(H, /^Sel/),
    alc: colonne(H, /^Alcool/),
  };
  const groupes = [];
  const idxGroupe = n => { n = n || "aliments moyens"; let i = groupes.indexOf(n); if (i < 0) { i = groupes.length; groupes.push(n); } return i; };
  const aliments = [];
  for (const r of lignes.slice(1)) {
    if (!r[c.nom]) continue;
    aliments.push({
      c: r[c.code], n: String(r[c.nom]).trim(), g: idxGroupe(r[c.grp]),
      s: r[c.ssgrp] && r[c.ssgrp] !== "-" ? r[c.ssgrp] : null,
      kcal: valeur(r[c.kcal]), prot: valeur(r[c.prot]), glu: valeur(r[c.glu]), suc: valeur(r[c.suc]),
      fib: valeur(r[c.fib]), lip: valeur(r[c.lip]), ags: valeur(r[c.ags]), agm: valeur(r[c.agm]),
      agp: valeur(r[c.agp]), chol: valeur(r[c.chol]), sel: valeur(r[c.sel]), alc: valeur(r[c.alc]),
    });
  }
  aliments.sort((a, b) => a.n.localeCompare(b.n, "fr"));
  const sortie = "// Généré par outils/construire-donnees.js depuis la table Ciqual 2020 (ANSES), licence ouverte Etalab.\n" +
    "// Valeurs pour 100 g. \"<0.5\" = inférieur à 0,5 ; \"tr\" = traces ; null = non renseigné.\n" +
    "window.CIQUAL = " + JSON.stringify({ version: "Ciqual 2020", groupes, aliments }) + ";\n";
  fs.writeFileSync(SORTIE, sortie);
  console.log(`${aliments.length} aliments, ${groupes.length} groupes -> ${path.relative(process.cwd(), SORTIE)} (${(sortie.length / 1024).toFixed(0)} Ko)`);
})().catch(e => { console.error(e); process.exit(1); });
