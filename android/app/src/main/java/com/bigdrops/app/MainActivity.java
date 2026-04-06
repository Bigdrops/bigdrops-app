package com.bigdrops.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Implementation of native pull-to-refresh
        new android.os.Handler().postDelayed(() -> {
            if (bridge == null || bridge.getWebView() == null) return;

            final WebView webView = bridge.getWebView();
            SwipeRefreshLayout swipe = findViewById(R.id.swipe_container);

            // Fallback: If not found in XML, wrap it programmatically
            if (swipe == null) {
                swipe = new SwipeRefreshLayout(this);
                swipe.setId(android.view.View.generateViewId());
                android.view.ViewGroup parent = (android.view.ViewGroup) webView.getParent();
                if (parent != null) {
                    int index = parent.indexOfChild(webView);
                    parent.removeView(webView);
                    swipe.addView(webView, new android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                    ));
                    parent.addView(swipe, index);
                }
            }

            final SwipeRefreshLayout swipeLayout = swipe;
            swipeLayout.setOnRefreshListener(() -> {
                webView.reload();
                
                // Monitor progress to hide spinner
                final android.os.Handler h = new android.os.Handler();
                h.post(new Runnable() {
                    @Override
                    public void run() {
                        if (webView.getProgress() >= 100) {
                            swipeLayout.setRefreshing(false);
                        } else if (swipeLayout.isRefreshing()) {
                            h.postDelayed(this, 100);
                        }
                    }
                });
            });

            // Only allow swipe when at the very top of the scrollable content
            webView.getViewTreeObserver().addOnScrollChangedListener(() -> {
                swipeLayout.setEnabled(webView.getScrollY() == 0);
            });
        }, 500); // 500ms is usually enough for the bridge to initialize
    }
}
