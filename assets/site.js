/* Havi Hub website: the language, the style (CurseForge or Modrinth), the
   comparison of the two layouts, the screenshot tabs, the download buttons,
   the screenshot viewer and the Ko-fi panel. Each part only runs on the pages
   that have it. */
(function () {
  "use strict";

  var root = document.documentElement;
  var REPO = "havihub/HaviHub";
  var RELEASES = "https://github.com/" + REPO + "/releases";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function $(sel, from) { return (from || document).querySelector(sel); }
  function $$(sel, from) { return Array.prototype.slice.call((from || document).querySelectorAll(sel)); }
  function lang() { return root.lang === "en" ? "en" : "es"; }
  function style() { return root.getAttribute("data-style") === "mr" ? "mr" : "cf"; }

  /* ------------------------------------------------------------ language and style */
  // The page is written in both languages (data-l), and what differs between
  // the two styles is written for each (data-s); both are set in <head>.
  // Attributes keep their English text in data-en-<attribute>.
  var ATTRS = ["alt", "aria-label", "title", "content"];
  var esTitle = document.title;

  function translate(scope) {
    var l = lang();
    ATTRS.forEach(function (attr) {
      $$("[data-en-" + attr + "]", scope).forEach(function (el) {
        if (!el.hasAttribute("data-es-" + attr)) el.setAttribute("data-es-" + attr, el.getAttribute(attr) || "");
        el.setAttribute(attr, el.getAttribute("data-" + l + "-" + attr));
      });
    });
  }

  function shot(name, s, l) { return "/assets/shots/" + (s || style()) + "/" + (l || lang()) + "/" + name + ".webp"; }
  // a screenshot with data-shot-style always shows that style (the comparison of both)
  function shotOf(img, s, l) { return shot(img.getAttribute("data-shot"), img.getAttribute("data-shot-style") || s, l); }

  function applyView() {
    translate(document);
    var enTitle = root.getAttribute("data-en-doc-title");
    document.title = lang() === "en" && enTitle ? enTitle : esTitle;
    $$("img[data-shot]").forEach(function (img) {
      var src = shotOf(img);
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
    $$("a[data-lb]").forEach(function (a) { a.setAttribute("href", shot(a.getAttribute("data-lb"))); });
    var icon = $('link[rel="icon"][type="image/svg+xml"]');
    if (icon) icon.setAttribute("href", style() === "mr" ? "/assets/favicon-mr.svg" : "/assets/favicon.svg");
    $$("[data-style-pick]").forEach(function (b) {
      var on = b.getAttribute("data-style-pick") === style();
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    $$("[data-lang-pick]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-lang-pick") === lang() ? "true" : "false"); });
    renderRelease();
    placeInk(true);
    if (viewer) viewer.refresh();
  }

  // The screenshots on screen in the language and style being switched to,
  // loaded before the switch so they fade in with the rest (for a moment at most).
  function ready(s, l) {
    var waits = $$("img[data-shot]").filter(function (img) {
      var r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && getComputedStyle(img).visibility !== "hidden";
    }).map(function (img) {
      var next = new Image();
      next.src = shotOf(img, s, l);
      return next.decode ? next.decode().catch(function () {}) : Promise.resolve();
    });
    return Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, 700); })]);
  }

  var switching = false;
  function switchTo(s, l, slow) {
    if (switching) return;
    switching = true;
    var swap = function () {
      root.lang = l;
      root.setAttribute("data-style", s);
      applyView();
    };
    ready(s, l).then(function () {
      if (!document.startViewTransition || reduced.matches) { swap(); switching = false; return; }
      if (slow) root.classList.add("vt-style");
      var t = document.startViewTransition(swap);
      t.finished.finally(function () { root.classList.remove("vt-style"); switching = false; });
    });
  }

  function forget(param) {
    var q = new URLSearchParams(location.search);
    if (!q.has(param)) return;
    q.delete(param);
    var rest = q.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
  }

  function pickLang(next) {
    if (next === lang()) return;
    try { sessionStorage.setItem("havihub-lang", next); } catch (e) { /* private mode */ }
    forget("lang");
    switchTo(style(), next, false);
  }
  function pickStyle(next) {
    if (next === style()) return;
    try { sessionStorage.setItem("havihub-style", next); } catch (e) { /* private mode */ }
    forget("style");
    switchTo(next, lang(), true);
  }

  $$("[data-lang-pick]").forEach(function (button) {
    button.addEventListener("click", function () { pickLang(button.getAttribute("data-lang-pick")); });
  });

  // The footer's "Language" button: a small menu that closes when a language
  // is picked, on a click anywhere else and with Escape.
  $$(".lang-menu").forEach(function (menu) {
    var btn = $(".lang-btn", menu);
    var items = $$("[data-lang-pick]", menu);
    var setOpen = function (open, focusBack) {
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) (items.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0] || items[0]).focus();
      else if (focusBack) btn.focus();
    };
    btn.addEventListener("click", function () { setOpen(!menu.classList.contains("open"), false); });
    items.forEach(function (b, i) {
      b.addEventListener("click", function () { setOpen(false, true); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
        }
      });
    });
    menu.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) setOpen(false, true); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target) && menu.classList.contains("open")) setOpen(false, false); });
    menu.addEventListener("focusout", function (e) { if (e.relatedTarget && !menu.contains(e.relatedTarget)) setOpen(false, false); });
  });

  // The migration diagram moves only while it's on screen.
  $$(".migrate").forEach(function (el) {
    if (!("IntersectionObserver" in window)) return;
    el.classList.add("is-paused");
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { el.classList.toggle("is-paused", !en.isIntersecting); });
    }).observe(el);
  });

  // The two styles behave as a pair of radio buttons: a click or the arrow keys pick one.
  $$("[data-style-pick]").forEach(function (button) {
    button.addEventListener("click", function () { pickStyle(button.getAttribute("data-style-pick")); });
    button.addEventListener("keydown", function (e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(e.key) < 0) return;
      e.preventDefault();
      var next = style() === "mr" ? "cf" : "mr";
      pickStyle(next);
      var other = $('[data-style-pick="' + next + '"]', button.parentNode);
      if (other) other.focus();
    });
  });

  /* ------------------------------------------------------------ the two layouts, side by side */
  // The line can be dragged with the mouse or a finger, or moved with the
  // arrow keys; a click or a tap takes it there. On a touch screen, a swipe
  // up or down still scrolls the page.
  var compare = $("#compare");
  if (compare) {
    var frame = $(".compare-frame", compare);
    var handle = $(".compare-handle", compare);
    var pos = 50;
    var drag = null;
    var touched = false; // once used, the line is left where it was put
    var hintFrame = 0;

    var setPos = function (p, glide) {
      pos = Math.min(100, Math.max(0, p));
      compare.classList.toggle("is-snapping", Boolean(glide));
      compare.style.setProperty("--pos", pos.toFixed(2) + "%");
      var n = Math.round(pos);
      handle.setAttribute("aria-valuenow", String(n));
      handle.setAttribute("aria-valuetext", "CurseForge " + n + "%, Modrinth " + (100 - n) + "%");
    };
    var at = function (x) {
      var r = frame.getBoundingClientRect();
      return ((x - r.left) / r.width) * 100;
    };
    var take = function () {
      touched = true;
      if (hintFrame) cancelAnimationFrame(hintFrame);
      hintFrame = 0;
    };
    var finish = function () {
      if (drag && drag.on && frame.hasPointerCapture(drag.id)) frame.releasePointerCapture(drag.id);
      drag = null;
      compare.classList.remove("is-dragging");
    };

    frame.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      take();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse", on: false };
      if (drag.mouse) {
        e.preventDefault();
        frame.setPointerCapture(e.pointerId);
        drag.on = true;
        compare.classList.add("is-dragging");
        setPos(at(e.clientX), true);
      }
    });
    frame.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        // a finger: only a sideways swipe moves the line
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy)) { drag = null; return; }
        frame.setPointerCapture(e.pointerId);
        drag.on = true;
        compare.classList.add("is-dragging");
      }
      setPos(at(e.clientX), false);
    });
    frame.addEventListener("pointerup", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) setPos(at(e.clientX), true); // a tap
      finish();
    });
    frame.addEventListener("pointercancel", finish);
    // (a finger first captures the element under it, such as the knob's icon;
    // only the frame losing it ends the drag)
    frame.addEventListener("lostpointercapture", function (e) { if (e.target === frame && drag && drag.on) finish(); });

    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      var next = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, PageDown: pos - 10, PageUp: pos + 10, Home: 0, End: 100 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      take();
      setPos(next, true);
    });

    // When it first comes into view it rises into place, and the line sways
    // once to each side to show that it can be moved.
    var sway = function () {
      if (touched || reduced.matches) return;
      var start = performance.now(), length = 1600;
      compare.classList.remove("is-snapping");
      var stepSway = function (t) {
        if (touched) return;
        var k = Math.min(1, (t - start) / length);
        setPos(50 - 13 * Math.sin(k * Math.PI * 2) * Math.sin(k * Math.PI), false);
        hintFrame = k < 1 ? requestAnimationFrame(stepSway) : 0;
      };
      hintFrame = requestAnimationFrame(stepSway);
    };
    if ("IntersectionObserver" in window && !reduced.matches) {
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        compare.classList.add("is-in");
        setTimeout(sway, 900);
      }, { threshold: 0.35 });
      seen.observe(compare);
    } else {
      compare.classList.add("is-in");
    }
  }

  /* ------------------------------------------------------------ screenshot tabs */
  // One screenshot at a time, in a large frame; the tabs (or the arrow keys
  // on them) change it.
  var tabs = $$('.tabs [role="tab"]');
  var ink = $(".tab-ink");
  var panes = $(".panes");

  function placeInk(instant) {
    if (!ink) return;
    var on = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
    if (!on || !on.offsetWidth) return;
    if (instant) ink.style.transition = "none";
    ink.style.width = on.offsetWidth + "px";
    ink.style.transform = "translateX(" + on.offsetLeft + "px)";
    if (instant) { ink.getBoundingClientRect(); ink.style.transition = ""; }
  }

  function selectTab(tab, focus, instant) {
    if (instant) panes.classList.add("instant");
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var pane = document.getElementById(t.getAttribute("aria-controls"));
      if (pane) pane.classList.toggle("is-on", on);
    });
    if (instant) { panes.getBoundingClientRect(); panes.classList.remove("instant"); }
    if (focus) tab.focus({ preventScroll: true });
    placeInk(instant);
    // on a narrow screen the row of tabs scrolls sideways: keep the chosen one in sight
    var row = tab.parentNode;
    var left = tab.offsetLeft - 4, right = tab.offsetLeft + tab.offsetWidth + 4;
    if (left < row.scrollLeft) row.scrollTo({ left: left, behavior: instant || reduced.matches ? "auto" : "smooth" });
    else if (right > row.scrollLeft + row.clientWidth) row.scrollTo({ left: right - row.clientWidth, behavior: instant || reduced.matches ? "auto" : "smooth" });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false, false); });
    tab.addEventListener("keydown", function (e) {
      var n = tabs.length;
      var next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      selectTab(tabs[(next + n) % n], true, false);
    });
  });
  if (tabs.length) {
    window.addEventListener("resize", function () { placeInk(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeInk(true); });
  }

  /* ------------------------------------------------------------ seasonal themes */
  // In "Temas de temporada", one screenshot per theme, picked with the buttons
  // above it. Another theme is one more button and one more figure.
  var themePicks = $$(".themes [data-theme]");
  var themeShots = $(".theme-shots");

  function selectTheme(name, focus, instant) {
    if (instant && themeShots) themeShots.classList.add("instant");
    themePicks.forEach(function (b) {
      var on = b.getAttribute("data-theme") === name;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus({ preventScroll: true });
    });
    $$("[data-theme-shot]").forEach(function (f) { f.classList.toggle("is-on", f.getAttribute("data-theme-shot") === name); });
    if (instant && themeShots) { themeShots.getBoundingClientRect(); themeShots.classList.remove("instant"); }
  }

  themePicks.forEach(function (b, i) {
    b.addEventListener("click", function () { selectTheme(b.getAttribute("data-theme"), false, false); });
    b.addEventListener("keydown", function (e) {
      var n = themePicks.length;
      var next = { ArrowLeft: i - 1, ArrowUp: i - 1, ArrowRight: i + 1, ArrowDown: i + 1, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      selectTheme(themePicks[(next + n) % n].getAttribute("data-theme"), true, false);
    });
  });

  /* ------------------------------------------------------------ downloads */
  function platform() {
    var data = navigator.userAgentData;
    var p = data && data.platform ? data.platform.toLowerCase() : "";
    var ua = navigator.userAgent || "";
    if ((data && data.mobile) || p === "android" || p === "ios" || /Android|iPhone|iPad|iPod/i.test(ua)) return "mobile";
    if (p === "windows" || /Windows/i.test(ua)) return "windows";
    if (p === "macos" || /Macintosh|Mac OS X/i.test(ua)) return navigator.maxTouchPoints > 1 ? "mobile" : "mac";
    if (p === "linux" || p === "chrome os" || p === "chromeos" || /Linux|X11|CrOS/i.test(ua)) return "linux";
    return "windows";
  }

  var os = platform();
  var mainOs = os === "linux" ? "linux" : "windows";
  var release; // undefined: not known yet | null: no version published yet | the latest release
  var PATTERNS = {
    setup: /-Setup\.exe$/i,
    portable: /-portable\.exe$/i,
    zip: /-win-x64\.zip$/i,
    appimage: /\.AppImage$/i,
    deb: /\.deb$/i
  };
  var get = $("#get");

  function megabytes(bytes) { return Math.round(bytes / 1048576) + " MB"; }

  // The button for this computer's system goes first, as the main one, and so
  // does the card with this system's files.
  if (get) {
    $$("a[data-os]", get).forEach(function (button) {
      var main = button.getAttribute("data-os") === mainOs;
      button.classList.toggle("btn-main", main);
      button.classList.toggle("btn-ghost", !main);
      if (main) get.insertBefore(button, get.firstChild);
    });
    $$(".os-card").forEach(function (card) {
      var main = card.getAttribute("data-os") === mainOs;
      card.classList.toggle("is-main", main);
      if (main) card.parentNode.insertBefore(card, card.parentNode.firstChild);
    });
    $$("[data-rec]").forEach(function (tag) { tag.hidden = tag.getAttribute("data-rec") !== mainOs; });
  }

  function renderRelease() {
    if (!get) return;
    var assets = {};
    if (release && release.assets) {
      release.assets.forEach(function (a) {
        for (var key in PATTERNS) if (PATTERNS[key].test(a.name)) assets[key] = a;
      });
    }
    // no release yet (or GitHub can't be reached): nothing can be clicked;
    // each button turns on by itself once its file is in a release
    var none = !release || !Object.keys(assets).length;
    var lock = function (a, off) {
      if (off) {
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
      } else {
        a.removeAttribute("aria-disabled");
        a.removeAttribute("tabindex");
      }
    };
    $$("a.dl[data-asset]").forEach(function (a) {
      var asset = assets[a.getAttribute("data-asset")];
      if (asset) a.href = asset.browser_download_url;
      var size = $(".size", a);
      if (size) size.textContent = asset ? megabytes(asset.size) : "";
      a.classList.toggle("off", !asset);
      lock(a, !asset);
    });
    $$("a[data-os]", get).forEach(function (button) {
      var main = button.classList.contains("btn-main");
      var asset = assets[button.getAttribute("data-asset")];
      if (asset) button.href = asset.browser_download_url;
      $("[data-size]", button).textContent = main && asset ? megabytes(asset.size) : "";
      $("[data-soon]", button).hidden = !(main && !asset);
      button.hidden = !main && !asset;
      lock(button, !asset);
    });
    $("#get-gh").hidden = !none;

    var note = none ? "none" : os === "mobile" ? "mobile" : os === "mac" ? "mac" : "normal";
    $$("[data-note]").forEach(function (el) { el.hidden = el.getAttribute("data-note") !== note; });

    var version = release && release.tag_name;
    $$("[data-rel]").forEach(function (el) {
      var kind = el.getAttribute("data-rel");
      el.hidden = !(kind === "none" ? none : Boolean(version));
    });
    if (version) {
      $$("[data-ver]").forEach(function (el) { el.textContent = version.replace(/^v/, ""); });
      var when = new Date(release.published_at);
      var opts = { day: "numeric", month: "long", year: "numeric" };
      $$("[data-date]").forEach(function (el) {
        el.textContent = when.toLocaleDateString(el.getAttribute("data-date") === "en" ? "en-US" : "es-CL", opts);
      });
    }
  }

  if (get) {
    // the list (200 even when empty) instead of /latest, which answers 404
    // until the first release and leaves an error in the console
    fetch("https://api.github.com/repos/" + REPO + "/releases?per_page=5", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (list) {
        release = (list || []).filter(function (r) { return !r.draft && !r.prerelease; })[0] || null;
        renderRelease();
      })
      .catch(function () { release = null; renderRelease(); });
  }

  /* ------------------------------------------------------------ changelog */
  // /changelog/: every release on GitHub, newest first, with its notes. The
  // notes are Markdown; only text, headings, lists, bold, code and https links
  // are kept, everything else is shown as plain text.
  var relList = $("#releases");
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inline(t) {
    return esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  }
  function markdown(md) {
    var out = [], list = null, para = [];
    var endPara = function () { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    var endList = function () { if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } };
    String(md || "").replace(/\r/g, "").split("\n").forEach(function (line) {
      var h = /^(#{1,6})\s+(.*)$/.exec(line), li = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (h) { endPara(); endList(); out.push("<h3>" + inline(h[2]) + "</h3>"); }
      else if (li) { endPara(); (list = list || []).push("<li>" + inline(li[1]) + "</li>"); }
      else if (!line.trim()) { endPara(); endList(); }
      else { endList(); para.push(line.trim()); }
    });
    endPara(); endList();
    return out.join("");
  }
  function relState(name) {
    relList.setAttribute("aria-busy", "false");
    $$(".rel-state", relList).forEach(function (el) { el.hidden = el.getAttribute("data-state") !== name; });
  }
  if (relList) {
    fetch("https://api.github.com/repos/" + REPO + "/releases?per_page=30", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (list) {
        list = (list || []).filter(function (r) { return !r.draft; });
        if (!list.length) return relState("none");
        relState("");
        var opts = { day: "numeric", month: "long", year: "numeric" };
        list.forEach(function (r, i) {
          var when = r.published_at ? new Date(r.published_at) : null;
          var ver = esc(String(r.tag_name || r.name || "").replace(/^v/, ""));
          var date = when ? '<span class="rel-date"><span data-l="es">' + esc(when.toLocaleDateString("es-CL", opts)) + '</span><span data-l="en">' + esc(when.toLocaleDateString("en-US", opts)) + "</span></span>" : "";
          var tag = r.prerelease ? '<span class="rel-tag">Pre-release</span>' : i === 0 ? '<span class="rel-tag"><span data-l="es">Última</span><span data-l="en">Latest</span></span>' : "";
          var link = /^https:\/\/github\.com\//.test(r.html_url || "") ? r.html_url : RELEASES;
          var el = document.createElement("article");
          el.className = "rel";
          el.id = "v" + ver.replace(/[^\w.-]/g, "");
          el.innerHTML = '<header class="rel-head"><h2><a href="' + esc(link) + '" rel="noopener">' + ver + "</a></h2>" + date + tag + "</header>" +
            '<div class="rel-body">' + (r.body ? markdown(r.body) : '<p><span data-l="es">Esta versión no tiene notas.</span><span data-l="en">This release has no notes.</span></p>') + "</div>";
          relList.appendChild(el);
        });
      })
      .catch(function () { relState("error"); });
  }

  /* ------------------------------------------------------------ Ko-fi */
  // The panel is loaded only when asked for, since it brings Ko-fi's own
  // scripts and cookies. The card grows to the panel's height as it opens.
  var jarOpen = $("#jar-open");
  if (jarOpen) {
    jarOpen.addEventListener("click", function () {
      var jar = $("#jar");
      var from = jar.getBoundingClientRect().height;
      var frame = document.createElement("iframe");
      frame.src = "https://ko-fi.com/havikunn/?hidefeed=true&widget=true&embed=true";
      frame.title = "Donaciones para Havikun en Ko-fi";
      frame.setAttribute("data-en-title", "Donations to Havikun on Ko-fi");
      jar.classList.add("open");
      jar.replaceChildren(frame);
      translate(jar);
      if (!reduced.matches && jar.animate) {
        var to = jar.getBoundingClientRect().height;
        jar.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
        frame.style.opacity = "0";
        var show = function () { frame.style.transition = "opacity 0.35s ease"; frame.style.opacity = "1"; };
        frame.addEventListener("load", show, { once: true });
        setTimeout(show, 2500);
      }
      frame.focus();
    });
  }

  /* ------------------------------------------------------------ screenshot viewer */
  // Every screenshot on the page opens here: zoom with the wheel, a pinch, the
  // buttons or a double click; drag to move around; arrows, keys or a swipe to
  // go to the next one.
  var viewer = null;
  var lb = $("#lb");
  var triggers = $$("a[data-lb]");
  if (lb && triggers.length && typeof lb.showModal === "function") viewer = makeViewer();

  function makeViewer() {
    var img = $(".lb-img", lb);
    var stage = $(".lb-stage", lb);
    var count = $(".lb-count", lb);
    var caption = $(".lb-cap", lb);
    var zoomLabel = $("[data-lb-fit]", lb);
    var zoomIn = $("[data-lb-in]", lb);
    var zoomOut = $("[data-lb-out]", lb);
    var MAX = 3; // set again for each screenshot: enough to read its smallest text
    var index = 0;
    var fit = { w: 0, h: 0, cx: 0, cy: 0, W: 0, H: 0 };
    var cur = { x: 0, y: 0, s: 1 };
    var goal = { x: 0, y: 0, s: 1 };
    var raf = 0, last = 0;
    var pointers = new Map();
    var gesture = null, lastTap = null, busy = false, closing = false, pushed = false;

    function inside(x, y) {
      var r = img.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
    function tf(x, y, s) { return "translate3d(" + x + "px," + y + "px,0) scale(" + s + ")"; }
    function thumb(i) { return $("img", triggers[i]); }
    function natural(i) { return Number(thumb(i).getAttribute("width")) || 1600; }
    function ratio(i) { return natural(i) / (Number(thumb(i).getAttribute("height")) || 900); }

    // where the screenshot sits when it fits the screen
    function layout() {
      var W = lb.clientWidth || window.innerWidth, H = lb.clientHeight || window.innerHeight;
      var narrow = W < 700;
      var side = narrow ? 10 : 92, top = narrow ? 64 : 76, bottom = narrow ? 84 : 96;
      var aw = W - side * 2, ah = H - top - bottom;
      var r = ratio(index);
      var w = Math.max(80, Math.min(aw, ah * r)), h = w / r;
      fit = { w: w, h: h, cx: W / 2, cy: top + ah / 2, W: W, H: H };
      MAX = Math.max(3, (2 * natural(index)) / w);
      img.style.width = w + "px";
      img.style.height = h + "px";
      img.style.left = (fit.cx - w / 2) + "px";
      img.style.top = (fit.cy - h / 2) + "px";
    }

    // how far the screenshot may move at a zoom: while it is smaller than
    // the screen it stays put; once bigger, its edges can reach the screen's
    function limit(v, size, center, view) {
      if (size <= view) return 0;
      var lo = view - center - size / 2, hi = size / 2 - center;
      return Math.min(Math.max(v, lo), hi);
    }
    function limitX(x, s) { return limit(x, fit.w * s, fit.cx, fit.W); }
    function limitY(y, s) { return limit(y, fit.h * s, fit.cy, fit.H); }
    function stretch(v, lo, hi) { return v < lo ? lo - (lo - v) * 0.35 : v > hi ? hi + (v - hi) * 0.35 : v; }
    function range(size, center, view) {
      if (size <= view) return [0, 0];
      return [view - center - size / 2, size / 2 - center];
    }

    function apply() {
      img.style.transform = tf(cur.x, cur.y, cur.s);
      zoomLabel.textContent = Math.round(goal.s * 100) + "%";
      zoomOut.disabled = goal.s <= 1.001;
      zoomIn.disabled = goal.s >= MAX - 0.001;
      lb.classList.toggle("is-zoomed", goal.s > 1.001);
    }

    // eases the screenshot towards its goal; x and y follow the scale at the
    // same pace, so the point being zoomed stays under the pointer
    function animate() {
      if (reduced.matches) { cur.x = goal.x; cur.y = goal.y; cur.s = goal.s; apply(); return; }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }
    function step(t) {
      var dt = Math.min(64, t - last);
      last = t;
      var k = 1 - Math.pow(0.78, dt / 16.7);
      cur.x += (goal.x - cur.x) * k;
      cur.y += (goal.y - cur.y) * k;
      cur.s += (goal.s - cur.s) * k;
      var done = Math.abs(goal.x - cur.x) < 0.3 && Math.abs(goal.y - cur.y) < 0.3 && Math.abs(goal.s - cur.s) < 0.002;
      if (done) { cur.x = goal.x; cur.y = goal.y; cur.s = goal.s; }
      apply();
      raf = done ? 0 : requestAnimationFrame(step);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      goal.x = cur.x; goal.y = cur.y; goal.s = cur.s;
    }

    function zoomTo(s, px, py) {
      s = Math.min(MAX, Math.max(1, s));
      if (px == null) { px = fit.cx; py = fit.cy; }
      var k = s / goal.s;
      var x = px - fit.cx - (px - fit.cx - goal.x) * k;
      var y = py - fit.cy - (py - fit.cy - goal.y) * k;
      goal.s = s;
      goal.x = limitX(x, s);
      goal.y = limitY(y, s);
      animate();
    }
    function toggleZoom(px, py) {
      // in to the screenshot's own size (at least 2.2×), or back out to fit
      if (goal.s > 1.001) zoomTo(1); else zoomTo(Math.max(2.2, natural(index) / fit.w), px, py);
    }

    function describe() {
      count.textContent = (index + 1) + " / " + triggers.length;
      var figure = triggers[index].closest("figure");
      var text = figure && $("figcaption", figure);
      caption.innerHTML = text ? text.innerHTML : "";
      img.alt = thumb(index).alt;
    }

    function preload(i) {
      [i - 1, i + 1].forEach(function (j) {
        var n = triggers.length;
        var p = new Image();
        p.src = shot(triggers[(j + n) % n].getAttribute("data-lb"));
      });
    }

    function reset() {
      stop();
      cur = { x: 0, y: 0, s: 1 };
      goal = { x: 0, y: 0, s: 1 };
    }

    function open(i) {
      index = i;
      reset();
      img.src = shot(triggers[i].getAttribute("data-lb"));
      describe();
      lb.showModal();
      root.classList.add("lb-lock");
      try { history.pushState({ havihubViewer: true }, ""); pushed = true; } catch (e) { pushed = false; }
      layout();
      apply();
      lb.focus({ preventScroll: true });
      lb.getBoundingClientRect(); // so the fade-in starts from transparent
      lb.classList.add("is-open");
      preload(i);
      if (reduced.matches) return;
      // grow out of the thumbnail that was clicked
      var r = thumb(i).getBoundingClientRect();
      if (r.width) {
        var k = r.width / fit.w;
        img.animate(
          [{ transform: tf(r.left + r.width / 2 - fit.cx, r.top + r.height / 2 - fit.cy, k) }, { transform: tf(0, 0, 1) }],
          { duration: 440, easing: "cubic-bezier(0.2, 0.75, 0.15, 1)" }
        );
      }
    }

    function close() {
      if (!lb.open || closing) return;
      closing = true;
      stop();
      // the screenshot tabs (and the theme, for a seasonal one) show the one
      // being closed, so it shrinks back into place
      var pane = triggers[index].closest('[role="tabpanel"]');
      var tab = pane && document.getElementById(pane.getAttribute("aria-labelledby"));
      if (tab && tab.getAttribute("aria-selected") !== "true") selectTab(tab, false, true);
      var themed = triggers[index].closest("[data-theme-shot]");
      if (themed && !themed.classList.contains("is-on")) selectTheme(themed.getAttribute("data-theme-shot"), false, true);
      if (pushed) { pushed = false; history.back(); }
      var finish = function () {
        lb.close();
        triggers[index].focus({ preventScroll: true });
      };
      lb.classList.remove("is-open");
      if (reduced.matches) return finish();
      // shrink back into the thumbnail of the screenshot on screen, if it can be seen
      var r = thumb(index).getBoundingClientRect();
      var seen = r.width && r.bottom > 0 && r.top < window.innerHeight;
      var anim = seen
        ? img.animate(
            [{ transform: tf(cur.x, cur.y, cur.s) }, { transform: tf(r.left + r.width / 2 - fit.cx, r.top + r.height / 2 - fit.cy, r.width / fit.w) }],
            { duration: 360, easing: "cubic-bezier(0.3, 0.6, 0.2, 1)", fill: "forwards" }
          )
        : img.animate(
            [{ opacity: 1, transform: tf(cur.x, cur.y, cur.s) }, { opacity: 0, transform: tf(cur.x, cur.y, cur.s * 0.94) }],
            { duration: 220, easing: "ease-in", fill: "forwards" }
          );
      anim.onfinish = function () { finish(); anim.cancel(); };
    }

    // to the next (dir 1) or previous (dir -1) screenshot, sliding sideways
    function go(dir, fromX) {
      var n = triggers.length;
      if (busy || n < 2) { goal.x = 0; animate(); return; }
      busy = true;
      stop();
      var next = (index + dir + n) % n;
      var d = Math.min(140, window.innerWidth * 0.1);
      var x0 = fromX || cur.x;
      var out = null;
      if (!reduced.matches) {
        var now = getComputedStyle(img);
        var from = { transform: now.transform === "none" ? tf(x0, cur.y, cur.s) : now.transform, opacity: now.opacity };
        img.getAnimations().forEach(function (a) { a.cancel(); });
        out = img.animate(
          [from, { transform: tf(x0 - dir * d, cur.y, cur.s), opacity: 0 }],
          { duration: 170, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
        );
      }
      var swap = function () {
        index = next;
        reset();
        img.src = shot(triggers[index].getAttribute("data-lb"));
        layout();
        apply();
        describe();
        var shown = function () {
          if (out) out.cancel();
          if (!reduced.matches) {
            img.animate([{ transform: tf(dir * d, 0, 1), opacity: 0 }, { transform: tf(0, 0, 1), opacity: 1 }], { duration: 300, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
          }
          busy = false;
          preload(index);
        };
        if (img.decode) img.decode().then(shown, shown); else shown();
      };
      if (out) out.onfinish = swap; else swap();
    }

    /* pointer: drag to move (or swipe), two fingers to pinch, tap outside to close */
    function velocity(hist) {
      if (hist.length < 2) return { x: 0, y: 0 };
      var a = hist[0], b = hist[hist.length - 1];
      var dt = Math.max(1, b.t - a.t);
      return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
    }
    function pair() {
      var p = Array.from(pointers.values());
      return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
    }

    stage.addEventListener("pointerdown", function (e) {
      if (busy || closing || (e.pointerType === "mouse" && e.button !== 0)) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stop();
      if (pointers.size === 1) {
        gesture = { kind: "drag", sx: e.clientX, sy: e.clientY, x0: cur.x, y0: cur.y, moved: false, onImage: inside(e.clientX, e.clientY), hist: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
      } else if (pointers.size === 2) {
        var p = pair();
        gesture = { kind: "pinch", d0: p.d, s0: cur.s, mx: p.x, my: p.y, x0: cur.x, y0: cur.y, lx: p.x, ly: p.y };
        lb.classList.add("is-dragging");
      }
    });

    stage.addEventListener("pointermove", function (e) {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesture.kind === "pinch") {
        if (pointers.size < 2) return;
        var p = pair(), g = gesture;
        var s = Math.min(MAX * 1.25, Math.max(0.75, g.s0 * p.d / g.d0));
        var k = s / g.s0;
        cur.x = goal.x = p.x - fit.cx - (g.mx - fit.cx - g.x0) * k;
        cur.y = goal.y = p.y - fit.cy - (g.my - fit.cy - g.y0) * k;
        cur.s = goal.s = s;
        g.lx = p.x; g.ly = p.y;
        apply();
        return;
      }
      var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 5) { gesture.moved = true; lb.classList.add("is-dragging"); }
      if (!gesture.moved) return;
      gesture.hist.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      while (gesture.hist.length > 2 && e.timeStamp - gesture.hist[0].t > 90) gesture.hist.shift();
      if (cur.s > 1.001) {
        var rx = range(fit.w * cur.s, fit.cx, fit.W), ry = range(fit.h * cur.s, fit.cy, fit.H);
        cur.x = goal.x = stretch(gesture.x0 + dx, rx[0], rx[1]);
        cur.y = goal.y = stretch(gesture.y0 + dy, ry[0], ry[1]);
      } else {
        cur.x = goal.x = triggers.length > 1 ? dx : dx * 0.3;
        cur.y = goal.y = 0;
      }
      apply();
    });

    function release(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      var g = gesture;
      if (!g) return;
      if (g.kind === "pinch") {
        if (pointers.size === 1) {
          // one finger stays down: carry on moving with it
          var p = pointers.values().next().value;
          gesture = { kind: "drag", sx: p.x, sy: p.y, x0: cur.x, y0: cur.y, moved: true, hist: [] };
        } else if (pointers.size === 0) {
          gesture = null;
          lb.classList.remove("is-dragging");
          zoomTo(goal.s, g.lx, g.ly); // back within the limits
        }
        return;
      }
      gesture = null;
      lb.classList.remove("is-dragging");
      if (!g.moved) return tap(e, g);
      // after a pinch past the limits, ease back to the nearest allowed zoom
      if (cur.s < 0.999 || cur.s > MAX + 0.001) { zoomTo(cur.s, e.clientX, e.clientY); return; }
      var v = velocity(g.hist);
      if (cur.s > 1.001) {
        goal.x = limitX(cur.x + v.x * 220, cur.s);
        goal.y = limitY(cur.y + v.y * 220, cur.s);
        animate();
      } else if (Math.abs(cur.x) > 90 || Math.abs(v.x) > 0.6) {
        go(cur.x < 0 ? 1 : -1, cur.x);
      } else {
        goal.x = 0;
        animate();
      }
    }
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    function tap(e, g) {
      var now = e.timeStamp;
      if (e.pointerType !== "mouse" && lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
        lastTap = null;
        toggleZoom(e.clientX, e.clientY);
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
      if (g.onImage || goal.s > 1.001) return;
      // outside the screenshot: close (on touch, after making sure it isn't a double tap)
      if (e.pointerType === "mouse") close();
      else setTimeout(function () { if (lastTap && lastTap.t === now) close(); }, 330);
    }

    stage.addEventListener("dblclick", function (e) { if (inside(e.clientX, e.clientY)) toggleZoom(e.clientX, e.clientY); });

    stage.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (busy) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      zoomTo(goal.s * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY);
    }, { passive: false });

    /* buttons and keys */
    zoomIn.addEventListener("click", function () { zoomTo(goal.s * 1.5); });
    zoomOut.addEventListener("click", function () { zoomTo(goal.s / 1.5); });
    zoomLabel.addEventListener("click", function () { zoomTo(1); });
    $("[data-lb-close]", lb).addEventListener("click", close);
    $("[data-lb-prev]", lb).addEventListener("click", function () { go(-1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { go(1); });
    lb.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    // however it was closed (the browser may close it on a second Escape)
    lb.addEventListener("close", function () {
      stop();
      root.classList.remove("lb-lock");
      lb.classList.remove("is-open", "is-zoomed", "is-dragging");
      pointers.clear();
      gesture = null;
      busy = false;
      closing = false;
      if (pushed) { pushed = false; history.back(); }
    });
    window.addEventListener("popstate", function () {
      if (lb.open && pushed) { pushed = false; close(); }
    });
    lb.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var key = e.key;
      if (key === "ArrowRight") go(1);
      else if (key === "ArrowLeft") go(-1);
      else if (key === "+" || key === "=") zoomTo(goal.s * 1.5);
      else if (key === "-" || key === "_") zoomTo(goal.s / 1.5);
      else if (key === "0") zoomTo(1);
      else return;
      e.preventDefault();
    });

    window.addEventListener("resize", function () {
      if (!lb.open) return;
      stop();
      layout();
      goal.x = cur.x = limitX(cur.x, cur.s);
      goal.y = cur.y = limitY(cur.y, cur.s);
      apply();
    });

    triggers.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return; // a new tab, as asked
        e.preventDefault();
        open(i);
      });
    });

    return {
      refresh: function () {
        if (!lb.open) return;
        img.src = shot(triggers[index].getAttribute("data-lb"));
        describe();
      }
    };
  }

  applyView();
})();
