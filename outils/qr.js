// Fabrique une page avec le QR code qui mène au téléchargement de l'APK.
// Usage : node qr.js https://github.com/COMPTE/cholesterol-app   (npm install qrcode au préalable)
const fs = require("fs"), path = require("path"), QR = require("qrcode");
const depot = (process.argv[2] || "").replace(/\/$/, "");
if (!depot) { console.error("Donnez l'adresse du dépôt GitHub."); process.exit(1); }
const apk = depot + "/releases/latest/download/bon-pour-moi.apk";
QR.toString(apk, { type: "svg", margin: 1, width: 320, errorCorrectionLevel: "M" }).then(svg => {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon pour moi : télécharger l'APK</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f5f1;color:#1d1d1b;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;border-radius:20px;padding:32px 36px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:460px}
h1{font-size:1.3rem;margin:0 0 4px}p{color:#5d5c57;margin:6px 0}svg{width:320px;height:320px;margin:16px auto;display:block}
code{font-size:.8rem;word-break:break-all;background:#f0efe9;padding:6px 8px;border-radius:8px;display:block;margin-top:10px}
ol{text-align:left;font-size:.9rem;color:#5d5c57;padding-left:20px}</style></head><body><main>
<h1>Bon pour moi</h1><p>Scannez avec l'appareil photo du téléphone</p>${svg}
<a href="${apk}"><code>${apk}</code></a>
<ol><li>Le dépôt est privé : connectez-vous à GitHub sur le téléphone si on vous le demande.</li>
<li>Ouvrez le fichier téléchargé, puis autorisez l'installation depuis ce navigateur.</li>
<li>Pour mettre à jour : rescannez, la nouvelle version s'installe par-dessus.</li></ol></main></body></html>`;
  const sortie = path.join(__dirname, "..", "qr.html");
  fs.writeFileSync(sortie, html);
  console.log(sortie);
});
