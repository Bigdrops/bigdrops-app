package com.bigdrops.app.plugins;

import android.app.Activity;
import android.graphics.Rect;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter;
import androidx.window.layout.DisplayFeature;
import androidx.window.layout.FoldingFeature;
import androidx.window.layout.WindowInfoTracker;
import androidx.window.layout.WindowLayoutInfo;
import androidx.window.layout.WindowMetrics;
import androidx.window.layout.WindowMetricsCalculator;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.concurrent.Executor;

import androidx.core.util.Consumer;

@CapacitorPlugin(name = "FoldAwareness")
public class FoldAwarenessPlugin extends Plugin {
    private static final String EVENT_NAME = "foldInfoChanged";

    @Nullable
    private WindowInfoTrackerCallbackAdapter windowInfoTrackerAdapter;

    @Nullable
    private Consumer<WindowLayoutInfo> layoutInfoListener;

    @Nullable
    private WindowLayoutInfo latestLayoutInfo;

    private final Executor directExecutor = Runnable::run;

    @Override
    public void load() {
        super.load();
        startTracking();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        startTracking();
        notifyListeners(EVENT_NAME, buildPayload());
    }

    @Override
    protected void handleOnPause() {
        stopTracking();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        stopTracking();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        call.resolve(buildPayload());
    }

    @PluginMethod
    public void start(PluginCall call) {
        startTracking();
        call.resolve(buildPayload());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopTracking();
        call.resolve();
    }

    private void startTracking() {
        Activity activity = getActivity();
        if (activity == null || windowInfoTrackerAdapter != null) {
            return;
        }

        WindowInfoTracker tracker = WindowInfoTracker.getOrCreate(activity);
        windowInfoTrackerAdapter = new WindowInfoTrackerCallbackAdapter(tracker);

        layoutInfoListener = new Consumer<WindowLayoutInfo>() {
            @Override
            public void accept(WindowLayoutInfo windowLayoutInfo) {
                latestLayoutInfo = windowLayoutInfo;
                notifyListeners(EVENT_NAME, buildPayload());
            }
        };

        windowInfoTrackerAdapter.addWindowLayoutInfoListener(
            activity,
            directExecutor,
            layoutInfoListener
        );
    }

    private void stopTracking() {
        Activity activity = getActivity();
        if (activity == null || windowInfoTrackerAdapter == null || layoutInfoListener == null) {
            return;
        }

        windowInfoTrackerAdapter.removeWindowLayoutInfoListener(layoutInfoListener);
        windowInfoTrackerAdapter = null;
        layoutInfoListener = null;
    }

    @NonNull
    private JSObject buildPayload() {
        Activity activity = getActivity();
        JSObject payload = new JSObject();

        if (activity == null) {
            payload.put("available", false);
            return payload;
        }

        WindowMetrics metrics = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity);
        Rect bounds = metrics.getBounds();

        DisplayMetrics displayMetrics = activity.getResources().getDisplayMetrics();
        float density = displayMetrics.density <= 0 ? 1f : displayMetrics.density;

        float widthDp = bounds.width() / density;
        float heightDp = bounds.height() / density;

        FoldingFeature foldingFeature = findFoldingFeature(latestLayoutInfo);

        boolean hasFoldingFeature = foldingFeature != null;
        boolean isSeparating = hasFoldingFeature && foldingFeature.isSeparating();
        boolean isFlat = hasFoldingFeature && foldingFeature.getState() == FoldingFeature.State.FLAT;
        boolean isHalfOpened = hasFoldingFeature && foldingFeature.getState() == FoldingFeature.State.HALF_OPENED;
        boolean isHorizontal = hasFoldingFeature && foldingFeature.getOrientation() == FoldingFeature.Orientation.HORIZONTAL;
        boolean isVertical = hasFoldingFeature && foldingFeature.getOrientation() == FoldingFeature.Orientation.VERTICAL;
        boolean isTabletop = isHalfOpened && isHorizontal;
        boolean isBook = isHalfOpened && isVertical;

        payload.put("available", true);
        payload.put("widthDp", widthDp);
        payload.put("heightDp", heightDp);
        payload.put("widthClass", classifyWidth(widthDp));
        payload.put("heightClass", classifyHeight(heightDp));
        payload.put("layoutMode", classifyLayoutMode(widthDp));
        payload.put("isFoldable", hasFoldingFeature);
        payload.put("hasSeparatingFold", isSeparating);
        payload.put("isFlat", isFlat);
        payload.put("isHalfOpened", isHalfOpened);
        payload.put("isTabletop", isTabletop);
        payload.put("isBookPosture", isBook);

        if (hasFoldingFeature) {
            payload.put("orientation", isHorizontal ? "horizontal" : "vertical");
            payload.put("state", isHalfOpened ? "half_opened" : "flat");
            payload.put("occlusionType", foldingFeature.getOcclusionType().toString().toLowerCase());

            Rect foldBounds = foldingFeature.getBounds();
            JSObject boundsObject = new JSObject();
            boundsObject.put("left", foldBounds.left);
            boundsObject.put("top", foldBounds.top);
            boundsObject.put("right", foldBounds.right);
            boundsObject.put("bottom", foldBounds.bottom);
            boundsObject.put("width", foldBounds.width());
            boundsObject.put("height", foldBounds.height());

            payload.put("foldBounds", boundsObject);
        } else {
            payload.put("orientation", null);
            payload.put("state", null);
            payload.put("occlusionType", null);
            payload.put("foldBounds", null);
        }

        return payload;
    }

    @Nullable
    private FoldingFeature findFoldingFeature(@Nullable WindowLayoutInfo layoutInfo) {
        if (layoutInfo == null) {
            return null;
        }

        List<DisplayFeature> features = layoutInfo.getDisplayFeatures();
        for (DisplayFeature feature : features) {
            if (feature instanceof FoldingFeature) {
                return (FoldingFeature) feature;
            }
        }

        return null;
    }

    @NonNull
    private String classifyWidth(float widthDp) {
        if (widthDp < 600f) return "compact";
        if (widthDp < 840f) return "medium";
        if (widthDp < 1200f) return "expanded";
        if (widthDp < 1600f) return "large";
        return "extra_large";
    }

    @NonNull
    private String classifyHeight(float heightDp) {
        if (heightDp < 480f) return "compact";
        if (heightDp < 900f) return "medium";
        return "expanded";
    }

    @NonNull
    private String classifyLayoutMode(float widthDp) {
        if (widthDp < 600f) return "mobile";
        if (widthDp < 1200f) return "tablet";
        return "desktop";
    }
}