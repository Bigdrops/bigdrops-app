/* ============================================================
   Divine Blood — shared behaviour (dashboard trio)
   Theme, sidebar (morph icon), mobile nav, more sheet,
   header controls (search / notifications / steward / refresh).
   No living material inside functional panels.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("db-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
    var btn = document.getElementById("themeToggle");
    if (btn) btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("db-theme", next); } catch (e) {}
    });
  }

  /* ---------- Morph sidebar icon (translated from sidebaricon.tsx) ---------- */
  var PANEL_CLOSED = "M10 5.5 C10 4.793 10 4.439 9.780 4.220 C9.560 4 9.207 4 8.5 4 H8.5 C6.379 4 5.318 4 4.659 4.659 C4 5.318 4 6.379 4 8.5 V15.5 C4 17.621 4 18.682 4.659 19.341 C5.318 20 6.379 20 8.5 20 H8.5 C9.207 20 9.561 20 9.780 19.780 C10 19.561 10 19.207 10 18.5 V5.5 Z";
  var PANEL_OPEN = "M14 6 C14 5.057 14 4.586 13.707 4.293 C13.414 4 12.943 4 12 4 H10 C7.172 4 5.757 4 4.879 4.879 C4 5.757 4 7.172 4 10 V14 C4 16.828 4 18.243 4.879 19.121 C5.757 20 7.172 20 10 20 H12 C12.943 20 13.414 20 13.707 19.707 C14 19.414 14 18.943 14 18 V6 Z";
  var panelPath = document.getElementById("sbPanel");
  function setMorphIcon(open) {
    if (panelPath) {
      panelPath.setAttribute("d", open ? PANEL_OPEN : PANEL_CLOSED);
      panelPath.style.fill = "var(--db-sidebar-panel)";
    }
  }

  /* ---------- Sidebar ---------- */
  var app = document.getElementById("app");
  var menuBtn = document.getElementById("menuBtn");
  var backdrop = document.getElementById("sidebarBackdrop");
  var moreBtn = document.getElementById("moreBtn");
  var moreSheet = document.getElementById("moreSheet");
  var moreBackdrop = document.getElementById("moreBackdrop");
  var moreOpen = false;

  function setSidebar(open) {
    if (!app) return;
    app.classList.toggle("sidebar-open", open);
    setMorphIcon(open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setSidebar(!app.classList.contains("sidebar-open")); });
  if (backdrop) backdrop.addEventListener("click", function () { setSidebar(false); });
  if (window.matchMedia("(min-width:1024px)").matches) setSidebar(true);

  /* ---------- More sheet ---------- */
  function setMore(open) {
    moreOpen = open;
    if (moreSheet) moreSheet.classList.toggle("is-open", open);
    if (moreBackdrop) moreBackdrop.classList.toggle("is-open", open);
    if (moreBtn) moreBtn.setAttribute("aria-expanded", String(open));
  }
  if (moreBtn) moreBtn.addEventListener("click", function () { setMore(!moreOpen); });
  if (moreBackdrop) moreBackdrop.addEventListener("click", function () { setMore(false); });

  /* ---------- Overlays (search / notifications / steward) ---------- */
  var overlayTriggers = {};
  function setOverlay(overlay, open) {
    overlay.classList.toggle("is-open", open);
    (overlayTriggers[overlay.id] || []).forEach(function (t) {
      t.setAttribute("aria-expanded", String(open));
    });
  }
  function bindOverlay(triggerId, overlayId, closeId) {
    var trigger = document.getElementById(triggerId);
    var overlay = document.getElementById(overlayId);
    if (!trigger || !overlay) return;
    (overlayTriggers[overlayId] = overlayTriggers[overlayId] || []).push(trigger);
    var input = overlay.querySelector("input");
    trigger.addEventListener("click", function () {
      var open = !overlay.classList.contains("is-open");
      setOverlay(overlay, open);
      if (open && input) setTimeout(function () { input.focus(); }, 60);
    });
    if (closeId) {
      var close = document.getElementById(closeId);
      if (close) close.addEventListener("click", function () { setOverlay(overlay, false); });
    }
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) setOverlay(overlay, false);
    });
  }
  bindOverlay("searchBtn", "searchOverlay", "searchClose");
  bindOverlay("notifBtn", "notifOverlay", "notifClose");
  bindOverlay("stewardBtn", "stewardOverlay", "stewardClose");
  bindOverlay("stewardBtn2", "stewardOverlay");

  /* ---------- Refresh ---------- */
  var refreshBtn = document.getElementById("refreshBtn");
  function toast(msg, isError) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
    el.classList.add("is-open");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("is-open"); }, 2200);
  }
  if (refreshBtn) refreshBtn.addEventListener("click", function () {
    toast("Refreshing data…");
    setTimeout(function () { toast("Data refreshed"); }, 700);
  });

  /* ---------- Tenant switcher ---------- */
  var tenantTrigger = document.getElementById("companyTrigger");
  var tenantMenu = document.getElementById("companyMenu");
  if (tenantTrigger && tenantMenu) {
    var companies = [
      { name: "Sterling Holdings", id: "sh" },
      { name: "Onyx Traders Ltd", id: "ot" },
      { name: "Aster & Co.", id: "ac" }
    ];
    var sel = 0;
    function renderTenant() {
      tenantMenu.innerHTML = "";
      companies.forEach(function (c, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tm-item";
        b.textContent = c.name;
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", String(i === sel));
        b.addEventListener("click", function () {
          sel = i;
          var name = document.getElementById("activeCompanyName");
          if (name) name.textContent = c.name;
          tenantTrigger.setAttribute("aria-expanded", "false");
          tenantMenu.hidden = true;
        });
        tenantMenu.appendChild(b);
      });
    }
    tenantTrigger.addEventListener("click", function () {
      var open = tenantMenu.hidden;
      tenantMenu.hidden = !open;
      tenantTrigger.setAttribute("aria-expanded", String(open));
      if (open) renderTenant();
    });
    document.addEventListener("click", function (e) {
      if (!tenantMenu.hidden && !tenantMenu.contains(e.target) && !tenantTrigger.contains(e.target)) {
        tenantMenu.hidden = true;
        tenantTrigger.setAttribute("aria-expanded", "false");
      }
    });
    renderTenant();
    tenantMenu.hidden = true;
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setSidebar(false);
      setMore(false);
      document.querySelectorAll(".overlay.is-open").forEach(function (ov) {
        setOverlay(ov, false);
      });
    }
  });

  /* ---------- Mobile active nav (per-page data-active) ---------- */
  var activeNav = (document.getElementById("app") || {}).getAttribute && document.getElementById("app").getAttribute("data-active");
  document.querySelectorAll(".mnav-item").forEach(function (item) {
    var href = item.getAttribute("href") || "";
    var file = href.split("/").pop().replace(/\.html$/, "");
    var isActive = href === "#" ? activeNav === "dashboard" : file.indexOf(activeNav) !== -1;
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  initTheme();
})();