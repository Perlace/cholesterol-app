/* Bon pour moi ? Aliments et cholestérol. Sans dépendance, fonctionne hors ligne. */
(function () {
  "use strict";
  const { evaluer, nombre, fmt, LIBELLES } = window.Evaluation;
  const D = window.CIQUAL;
  const $ = id => document.getElementById(id);

  // ---------- Données et index de recherche ----------
  const normaliser = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/[^a-z0-9]+/g, " ").trim();
  for (const a of D.aliments) {
    a.groupe = D.groupes[a.g];
    a.norm = normaliser(a.n);
    a.eval = evaluer(a, a.groupe, a.n);
  }

  const SUGGESTIONS = ["Beurre", "Œuf", "Fromage", "Saumon", "Poulet", "Charcuterie", "Chocolat", "Huile d'olive", "Amande", "Lentille", "Pain complet", "Crevette", "Fromage blanc", "Avocat", "Yaourt"];
  const NUTRIS = [
    { cle: "kcal", nom: "Énergie", unite: "kcal", max: 600 },
    { cle: "lip", nom: "Lipides (graisses totales)", unite: "g", max: 40, seuils: [3, 17.5] },
    { cle: "ags", nom: "dont acides gras saturés", unite: "g", max: 20, seuils: [1.5, 5], important: true },
    { cle: "agm", nom: "dont mono-insaturés", unite: "g", max: 20, bon: true },
    { cle: "agp", nom: "dont poly-insaturés", unite: "g", max: 20, bon: true },
    { cle: "chol", nom: "Cholestérol", unite: "mg", max: 300, seuils: [90, 200], important: true },
    { cle: "fib", nom: "Fibres", unite: "g", max: 10, bon: true },
    { cle: "suc", nom: "Sucres", unite: "g", max: 40, seuils: [12.5, 22.5] },
    { cle: "glu", nom: "Glucides", unite: "g", max: 80 },
    { cle: "prot", nom: "Protéines", unite: "g", max: 30 },
    { cle: "sel", nom: "Sel", unite: "g", max: 3, seuils: [0.3, 1.5] },
    { cle: "alc", nom: "Alcool", unite: "g", max: 15, seuils: [0.5, 8] },
  ];

  // ---------- État ----------
  let filtreVerdict = "", filtreGroupe = "", requete = "", resultats = [], affiches = 0;
  const PAGE = 60;
  const favoris = charger("favoris", []);        // [{type:"ciqual", code}, {type:"off", produit}]
  function charger(cle, defaut) { try { return JSON.parse(localStorage.getItem("bpm." + cle)) ?? defaut; } catch { return defaut; } }
  function sauver(cle, v) { try { localStorage.setItem("bpm." + cle, JSON.stringify(v)); } catch {} }

  // ---------- Recherche ----------
  function chercher() {
    const mots = normaliser(requete).split(" ").filter(Boolean);
    const res = [];
    for (const a of D.aliments) {
      if (filtreVerdict && a.eval.verdict !== filtreVerdict) continue;
      if (filtreGroupe && a.groupe !== filtreGroupe) continue;
      let score = 0;
      if (mots.length) {
        let ok = true;
        for (const m of mots) {
          const i = a.norm.indexOf(m);
          if (i < 0) { ok = false; break; }
          if (i === 0) score += 3; else if (a.norm[i - 1] === " ") score += 2; else score += 1;
        }
        if (!ok) continue;
        if (mots.length === 1 && a.norm === mots[0]) score += 5;
        score -= a.n.length / 200;
        if (a.norm.includes("aliment moyen")) score += 1; // l'entrée générique d'abord
      }
      res.push({ a, score });
    }
    if (mots.length) res.sort((x, y) => y.score - x.score || x.a.n.localeCompare(y.a.n, "fr"));
    resultats = (mots.length || filtreVerdict || filtreGroupe) ? res.map(r => r.a) : [];
    affiches = 0;
    $("liste").innerHTML = "";
    afficherPage();
  }

  function afficherPage() {
    const tranche = resultats.slice(affiches, affiches + PAGE);
    const frag = document.createDocumentFragment();
    for (const a of tranche) frag.appendChild(carteAliment(a));
    $("liste").appendChild(frag);
    affiches += tranche.length;
    const filtreActif = requete || filtreVerdict || filtreGroupe;
    $("vide").classList.toggle("cache", !!filtreActif);
    $("plus").classList.toggle("cache", affiches >= resultats.length);
    $("compte").textContent = filtreActif ? (resultats.length ? `${resultats.length.toLocaleString("fr-FR")} aliment${resultats.length > 1 ? "s" : ""}` : "Aucun aliment ne correspond. Essayez un mot plus court.") : "";
    if (filtreActif && !resultats.length) { $("vide").classList.remove("cache"); $("suggestions").classList.add("cache"); }
    else $("suggestions").classList.remove("cache");
  }

  function carteAliment(a, ouvrir) {
    const li = document.createElement("li");
    const v = a.eval.verdict;
    const b = document.createElement("button");
    b.className = "carte " + v;
    b.innerHTML = `<span class="barre"></span>
      <span><span class="nom">${echapper(a.n)}</span><span class="sous">${echapper(a.s || a.groupe)}</span>
      <span class="chiffres"><span>Saturés <b>${val(a.ags, "g")}</b></span><span>Cholestérol <b>${val(a.chol, "mg")}</b></span>${nombre(a.fib) >= 3 ? `<span>Fibres <b>${val(a.fib, "g")}</b></span>` : ""}</span></span>
      <span class="badge ${v}">${LIBELLES[v].court}</span>`;
    b.addEventListener("click", ouvrir || (() => ouvrirFiche(a)));
    li.appendChild(b);
    return li;
  }

  function val(x, unite) {
    if (x === null || x === undefined) return "?";
    if (x === "tr") return "traces";
    if (typeof x === "string" && x[0] === "<") return "< " + fmt(parseFloat(x.slice(1))) + " " + unite;
    return fmt(x) + " " + unite;
  }
  const echapper = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Fiche ----------
  let ficheCourante = null;
  function ouvrirFiche(a) {
    ficheCourante = a;
    const v = a.eval.verdict, L = LIBELLES[v];
    const estFav = indexFavori(a) >= 0;
    const corps = $("fiche-corps");
    corps.innerHTML = `<div class="poignee"></div>
      <div class="fiche-tete"><div><h2>${echapper(a.n)}</h2>
        ${a.marque ? `<div class="marque">${echapper(a.marque)}</div>` : ""}
        <div class="groupe">${echapper(a.s ? a.groupe + " · " + a.s : a.groupe)}</div></div>
        <button class="fermer" id="fermer" aria-label="Fermer">×</button></div>
      <div class="verdict ${v}"><div class="pastille">${v === "bon" ? "✓" : v === "modere" ? "~" : "!"}</div><div><strong>${L.titre}</strong><span>${L.conseil}</span></div></div>
      <ul class="raisons">${a.eval.raisons.map(r => `<li class="${r.sens}">${echapper(r.texte)}</li>`).join("")}</ul>
      <h3 class="section">Composition <span class="note">pour <output id="portion-val">100 g</output></span></h3>
      <div class="portion"><span>10 g</span><input type="range" id="portion" min="10" max="300" step="5" value="100" aria-label="Portion en grammes"><span>300 g</span></div>
      <div class="nutris" id="nutris"></div>
      <div class="actions"><button id="fav" class="${estFav ? "actif" : ""}">${estFav ? "★ Dans vos favoris" : "☆ Garder en favori"}</button><button id="partager">Partager</button></div>
      <p class="source">${a.source || "Source : table Ciqual 2020, ANSES. Valeurs moyennes pour 100 g, telles que renseignées dans la table."}</p>`;
    afficherNutris(a, 100);
    corps.querySelector("#portion").addEventListener("input", e => { const g = +e.target.value; corps.querySelector("#portion-val").textContent = g + " g"; afficherNutris(a, g); });
    corps.querySelector("#fermer").addEventListener("click", () => $("fiche").close());
    corps.querySelector("#fav").addEventListener("click", () => { basculerFavori(a); ouvrirFiche(a); });
    corps.querySelector("#partager").addEventListener("click", () => partager(a));
    const d = $("fiche");
    if (!d.open) d.showModal();
    corps.scrollTop = 0;
  }

  function afficherNutris(a, grammes) {
    const k = grammes / 100;
    $("nutris").innerHTML = NUTRIS.map(n => {
      const brut = a[n.cle];
      if (brut === null || brut === undefined) return "";
      const x = nombre(brut);
      const xk = x * k;
      let classe = "";
      if (n.seuils) classe = x <= n.seuils[0] ? "bon" : x <= n.seuils[1] ? "moyen" : "mauvais";
      else if (n.bon) classe = "bon";
      const pct = Math.min(100, Math.round(xk / (n.max * Math.max(k, 1)) * 100));
      const texte = typeof brut === "string" ? (brut === "tr" ? "traces" : "< " + fmt(parseFloat(brut.slice(1)) * k) + " " + n.unite) : fmt(xk) + " " + n.unite;
      return `<div class="nutri"><span${n.important ? ' style="font-weight:600"' : ""}>${n.nom}</span><span class="val">${texte}</span><div class="jauge"><i class="${classe}" style="width:${pct}%"></i></div></div>`;
    }).join("");
  }

  function partager(a) {
    const texte = `${a.n} : ${LIBELLES[a.eval.verdict].titre.toLowerCase()} pour le cholestérol (saturés ${val(a.ags, "g")}, cholestérol ${val(a.chol, "mg")} pour 100 g).`;
    if (navigator.share) navigator.share({ title: a.n, text: texte }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(texte).then(() => { $("partager").textContent = "Copié !"; });
  }

  $("fiche").addEventListener("click", e => { if (e.target === $("fiche")) $("fiche").close(); });

  // ---------- Favoris ----------
  function cleFavori(a) { return a.off ? "off:" + a.off.code : "ciqual:" + a.c; }
  function indexFavori(a) { const k = cleFavori(a); return favoris.findIndex(f => f.cle === k); }
  function basculerFavori(a) {
    const i = indexFavori(a);
    if (i >= 0) favoris.splice(i, 1);
    else favoris.unshift({ cle: cleFavori(a), code: a.off ? null : a.c, produit: a.off || null });
    sauver("favoris", favoris);
    afficherFavoris();
  }
  function afficherFavoris() {
    const ul = $("liste-favoris"); ul.innerHTML = "";
    const objets = favoris.map(f => f.produit ? alimentDepuisOFF(f.produit) : D.aliments.find(a => a.c === f.code)).filter(Boolean);
    for (const a of objets) ul.appendChild(carteAliment(a));
    $("vide-favoris").classList.toggle("cache", objets.length > 0);
    $("compte-favoris").textContent = objets.length ? `${objets.length} favori${objets.length > 1 ? "s" : ""}` : "";
  }

  // ---------- Produits Open Food Facts ----------
  const OFF = "https://world.openfoodfacts.org";
  const CHAMPS = "code,product_name,product_name_fr,brands,image_small_url,quantity,nutriments";
  function alimentDepuisOFF(p) {
    const n = p.nutriments || {};
    const g = k => (typeof n[k] === "number" ? n[k] : (n[k] !== undefined && n[k] !== "" ? parseFloat(n[k]) : null));
    const a = {
      off: p, c: null, n: p.product_name_fr || p.product_name || "Produit sans nom", marque: [p.brands, p.quantity].filter(Boolean).join(" · "),
      groupe: "Produit du commerce", s: [p.brands, p.quantity].filter(Boolean).join(" · ") || null,
      kcal: g("energy-kcal_100g"), prot: g("proteins_100g"), glu: g("carbohydrates_100g"), suc: g("sugars_100g"),
      fib: g("fiber_100g"), lip: g("fat_100g"), ags: g("saturated-fat_100g"), agm: g("monounsaturated-fat_100g"),
      agp: g("polyunsaturated-fat_100g"), sel: g("salt_100g"),
      chol: g("cholesterol_100g") !== null ? g("cholesterol_100g") * 1000 : null,
      alc: g("alcohol_100g") !== null ? g("alcohol_100g") * 0.8 : null,
      source: "Source : Open Food Facts (données déclarées par les contributeurs, pour 100 g ou 100 ml). Le cholestérol est rarement renseigné sur les emballages.",
    };
    for (const k of Object.keys(a)) if (Number.isNaN(a[k])) a[k] = null;
    a.eval = evaluer(a, "", a.n);
    return a;
  }

  async function chercherProduit(texte) {
    texte = texte.trim(); if (!texte) return;
    const etat = $("etat-produit"), ul = $("liste-produits");
    ul.innerHTML = ""; etat.textContent = "Recherche…";
    try {
      let produits;
      if (/^\d{8,14}$/.test(texte)) {
        const r = await fetch(`${OFF}/api/v2/product/${texte}.json?fields=${CHAMPS}`);
        const j = await r.json();
        produits = j.status === 1 && j.product ? [j.product] : [];
      } else {
        const r = await fetch(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(texte)}&search_simple=1&action=process&json=1&page_size=30&fields=${CHAMPS}&lc=fr&cc=fr`);
        const j = await r.json();
        const vus = new Set();
        produits = (j.products || []).filter(p => {
          if (!p.nutriments || (p.nutriments["saturated-fat_100g"] === undefined && p.nutriments.fat_100g === undefined)) return false;
          const cle = [p.product_name_fr || p.product_name, p.brands, p.nutriments["saturated-fat_100g"]].join("|").toLowerCase();
          if (vus.has(cle)) return false; vus.add(cle); return true;
        });
      }
      if (!produits.length) { etat.textContent = "Aucun produit trouvé avec des valeurs nutritionnelles."; return; }
      etat.textContent = `${produits.length} produit${produits.length > 1 ? "s" : ""}`;
      for (const p of produits) {
        const a = alimentDepuisOFF(p);
        const li = carteAliment(a);
        if (p.image_small_url) {
          const b = li.firstChild; b.classList.add("produit");
          const img = document.createElement("img"); img.className = "produit-img"; img.src = p.image_small_url; img.alt = "";
          b.insertBefore(img, b.children[1]);
        }
        ul.appendChild(li);
      }
    } catch (e) {
      etat.textContent = "Impossible de joindre Open Food Facts. Vérifiez la connexion.";
    }
  }
  $("chercher-produit").addEventListener("click", () => chercherProduit($("q-produit").value));
  $("q-produit").addEventListener("keydown", e => { if (e.key === "Enter") chercherProduit(e.target.value); });

  // Scanner de code-barres (API BarcodeDetector, Chrome et Android surtout)
  let flux = null, minuteur = null;
  async function demarrerScan() {
    const etat = $("etat-produit");
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      etat.textContent = "Ce navigateur ne sait pas lire les codes-barres. Tapez les chiffres du code sous le code-barres.";
      $("q-produit").focus(); return;
    }
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch { etat.textContent = "Accès à la caméra refusé."; return; }
    const video = $("video"); video.srcObject = flux; video.classList.remove("cache"); await video.play();
    $("scanner").classList.add("cache"); $("stop-scan").classList.remove("cache");
    etat.textContent = "Visez le code-barres…";
    const detecteur = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    minuteur = setInterval(async () => {
      try {
        const codes = await detecteur.detect(video);
        if (codes.length) { const c = codes[0].rawValue; arreterScan(); $("q-produit").value = c; chercherProduit(c); }
      } catch {}
    }, 350);
  }
  function arreterScan() {
    clearInterval(minuteur); minuteur = null;
    if (flux) { flux.getTracks().forEach(t => t.stop()); flux = null; }
    $("video").classList.add("cache"); $("scanner").classList.remove("cache"); $("stop-scan").classList.add("cache");
  }
  $("scanner").addEventListener("click", demarrerScan);
  $("stop-scan").addEventListener("click", () => { arreterScan(); $("etat-produit").textContent = ""; });

  // ---------- Onglets ----------
  function montrerOnglet(nom) {
    for (const s of ["aliments", "produits", "favoris", "conseils"]) $("onglet-" + s).classList.toggle("cache", s !== nom);
    for (const b of $("nav").querySelectorAll("button")) if (b.dataset.onglet === nom) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    $("entete").classList.toggle("cache", nom !== "aliments");
    if (nom !== "produits") arreterScan();
    if (nom === "favoris") afficherFavoris();
    window.scrollTo(0, 0);
    if (location.hash !== "#" + nom) history.replaceState(null, "", nom === "aliments" ? location.pathname : "#" + nom);
  }
  $("nav").addEventListener("click", e => { const b = e.target.closest("button"); if (b) montrerOnglet(b.dataset.onglet); });

  // ---------- Conseils ----------
  const CONSEILS = [
    ["🫒", "Remplacez le beurre et la crème", "Par l'huile d'olive ou de colza pour cuisiner, et une margarine riche en insaturés sur le pain."],
    ["🐟", "Du poisson gras deux fois par semaine", "Sardine, maquereau, saumon, hareng : leurs oméga-3 sont favorables au bon cholestérol."],
    ["🥣", "Des fibres à chaque repas", "Avoine, légumineuses, pain complet, fruits et légumes. Les fibres solubles piègent une partie du cholestérol."],
    ["🥜", "Une poignée d'oléagineux par jour", "Noix, amandes, noisettes non salées : gras, mais du bon gras. Environ 30 g suffisent."],
    ["🧀", "Fromage et charcuterie en petites quantités", "Ce sont les premières sources de graisses saturées en France. Préférez les fromages frais et les viandes maigres."],
    ["🥐", "Méfiez-vous des viennoiseries et biscuits industriels", "Beaucoup de saturés (huile de palme, beurre) et de sucres, souvent sans qu'on s'en rende compte."],
    ["🍳", "Les œufs : jusqu'à 3 ou 4 par semaine", "Riches en cholestérol mais pauvres en saturés. C'est surtout ce qui les accompagne (beurre, lardons) qui compte."],
    ["🍷", "Alcool et sucres : les triglycérides", "Ils ne touchent pas directement le LDL, mais font grimper les triglycérides, l'autre chiffre du bilan."],
    ["🚶", "Bouger fait monter le bon cholestérol", "30 minutes de marche rapide par jour élèvent le HDL. Aucun aliment ne fait ça."],
  ];
  $("conseils").innerHTML = CONSEILS.map(([i, t, p]) => `<div class="conseil"><div class="ico">${i}</div><div><b>${t}</b><p>${p}</p></div></div>`).join("");

  // ---------- Branchements ----------
  const q = $("q");
  let attente = null;
  q.addEventListener("input", () => { requete = q.value; $("effacer").classList.toggle("cache", !requete); clearTimeout(attente); attente = setTimeout(chercher, 120); });
  q.addEventListener("keydown", e => { if (e.key === "Enter") { q.blur(); } });
  $("effacer").addEventListener("click", () => { q.value = ""; requete = ""; $("effacer").classList.add("cache"); chercher(); q.focus(); });
  $("plus").addEventListener("click", afficherPage);
  $("filtres").addEventListener("click", e => {
    const b = e.target.closest(".puce"); if (!b) return;
    filtreVerdict = b.dataset.verdict;
    for (const p of $("filtres").querySelectorAll(".puce")) p.setAttribute("aria-pressed", String(p === b));
    chercher();
  });
  const sel = $("groupe");
  for (const g of [...D.groupes].sort((a, b) => a.localeCompare(b, "fr"))) { const o = document.createElement("option"); o.value = g; o.textContent = g[0].toUpperCase() + g.slice(1); sel.appendChild(o); }
  sel.addEventListener("change", () => { filtreGroupe = sel.value; chercher(); });
  $("suggestions").innerHTML = SUGGESTIONS.map(s => `<button class="puce">${s}</button>`).join("");
  $("suggestions").addEventListener("click", e => { const b = e.target.closest(".puce"); if (b) { q.value = b.textContent; q.dispatchEvent(new Event("input")); } });

  montrerOnglet(["produits", "favoris", "conseils"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "aliments");
  chercher();

  // Hors ligne : uniquement quand on est servi en http(s), pas en ouvrant le fichier directement
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
