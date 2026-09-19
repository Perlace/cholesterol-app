package fr.bonpourmoi;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

/** Coquille minimale : une WebView qui sert l'application web embarquée dans les assets. */
public class MainActivity extends Activity {
    private static final String ORIGINE = "appassets.androidplatform.net";
    private static final int DEMANDE_CAMERA = 1;
    private WebView web;
    private PermissionRequest demandeEnAttente;

    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);

        final WebViewAssetLoader chargeur = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return chargeur.shouldInterceptRequest(r.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (ORIGINE.equals(r.getUrl().getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); // liens externes dans le navigateur
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest demande) {
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    demande.grant(demande.getResources());
                } else {
                    demandeEnAttente = demande;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, DEMANDE_CAMERA);
                }
            }
        });

        setContentView(web);
        if (etat == null) web.loadUrl("https://" + ORIGINE + "/www/index.html");
        else web.restoreState(etat);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] resultats) {
        if (code == DEMANDE_CAMERA && demandeEnAttente != null) {
            if (resultats.length > 0 && resultats[0] == PackageManager.PERMISSION_GRANTED) demandeEnAttente.grant(demandeEnAttente.getResources());
            else demandeEnAttente.deny();
            demandeEnAttente = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle etat) { super.onSaveInstanceState(etat); web.saveState(etat); }

    @Override
    public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
