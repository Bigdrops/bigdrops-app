package com.bigdrops.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int MAX_BIND_ATTEMPTS = 40;
    private static final long BIND_RETRY_MS = 50L;
    private static final long REFRESH_POLL_MS = 80L;

    @Nullable
    private SwipeRefreshLayout swipeRefreshLayout;

    @Nullable
    private WebView bridgeWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        enableEdgeToEdge();
        applyWindowInsets();
        bindBridgeWebViewWhenReady(0);
    }

    private void enableEdgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }
    }

    private void applyWindowInsets() {
        final View root = findViewById(R.id.activity_root);
        final SwipeRefreshLayout swipe = findViewById(R.id.swipe_container);

        if (root == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());

            // Keep content clear of the status bar. Bottom inset is applied to the swipe container
            // so the WebView and pull-to-refresh region stay above gesture / nav bars.
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);

            if (swipe != null) {
                swipe.setPadding(0, 0, 0, systemBars.bottom);
            }

            return insets;
        });

        ViewCompat.requestApplyInsets(root);
    }

    private void bindBridgeWebViewWhenReady(int attempt) {
        if (bridge != null && bridge.getWebView() != null) {
            setupSwipeRefresh(bridge.getWebView());
            return;
        }

        if (attempt >= MAX_BIND_ATTEMPTS) {
            return;
        }

        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.postDelayed(() -> bindBridgeWebViewWhenReady(attempt + 1), BIND_RETRY_MS);
        }
    }

    private void setupSwipeRefresh(WebView webView) {
        if (bridgeWebView == webView && swipeRefreshLayout != null) {
            return;
        }

        bridgeWebView = webView;
        swipeRefreshLayout = findViewById(R.id.swipe_container);

        if (swipeRefreshLayout == null) {
            return;
        }

        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent != swipeRefreshLayout) {
            if (parent != null) {
                parent.removeView(webView);
            }

            swipeRefreshLayout.removeAllViews();
            swipeRefreshLayout.addView(
                webView,
                new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            );
        }

        swipeRefreshLayout.setEnabled(!webView.canScrollVertically(-1));

        swipeRefreshLayout.setOnChildScrollUpCallback((parentView, child) ->
            bridgeWebView != null && bridgeWebView.canScrollVertically(-1)
        );

        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (bridgeWebView == null) {
                swipeRefreshLayout.setRefreshing(false);
                return;
            }

            swipeRefreshLayout.setEnabled(false);
            bridgeWebView.reload();
            pollRefreshCompletion();
        });

        webView.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
            if (swipeRefreshLayout != null && bridgeWebView != null && !swipeRefreshLayout.isRefreshing()) {
                swipeRefreshLayout.setEnabled(!bridgeWebView.canScrollVertically(-1));
            }
        });
    }

    private void pollRefreshCompletion() {
        if (swipeRefreshLayout == null || bridgeWebView == null) {
            return;
        }

        if (!swipeRefreshLayout.isRefreshing()) {
            return;
        }

        if (bridgeWebView.getProgress() >= 100) {
            swipeRefreshLayout.setRefreshing(false);
            swipeRefreshLayout.setEnabled(!bridgeWebView.canScrollVertically(-1));
            return;
        }

        bridgeWebView.postDelayed(this::pollRefreshCompletion, REFRESH_POLL_MS);
    }
}