package com.sjmart.warehouse;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "AppReset")
public class AppResetPlugin extends Plugin {

    @PluginMethod
    public void resetAppData(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                // 1. Clear WebView Cache, History & Form Data
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.clearCache(true);
                    webView.clearHistory();
                    webView.clearFormData();
                    webView.clearSslPreferences();
                }

                // 2. Clear WebStorage (DOM Storage, LocalStorage & IndexedDB internal WebView)
                WebStorage.getInstance().deleteAllData();

                // 3. Clear Cookies
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.removeAllCookies(null);
                cookieManager.flush();

                // 4. Hapus Application Cache Dir
                deleteDir(activity.getCacheDir());
                if (activity.getExternalCacheDir() != null) {
                    deleteDir(activity.getExternalCacheDir());
                }

                call.resolve();

                // 5. Restart / Kill proses aplikasi agar WebView dan memori bersih seperti baru dibuka
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    try {
                        activity.finishAffinity();
                        System.exit(0);
                    } catch (Exception ignored) {}
                }, 1000);

            } catch (Exception e) {
                call.reject("Gagal reset data: " + e.getMessage());
            }
        });
    }

    private boolean deleteDir(File dir) {
        if (dir != null && dir.isDirectory()) {
            String[] children = dir.list();
            if (children != null) {
                for (String child : children) {
                    boolean success = deleteDir(new File(dir, child));
                    if (!success) {
                        return false;
                    }
                }
            }
            return dir.delete();
        } else if (dir != null && dir.isFile()) {
            return dir.delete();
        }
        return false;
    }
}

