// Règle de calcul du verdict cholestérol, pour 100 g d'aliment.
// Repères issus des recommandations courantes (ANSES, Fédération française de
// cardiologie, étiquetage nutritionnel « feux tricolores ») :
//   - les graisses saturées sont le facteur principal du cholestérol LDL,
//   - le cholestérol alimentaire compte, mais moins que les saturés,
//   - les fibres et les graisses insaturées (huiles végétales, poissons gras,
//     oléagineux) sont favorables,
//   - les sucres et l'alcool pèsent sur les triglycérides.
// Ce n'est pas un avis médical : le verdict est un repère, pas une prescription.
(function (racine) {
  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (v === "tr") return 0;
    if (typeof v === "string" && v[0] === "<") return parseFloat(v.slice(1)); // borne haute, prudente
    return null;
  }

  // n : { lip, ags, agm, agp, chol, fib, suc, sel, alc } ; groupe : nom du groupe Ciqual (facultatif)
  function evaluer(n, groupe, nom) {
    const lip = nombre(n.lip), ags = nombre(n.ags), agm = nombre(n.agm) || 0, agp = nombre(n.agp) || 0;
    const chol = nombre(n.chol), fib = nombre(n.fib), suc = nombre(n.suc), sel = nombre(n.sel), alc = nombre(n.alc);
    const boisson = /boisson/i.test(groupe || "");
    const oleagineux = /oléagineux/i.test(groupe || "") || /huile/i.test(nom || "");
    const frit = /\bfrit|\bpané|beignet|nuggets|\bchips\b|tempura/i.test(nom || "");
    const raisons = [];
    let points = 0;
    const bon = t => raisons.push({ sens: "bon", texte: t });
    const moyen = t => raisons.push({ sens: "moyen", texte: t });
    const mauvais = t => raisons.push({ sens: "mauvais", texte: t });

    const insat = agm + agp;
    const ratio = ags !== null && ags > 0 ? insat / ags : (insat > 0 ? 99 : 0);
    const bonnesGraisses = lip !== null && lip >= 3 && ratio >= 2;

    // 1. Graisses saturées
    if (ags === null) {
      if (lip !== null && lip > 10) { points += 1; moyen(`Aliment gras (${fmt(lip)} g) dont les saturées ne sont pas renseignées`); }
      else moyen("Graisses saturées non renseignées");
    }
    else if (ags > 5) {
      if (lip >= 20 && ratio >= 4) { bon(`Riche en graisses, mais surtout insaturées (${fmt(insat)} g contre ${fmt(ags)} g de saturées)`); }
      else { points += 3; mauvais(`Très riche en graisses saturées : ${fmt(ags)} g`); }
    }
    else if (ags > 1.5) { points += 1; moyen(`Graisses saturées modérées : ${fmt(ags)} g`); }
    else bon(`Pauvre en graisses saturées : ${fmt(ags)} g`);

    // 2. Bonnes graisses (bonus)
    if (bonnesGraisses && ags !== null && ags <= 5) {
      points -= ratio >= 3 ? 2 : 1;
      bon(`Surtout des graisses insaturées : ${fmt(insat)} g (favorables au bon cholestérol)`);
    }

    // 2 bis. Très gras et transformé (sauces, charcuteries, fritures), hors huiles et oléagineux
    if (lip !== null && lip >= 20 && !oleagineux) { points += 1; moyen(`Très gras : ${fmt(lip)} g de lipides, à doser`); }

    // 3. Cholestérol alimentaire
    if (chol === null) { /* rien à dire */ }
    else if (chol > 200) { points += 2; mauvais(`Très riche en cholestérol : ${fmt(chol)} mg`); }
    else if (chol > 90) { points += 1; moyen(`Contient du cholestérol : ${fmt(chol)} mg`); }
    else if (chol > 20) bon(`Peu de cholestérol : ${fmt(chol)} mg`);
    else bon("Quasiment sans cholestérol");

    // 4. Fibres (bonus)
    if (fib !== null && fib >= 6) { points -= 2; bon(`Très riche en fibres : ${fmt(fib)} g`); }
    else if (fib !== null && fib >= 3) { points -= 1; bon(`Source de fibres : ${fmt(fib)} g`); }

    // 5. Sucres
    if (suc !== null) {
      const [haut, moyenS] = boisson ? [8, 4] : [22.5, 12.5];
      if (suc > 50) { points += 3; mauvais(`Extrêmement sucré : ${fmt(suc)} g`); }
      else if (suc > haut) { points += 2; mauvais(`Très sucré : ${fmt(suc)} g`); }
      else if (suc > moyenS) { points += 1; moyen(`Assez sucré : ${fmt(suc)} g`); }
    }

    // 6. Sel
    if (sel !== null && sel > 1.5) { points += 1; moyen(`Salé : ${fmt(sel)} g de sel`); }

    // 7. Alcool
    if (alc !== null && alc > 8) { points += 2; mauvais(`Alcool : ${fmt(alc)} g`); }
    else if (alc !== null && alc > 0.5) { points += 1; moyen(`Contient de l'alcool : ${fmt(alc)} g`); }

    // 8. Friture : au mieux « avec modération »
    if (frit) { points = Math.max(points, 1); moyen("Aliment frit ou pané"); }

    let verdict;
    if (points <= 0) verdict = "bon";
    else if (points <= 2) verdict = "modere";
    else verdict = "limiter";

    // Tri : les points forts d'abord quand c'est bon, les points faibles d'abord sinon
    const ordre = verdict === "bon" ? { bon: 0, moyen: 1, mauvais: 2 } : { mauvais: 0, moyen: 1, bon: 2 };
    raisons.sort((a, b) => ordre[a.sens] - ordre[b.sens]);

    return { verdict, points, raisons };
  }

  function fmt(x) {
    if (x === null || x === undefined) return "?";
    return (Math.round(x * 10) / 10).toLocaleString("fr-FR");
  }

  const LIBELLES = {
    bon: { titre: "Bon pour vous", court: "Bon", conseil: "À consommer sans crainte dans le cadre d'une alimentation variée." },
    modere: { titre: "Avec modération", court: "Modéré", conseil: "Pas interdit, mais pas tous les jours, et en quantité raisonnable." },
    limiter: { titre: "À limiter", court: "À limiter", conseil: "À réserver aux occasions. Cherchez une alternative dans la liste." },
  };

  racine.Evaluation = { evaluer, nombre, fmt, LIBELLES };
})(typeof module !== "undefined" ? module.exports : window);
