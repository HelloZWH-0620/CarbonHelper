package com.carbonhelper.tankan;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge：内容绘制到系统栏之后
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
        }
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        webView = new WebView(this);
        configureWebView();
        setContentView(webView);

        // 状态栏/导航栏图标使用浅色（顶部标题区为蓝色背景白字）。
        // 必须在 setContentView 之后调用：部分定制 ROM（ColorOS/MTK Android 16）
        // 在 onCreate 早期获取 InsetsController 会因 DecorView 未就绪而抛 NPE。
        applySystemBarAppearance(window);

        // 将系统安全区（状态栏顶部、手势条底部）尺寸注入到页面 CSS 变量
        webView.setOnApplyWindowInsetsListener((v, insets) -> {
            int top = insets.getInsets(WindowInsets.Type.statusBars()).top;
            int bottom = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
            int caption = insets.getInsets(WindowInsets.Type.captionBar()).top;
            int safeBottom = Math.max(bottom, caption);
            String js = "document.documentElement.style.setProperty('--sat','" + top + "px');"
                    + "document.documentElement.style.setProperty('--sab','" + safeBottom + "px');";
            v.post(() -> {
                if (webView != null) {
                    webView.evaluateJavascript(js, null);
                }
            });
            return insets;
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    private void applySystemBarAppearance(Window window) {
        if (Build.VERSION.SDK_INT < 30) return;
        try {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                        0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        } catch (Exception ignored) {
            // ROM 兼容性保护：个别机型在此时机获取 InsetsController 会异常，忽略即可
        }
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
