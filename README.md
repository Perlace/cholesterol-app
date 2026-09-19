# Bon pour moi ? Aliments et cholestérol

Application web légère, sans dépendance, qui répond à une seule question : **cet aliment est-il bon pour moi quand j'ai du cholestérol ?**

- **3 186 aliments** de la table Ciqual 2020 (ANSES), embarqués : ça marche **hors ligne**.
- **Produits de marque** via Open Food Facts : recherche par nom ou **scan du code-barres** (connexion nécessaire).
- Un **verdict** clair par aliment : Bon, Avec modération, À limiter, avec les raisons.
- Composition détaillée pour la portion de votre choix (10 à 300 g).
- Favoris, partage, conseils généraux.
- S'installe comme une application sur le téléphone (PWA), thème clair et sombre.

## Utiliser

**Sur ordinateur** : double-cliquez sur `index.html`. C'est tout.

**Sur téléphone** : il faut que les fichiers soient servis par un site (le mode hors ligne et le scanner de code-barres exigent `https`). Deux options simples :

1. **GitHub Pages** : dans le dépôt, Settings, Pages, Source « Deploy from a branch », branche `main`, dossier `/ (root)`. L'adresse sera `https://VOTRE-COMPTE.github.io/cholesterol-app/`. Sur un dépôt privé, GitHub Pages demande un abonnement GitHub Pro ; sinon rendez le dépôt public ou utilisez l'option 2.
2. **N'importe quel hébergement** (cPanel, Netlify, un dossier de votre site) : copiez tous les fichiers sauf `outils/`.

Ensuite, sur le téléphone, ouvrez l'adresse et « Ajouter à l'écran d'accueil ».

**Pour tester en local** : `python3 -m http.server 8077` dans le dossier, puis http://127.0.0.1:8077/

## Comment est calculé le verdict

Tout est dans `evaluation.js`, pour 100 g d'aliment :

| Critère | Effet |
|---|---|
| Acides gras saturés | > 5 g : +3 · > 1,5 g : +1 (sauf huiles et oléagineux surtout insaturés) |
| Graisses surtout insaturées | −1 ou −2 selon le rapport insaturés / saturés |
| Très gras (≥ 20 g de lipides, hors huiles et oléagineux) | +1 |
| Cholestérol | > 200 mg : +2 · > 90 mg : +1 |
| Fibres | ≥ 6 g : −2 · ≥ 3 g : −1 |
| Sucres | > 50 g : +3 · > 22,5 g : +2 · > 12,5 g : +1 (seuils plus bas pour les boissons) |
| Sel | > 1,5 g : +1 |
| Alcool | > 8 g : +2 · > 0,5 g : +1 |
| Friture, panure | au mieux « avec modération » |

**Bon** : 0 point ou moins. **Avec modération** : 1 ou 2. **À limiter** : 3 et plus.

Les seuils reprennent les repères usuels (étiquetage « feux tricolores », recommandations de l'ANSES et de la Fédération française de cardiologie). Ce sont des repères, pas un avis médical.

## Mettre à jour les données

```bash
cd outils
npm install
node construire-donnees.js   # télécharge la table Ciqual si besoin et régénère data/aliments.js
node icones.js               # régénère les icônes PNG
```

Après toute modification de `style.css` ou `app.js`, changez le `?v=` dans `index.html` et `sw.js`, et la constante `VERSION` de `sw.js`, sinon les téléphones gardent l'ancienne version en cache.

## Fichiers

```
index.html           la page
style.css            le style
app.js               recherche, fiches, favoris, produits, scanner
evaluation.js        la règle du verdict (testable en node)
data/aliments.js     la base Ciqual convertie (générée)
sw.js                cache hors ligne
manifest.webmanifest installation sur téléphone
icones/              icônes
outils/              scripts de génération (pas nécessaires pour utiliser l'app)
```

## Sources et licences

- Table de composition nutritionnelle **Ciqual 2020**, ANSES, licence ouverte Etalab 2.0.
- **Open Food Facts**, base collaborative, licence ODbL.
- Le code de l'application est libre d'usage.

Cette application ne remplace ni un médecin ni un diététicien.
