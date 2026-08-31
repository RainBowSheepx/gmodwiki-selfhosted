var EditDisplay;
var Edit;
var Preview;
var Decorator;
class Navigate {
  static Init() {
    this.pageContent = document.getElementById("pagecontent");
    this.pageTitle = document.getElementById("pagetitle");
    this.pageFooter = document.getElementById("pagefooter");
    this.pageTitle2 = document.getElementById("tabs_page_title");
    this.sideBar = document.getElementById("sidebar");
    this.liveButton = document.getElementById("live-button");
    this.links = this.sideBar.getElementsByTagName("a");
    this.details = this.sideBar.getElementsByTagName("details");
  }

  static ToPage(address, push = true) {
    if (this.pageContent == null) {
      window.location.href = address;
      return true;
    }

    address = address.replaceAll(window.location.origin, "");

    if (!address.startsWith("/")) address = `/${address}`;

    if (address === "" || address === "/" || address === "//")
      address = "/index";

    // Cross-page anchors ("/Page#section") swap the content like any other
    // link, then scroll to the anchor once it exists in the new DOM.
    var hash = "";
    var hashIdx = address.indexOf("#");
    if (hashIdx >= 0) {
      hash = address.substring(hashIdx);
      address = address.substring(0, hashIdx) || "/index";
    }

    // App pages (the editor, the custom-pages index) open through the same
    // content swap вЂ” no reload, sidebar untouched. Their behaviour is wired
    // by the init hook after injection (innerHTML scripts never execute).
    var path = address.split("?")[0].toLowerCase().replace(/\/$/, "");
    if (path === "/custom/edit") {
      var query = address.indexOf("?") >= 0 ? address.substring(address.indexOf("?")) : "";
      return this.ToAppPage("/content/custom/edit.json" + query, address, push, InitCustomEditor, hash);
    }
    if (path === "/custom") {
      return this.ToAppPage("/content/custom.json", address, push, InitCustomIndex, hash);
    }
    if (path === "/websearch") {
      var searchQuery = address.indexOf("?") >= 0 ? address.substring(address.indexOf("?")) : "";
      return this.ToAppPage("/content/websearch.json" + searchQuery, address, push, null, hash);
    }

    var newData;
    this.pageTitle2.innerText = "Loading..";
    this.pageContent.parentElement.classList.add("loading");

    fetch(`/content${address.toLowerCase()}.json`, { method: "GET" })
      .then((r) => r.json())
      .then((json) => {
        // Never render `undefined`: missing/invalid payloads get a fallback page
        if (!json || typeof json.html !== "string") {
          json = {
            html:
              "<h1>Not Found</h1><p>This page is missing.</p>" +
              '<p>You can <a href="/custom/edit?address=' +
              encodeURIComponent(address.replace(/^\//, "")) +
              '">create it as a custom page</a>.</p>',
            title: "Page Not Found",
            address: address.replace(/^\//, ""),
            footer: "",
          };
        }
        newData = json;
      })
      .catch((e) => {
        newData = {
          html:
            "Failed to load page <b>" +
            address +
            "</b>" +
            (e ? "<p>" + e.toString() + "</p>" : ""),
          title: "Failed to load page",
          footer: "",
        };

        console.warn("Failed to fetch " + address);
      })
      .then(() => {
        if (push) {
          history.pushState({}, "", address + hash);
        }

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          this.UpdatePage(newData);
          this.pageContent.parentElement.classList.remove("loading");

          requestAnimationFrame(() => {
            this.ScrollToAnchor(hash);
            this.UpdateSidebar();
            if (window.innerWidth <= 780) {
              var e = document.getElementById("sidebar");
              e.classList.remove("visible");
            }
          });
        });
      });

    return false;
  }

  static ScrollToAnchor(hash) {
    if (!hash || hash.length < 2) return;
    var name = hash.substring(1);
    var el = document.getElementById(name) || document.getElementsByName(name)[0];
    if (el) el.scrollIntoView();
  }

  static ToAppPage(jsonUrl, address, push, init, hash) {
    this.pageTitle2.innerText = "Loading..";
    this.pageContent.parentElement.classList.add("loading");

    fetch(jsonUrl, { method: "GET" })
      .then((r) => r.json())
      .then((json) => {
        if (push) history.pushState({}, "", address + (hash || ""));

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          this.UpdatePage(json);
          this.pageContent.parentElement.classList.remove("loading");

          requestAnimationFrame(() => {
            if (init) init();
            this.ScrollToAnchor(hash);
            this.UpdateSidebar();
            if (window.innerWidth <= 780) {
              document.getElementById("sidebar").classList.remove("visible");
            }
          });
        });
      })
      .catch(() => {
        // endpoint unavailable вЂ” fall back to the full page load
        window.location.href = address;
      });

    return false;
  }

  static UpdatePage(json) {
    requestAnimationFrame(() => {
      this.pageContent.innerHTML = json.html;
      this.pageTitle.innerText = json.title;
      this.pageFooter.innerHTML = json.footer;
      this.pageTitle2.innerText = "";
      UpdateToolbar();

      requestAnimationFrame(() => {
        var a = document.createElement("a");
        a.classList.add("parent");
        a.text = "Home";
        a.href = "/";
        this.pageTitle2.appendChild(a);
        this.pageTitle2.append("/");
        var a2 = document.createElement("a");
        a2.text = json.title;
        a2.href = `/${json.address}`;
        this.pageTitle2.appendChild(a2);
        var title = json.title + " - Garry's Mod Wiki";
        title = title.replace("Garry's Mod Wiki - ", ""); // Fix for the home page
        document.title = title;
      });
    });
  }

  static UpdateSidebar() {
    let links = this.links;
    let address = location.href;
    if (address.indexOf("#") > 0)
      address = address.substring(0, address.indexOf("#"));

    // While editing an existing page, its sidebar entry stays highlighted
    if (location.pathname.toLowerCase().replace(/\/$/, "") === "/custom/edit") {
      var editAddr = new URLSearchParams(location.search).get("address");
      if (editAddr) address = new URL("/" + editAddr, location.origin).href;
    }

    // Same on a page's history or diff view: highlight the page itself
    var historyView = /^(.*)~(history|diff:\d+)$/i.exec(location.pathname);
    if (historyView) address = location.origin + historyView[1];

    for (var i = 0; i < links.length; i++) {
      var a = links[i];

      if (a.href == address) {
        a.classList.add("active");
        var parent = a.parentElement;
        while (parent != null) {
          if (parent.tagName == "DETAILS") {
            var d = parent;
            d.open = true;
          }
          parent = parent.parentElement;
        }
      } else {
        if (a.classList.contains("active")) {
          a.classList.remove("active");
        }
      }
    }
    var details = this.details;
    for (var i = 0; i < details.length; i++) {
      if (a.classList.contains("active")) {
        a.classList.remove("active");
      }
    }
  }

  static OnNavigated(event) {
    // the hash is kept: ToPage strips it and scrolls to the anchor after swap
    this.ToPage(document.location.href, false);
  }

  static Install() {
    this.Init();
    window.onpopstate = (e) => this.OnNavigated(e);

    if (this.pageContent == null) return true;

    // Hard loads have no active link marked server-side вЂ” highlight (and
    // reveal) the current page's sidebar entry right away.
    this.UpdateSidebar();

    var thisHost = window.location.host;
    // Links that must never go through the JSON content loader: anchors,
    // special pages, anything with a query string, and the API. The app
    // pages вЂ” the editor (/custom/edit) and the custom-pages index
    // (/custom) вЂ” are exceptions: ToPage routes them through the
    // client-side content swap.
    var skipNav = (val) => {
      var path = val.split(/[?#]/)[0].replace(/\/$/, "");
      if (path === "/custom/edit" || path === "/custom" || path === "/websearch") return false;
      // page history and revision diffs are regular content-swap pages
      if (/~(history|diff:\d+)$/i.test(path)) return false;
      // same-page fragments jump natively; cross-page anchors ("/Page#x")
      // go through the content swap and scroll after it
      if (val.charAt(0) === "#") return true;
      return (
        val.indexOf("~") >= 0 ||
        val.indexOf("?") >= 0 ||
        val.indexOf("/custom") === 0 ||
        val.indexOf("/api/") === 0
      );
    };

    // The header Live/Edit button: "Edit" (custom pages) opens the editor
    // in-place; "Live" (official pages) keeps its external link behaviour.
    if (this.liveButton) {
      this.liveButton.addEventListener("click", (e) => {
        var href = this.liveButton.getAttribute("href") || "";
        if (
          href.indexOf("/custom/edit") === 0 &&
          !(e.ctrlKey || e.shiftKey || e.altKey)
        ) {
          e.preventDefault();
          Navigate.ToPage(href);
        }
      });
    }

    // clicks often land on elements INSIDE the link (icons, <strong>, the
    // realm dot) — climb to the anchor itself before deciding anything
    var linkOf = (e) =>
      e.target && e.target.closest ? e.target.closest("a") : e.target;

    this.sideBar.addEventListener("click", (e) => {
      var a = linkOf(e);
      if (!a) return;

      if (a.host != thisHost) return;

      let val = a.getAttribute("href");
      if (val == null || val == "") return;

      if (skipNav(val)) return;

      if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
        Navigate.ToPage(val);
        e.preventDefault();
      }
    });

    this.pageContent.addEventListener("click", (e) => {
      var a = linkOf(e);
      if (!a) return;

      if (a.host != thisHost) return;

      if (a.tagName !== "A") return;

      let val = a.getAttribute("href");
      if (val == null || val == "") return;

      if (skipNav(val)) return;

      if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
        Navigate.ToPage(val);
        e.preventDefault();
      }
    });
  }
}
Navigate.cache = {};

class Parser {
  constructor(rules) {
    this.parseRE = null;
    this.ruleSrc = [];
    this.ruleMap = {};
    this.add(rules);
  }
  add(rules) {
    for (var rule in rules) {
      var s = rules[rule].source;
      this.ruleSrc.push(s);
      this.ruleMap[rule] = new RegExp("^(" + s + ")$", "i");
    }
    this.parseRE = new RegExp(this.ruleSrc.join("|"), "gmi");
  }
  tokenize(input) {
    return input.match(this.parseRE);
  }
  identify(token) {
    for (var rule in this.ruleMap) {
      if (this.ruleMap[rule].test(token)) {
        return rule;
      }
    }
  }
}
class TextareaDecorator {
  constructor(textarea, display, parser) {
    this.input = textarea;
    this.output = display;
    this.parser = parser;
  }
  color(input, output, parser) {
    var oldTokens = output.childNodes;
    var newTokens = parser.tokenize(input);
    var firstDiff, lastDiffNew, lastDiffOld;
    for (
      firstDiff = 0;
      firstDiff < newTokens.length && firstDiff < oldTokens.length;
      firstDiff++
    )
      if (newTokens[firstDiff] !== oldTokens[firstDiff].textContent) break;
    while (newTokens.length < oldTokens.length)
      output.removeChild(oldTokens[firstDiff]);
    for (
      lastDiffNew = newTokens.length - 1, lastDiffOld = oldTokens.length - 1;
      firstDiff < lastDiffOld;
      lastDiffNew--, lastDiffOld--
    )
      if (newTokens[lastDiffNew] !== oldTokens[lastDiffOld].textContent) break;
    for (; firstDiff <= lastDiffOld; firstDiff++) {
      oldTokens[firstDiff].className = parser.identify(newTokens[firstDiff]);
      oldTokens[firstDiff].textContent = oldTokens[firstDiff].innerText =
        newTokens[firstDiff];
    }
    for (
      var insertionPt = oldTokens[firstDiff] || null;
      firstDiff <= lastDiffNew;
      firstDiff++
    ) {
      var span = document.createElement("span");
      span.className = parser.identify(newTokens[firstDiff]);
      span.textContent = span.innerText = newTokens[firstDiff];
      output.insertBefore(span, insertionPt);
    }
  }
  update() {
    var input = textarea.value;
    if (input) {
      this.color(input, this.output, this.parser);
    } else {
      this.output.innerHTML = "";
    }
  }
}

window.ToggleClass = function (element, classname) {
  var e = document.getElementById(element);
  if (e.classList.contains(classname)) e.classList.remove(classname);
  else e.classList.add(classname);
};

window.CopyCode = function (event) {
  var code = event.target.closest("div.code").innerText;
  navigator.clipboard.writeText(code).then(() => {
    var btn = event.target.closest("copy");
    var icn = btn.querySelector(".mdi");
    icn.classList.replace("mdi-content-copy", "mdi-check");
    btn.classList.add("copied");
    clearTimeout(icn.copyTimeout);
    icn.copyTimeout = setTimeout(function () {
      icn.classList.replace("mdi-check", "mdi-content-copy");
      btn.classList.remove("copied");
    }, 5000);
  });
  event.preventDefault();
};

var SearchInput;
var SearchResults;
var SidebarContents;
var MaxResultCount = 200;
var ResultCount = 0;
var SearchDelay = null;
function InitSearch() {
  SearchInput = document.getElementById("search");
  SearchResults = document.getElementById("searchresults");
  SidebarContents = document.getElementById("contents");
  SearchInput.addEventListener("input", (e) => {
    clearTimeout(SearchDelay);
    SearchDelay = setTimeout(UpdateSearch, 10);
  });
  SearchInput.addEventListener("keyup", (e) => {
    if (e.keyCode == 13) {
      Navigate.ToPage("/websearch?query=" + encodeURIComponent(SearchInput.value));
    }
  });
}

function UpdateSearch(limitResults = true) {
  const limitedResultCount = 500;

  if (limitResults) MaxResultCount = limitedResultCount;
  else MaxResultCount = 2000;
  var child = SearchResults.lastElementChild;
  while (child) {
    SearchResults.removeChild(child);
    child = SearchResults.lastElementChild;
  }
  var string = SearchInput.value;
  var tags = [];
  var searchTerms = string.split(" ");
  searchTerms.forEach((str) => {
    if (str.startsWith("is:") || str.startsWith("not:")) {
      tags.push(str);
      string = string.replace(str, "");
    }
  });
  if (string.length < 2) {
    SidebarContents.classList.remove("searching");
    SearchResults.classList.remove("searching");
    var sidebar = document.getElementById("sidebar");
    var active = sidebar.getElementsByClassName("active");
    if (active.length == 1) {
      active[0].scrollIntoView({ block: "center" });
    }
    return;
  }
  SidebarContents.classList.add("searching");
  SearchResults.classList.add("searching");
  ResultCount = 0;
  Titles = [];
  TitleCount = 0;
  SectionHeader = null;
  if (string.toUpperCase() == string && string.indexOf("_") != -1) {
    string = string.substring(0, string.indexOf("_"));
  }
  var parts = string.split(" ");
  var q = "";
  for (var i in parts) {
    if (parts[i].length < 1) continue;
    var t = parts[i].replace(/([^a-zA-Z0-9_-])/g, "\\$1");
    q += ".*(" + t + ")";
  }
  q += ".*";
  var regex = new RegExp(q, "gi");
  SearchRecursive(regex, SidebarContents, tags);
  if (limitResults && ResultCount > MaxResultCount) {
    var moreresults = document.createElement("a");
    moreresults.href = "#";
    moreresults.classList.add("noresults");
    moreresults.innerHTML =
      ResultCount - limitedResultCount + " more results - show more?";
    moreresults.onclick = (e) => {
      UpdateSearch(false);
      return false;
    };
    SearchResults.append(moreresults);
  }
  AddFullSearchCTA(SearchInput.value);
}
function AddFullSearchCTA(query) {
  if (!query || query.trim().length < 2) return;
  var hadResults = SearchResults.querySelectorAll("a, .sectionheader").length > 0;

  var cta = document.createElement("a");
  cta.href = "/websearch?query=" + encodeURIComponent(query);
  cta.classList.add("full-search-cta");
  if (!hadResults) cta.classList.add("full-search-cta-empty");
  cta.innerHTML =
    '<span class="mdi mdi-magnify"></span> Search all pages for ' +
    '<strong>"' + query.replace(/</g, "&lt;") + '"</strong>' +
    '<span class="full-search-hint">&#8629; Enter</span>';
  cta.onclick = function (e) {
    // clicks on inner elements (<strong>, the icon) bypass the sidebar's
    // link interceptor, and stopPropagation avoids a double ToPage from it
    e.stopPropagation();
    Navigate.ToPage("/websearch?query=" + encodeURIComponent(query));
    return false;
  };
  SearchResults.appendChild(cta);
}
var SectionHeader;
var TitleCount = 0;
var Titles = [];
function SearchRecursive(str, el, tags) {
  var title = null;
  if (el.children.length > 0 && el.children[0].tagName == "SUMMARY") {
    title = el.children[0].children[0];
    Titles.push(title);
    TitleCount++;
  }
  var children = el.children;
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.className == "sectionheader") SectionHeader = child;
    if (child.tagName == "A") {
      if (child.parentElement.tagName == "SUMMARY") continue;
      var txt = child.getAttribute("search");
      if (txt == null) continue;
      var found = txt.match(str);
      if (found && tags.length > 0) {
        var niceTags = {
          server: "rs",
          sv: "rs",
          client: "rc",
          cl: "rc",
          menu: "rm",
          mn: "rm",
          deprecated: "depr",
          internal: "intrn",
        };
        tags.forEach((str) => {
          var classSearch = str.split(":").slice(1)[0];
          if (niceTags[classSearch]) classSearch = niceTags[classSearch];
          if (
            str.startsWith("is:") &&
            classSearch != null &&
            !child.classList.contains(classSearch)
          ) {
            found = null;
          }
          if (
            str.startsWith("not:") &&
            classSearch != null &&
            child.classList.contains(classSearch)
          ) {
            found = null;
          }
        });
      }
      if (found) {
        if (ResultCount < MaxResultCount) {
          AddSearchTitle();
          var copy = child.cloneNode(true);
          copy.onclick = (e) => Navigate.ToPage(copy.href, true);
          copy.classList.add("node" + TitleCount);
          SearchResults.appendChild(copy);
        }
        ResultCount++;
      }
    }
    SearchRecursive(str, child, tags);
  }
  if (title != null) {
    TitleCount--;
    if (Titles[Titles.length - 1] == title) {
      Titles.pop();
    }
  }
}
function AddSearchTitle() {
  if (Titles.length == 0) return;
  if (SectionHeader != null) {
    var copy = SectionHeader.cloneNode(true);
    SearchResults.appendChild(copy);
    SectionHeader = null;
  }
  for (var i = 0; i < Titles.length; i++) {
    var cpy = Titles[i].cloneNode(true);
    if (cpy.href) {
      cpy.onclick = (e) => Navigate.ToPage(cpy.href, true);
    }
    cpy.className = "node" + (TitleCount - Titles.length + i);
    SearchResults.appendChild(cpy);
  }
  Titles = [];
}

window.addEventListener("keydown", (e) => {
  if (e.keyCode != 191) return;
  const tagName = document.activeElement.tagName;
  if (tagName == "INPUT") return;
  if (tagName == "TEXTAREA") return;
  SearchInput.focus();
  SearchInput.value = "";
  e.preventDefault();
});

// ---- persistent sidebar state --------------------------------------------
// Full page loads (opening the custom-page editor, saving a page, F5) used to
// reset the sidebar: open categories collapsed and the quick-search cleared.
// A snapshot (open/closed state of every category, search text, scroll
// position) is stored on pagehide and restored on the next load. Categories
// are keyed by the path of their summary titles, so the snapshot survives
// sidebar rebuilds and applies to the async-built Custom Wiki section too.
var SIDEBAR_STATE_KEY = "gmodwiki-sidebar-state";

function sidebarDetailsKey(d) {
  var parts = [];
  var node = d;
  while (node && node.id !== "sidebar") {
    if (node.tagName === "DETAILS") {
      var s = node.firstElementChild;
      parts.unshift(s && s.tagName === "SUMMARY" ? s.textContent.trim() : "?");
    }
    node = node.parentElement;
  }
  return parts.join(">");
}

function saveSidebarState() {
  try {
    var sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    var open = {};
    var details = sidebar.getElementsByTagName("details");
    for (var i = 0; i < details.length; i++) {
      open[sidebarDetailsKey(details[i])] = details[i].open;
    }
    // #contents (the category tree) and #searchresults are the actual
    // scrollable panes inside the sidebar
    var contents = document.getElementById("contents");
    var results = document.getElementById("searchresults");
    localStorage.setItem(
      SIDEBAR_STATE_KEY,
      JSON.stringify({
        open: open,
        search: SearchInput ? SearchInput.value : "",
        scroll: contents ? contents.scrollTop : 0,
        resultsScroll: results ? results.scrollTop : 0,
      }),
    );
  } catch (e) {}
}

function loadSidebarState() {
  try {
    var raw = localStorage.getItem(SIDEBAR_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Re-applies the saved open/closed state to every category currently in the
// DOM. Runs on load and again after the Custom Wiki section is built.
function applySidebarOpenState() {
  var state = loadSidebarState();
  if (!state || !state.open) return;
  var sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  var details = sidebar.getElementsByTagName("details");
  for (var i = 0; i < details.length; i++) {
    var key = sidebarDetailsKey(details[i]);
    if (key in state.open) details[i].open = state.open[key];
  }
}

function applySidebarScroll() {
  var state = loadSidebarState();
  if (!state) return false;
  var contents = document.getElementById("contents");
  var results = document.getElementById("searchresults");
  if (contents && typeof state.scroll === "number") contents.scrollTop = state.scroll;
  if (results && typeof state.resultsScroll === "number") results.scrollTop = state.resultsScroll;
  return (state.scroll || 0) > 0 || (state.resultsScroll || 0) > 0;
}

// Restores the quick-search text (needs InitSearch to have run). Returns
// whether anything was restored, so the caller can fall back to the default
// "scroll active link into view" behaviour.
function applySidebarSearch() {
  var state = loadSidebarState();
  if (!state || !state.search || !SearchInput) return false;
  SearchInput.value = state.search;
  UpdateSearch();
  return true;
}

window.addEventListener("pagehide", saveSidebarState);

// Custom pages carry an invisible #custom-page-marker element: on them the
// header "Live" button (which links to the official wiki) becomes an "Edit"
// button opening the page in the custom-page editor.
// Rebuilds the toolbar tabs for the current context, matching the official
// wiki: custom pages (and their editor/history/diff views) get View / Edit /
// History with the current view highlighted (nothing highlighted on diffs),
// official pages keep Live + Copy, app pages (/custom, new-page editor) get
// neither.
function UpdateToolbar() {
  var liveButton = document.getElementById("live-button");
  if (!liveButton) return;
  var liveLi = liveButton.parentElement;
  var copyButton = document.getElementById("copy-button");
  var copyLi = copyButton ? copyButton.parentElement : null;

  ["view-button-li", "edit-button-li", "history-button-li"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });

  var path = location.pathname;
  var marker = document.getElementById("custom-page-marker");
  var address = null;
  var active = null;
  var appPage = false;
  var el;

  if (marker) {
    address = marker.getAttribute("data-address") || "";
    active = "view";
  } else if ((el = document.querySelector("#pagecontent [data-history-of]"))) {
    address = el.getAttribute("data-history-of");
    active = "history";
  } else if ((el = document.querySelector("#pagecontent [data-diff-of]"))) {
    address = el.getAttribute("data-diff-of");
    active = null; // the official wiki highlights no tab on diff views
  } else if (/^\/custom\/edit\/?$/i.test(path)) {
    var addressInput = document.getElementById("page-address");
    if (addressInput && addressInput.hasAttribute("readonly") && addressInput.value) {
      address = addressInput.value;
      active = "edit";
    } else {
      appPage = true; // creating a brand-new page
    }
  } else if (/^\/custom\/?$/i.test(path)) {
    appPage = true;
  }

  if (address !== null) {
    liveLi.style.display = "none";
    if (copyLi) copyLi.style.display = "none";

    var tabs = [
      { id: "view", icon: "mdi-file", label: "View", href: "/" + address },
      { id: "edit", icon: "mdi-pencil", label: "Edit", href: "/custom/edit?address=" + encodeURIComponent(address) },
      { id: "history", icon: "mdi-history", label: "History", href: "/" + address + "~history" },
    ];
    var ul = liveLi.parentElement;
    tabs.forEach(function (tab) {
      var li = document.createElement("li");
      li.id = tab.id + "-button-li";
      var a = document.createElement("a");
      a.id = tab.id + "-button";
      a.href = tab.href;
      if (active === tab.id) a.className = "active";
      a.innerHTML = '<i class="mdi ' + tab.icon + '"></i>' + tab.label;
      a.onclick = function () {
        if (active !== tab.id) Navigate.ToPage(tab.href);
        return false;
      };
      li.appendChild(a);
      ul.insertBefore(li, liveLi); // before the hidden Live entry: View, Edit, History
    });
  } else if (appPage) {
    liveLi.style.display = "none";
    if (copyLi) copyLi.style.display = "none";
  } else {
    liveLi.style.display = "";
    if (copyLi) copyLi.style.display = "";
    liveButton.innerHTML = '<i class="mdi mdi-history"></i>Live';
    liveButton.href = "https://wiki.facepunch.com/gmod" + window.location.pathname;
    liveButton.target = "_blank";
  }
}

// Builds the "Custom Wiki" sidebar section from the database-backed custom
// pages/categories. Category names use "/" for nesting (e.g. "MyAddon/Hooks").
// Links get a `search` attribute so the sidebar quick-search finds them.
function InitCustomSidebar(replace) {
  if (!replace && document.getElementById("custom-wiki-section")) return;
  Promise.all([
    fetch("/api/custom/pages").then((r) => (r.ok ? r.json() : null)),
    fetch("/api/custom/categories").then((r) => (r.ok ? r.json() : null)),
  ])
    .then(([pagesData, catsData]) => {
      if (!pagesData || !pagesData.pages) return;
      var pages = pagesData.pages;
      var cats = catsData && catsData.categories ? catsData.categories : [];
      if (pages.length === 0 && cats.length === 0) return;

      var root = { children: {}, pages: [] };
      function ensure(path) {
        var node = root;
        if (!path) return node;
        var parts = path.split("/");
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i].trim();
          if (!part) continue;
          if (!node.children[part]) node.children[part] = { children: {}, pages: [] };
          node = node.children[part];
        }
        return node;
      }
      cats.forEach(function (c) {
        ensure(c.name);
      });
      pages.forEach(function (p) {
        ensure(p.category).pages.push(p);
      });

      var pageByAddress = {};
      pages.forEach(function (p) {
        pageByAddress[p.address.toLowerCase()] = p;
      });

      // A category whose path (or any suffix of it, down to the leaf name)
      // matches a page's address is "page-backed": like the original's class
      // entries (e.g. Classes > Angle), its summary links to that page and
      // the page is not repeated in the child list. Suffix matching lets a
      // page at "Systems/TISU" own the "Trolleybus System/Systems/TISU" node.
      function ownerPageFor(path, name) {
        var parts = path.split("/");
        for (var i = 0; i < parts.length; i++) {
          var owner = pageByAddress[parts.slice(i).join("/").toLowerCase()];
          if (owner) return owner;
        }
        return pageByAddress[name.toLowerCase()] || null;
      }
      var usedAsCategory = {};
      (function markUsed(node, path) {
        for (var k in node.children) {
          var childPath = path ? path + "/" + k : k;
          var owner = ownerPageFor(childPath, k);
          if (owner) usedAsCategory[owner.address.toLowerCase()] = true;
          markUsed(node.children[k], childPath);
        }
      })(root, "");

      function hasTag(p, tag) {
        return (" " + (p.tags || "") + " ").indexOf(" " + tag + " ") >= 0;
      }

      // Same classes the original sidebar uses: cm = member dot, f =
      // function, rc/rs/rm = realm colors, e = has example. Any page that
      // declares a <realm> gets the colored dot, not only functions.
      function leafClasses(p) {
        var hasRealm = hasTag(p, "realm-client") || hasTag(p, "realm-server") || hasTag(p, "realm-menu");
        var isMember = hasTag(p, "function") || hasTag(p, "enum") || hasTag(p, "struct") || hasTag(p, "panel");
        if (!isMember && !hasRealm) return "";
        var cls = ["cm"];
        if (hasTag(p, "function")) cls.push("f");
        if (hasTag(p, "realm-client")) cls.push("rc");
        if (hasTag(p, "realm-server")) cls.push("rs");
        if (hasTag(p, "realm-menu")) cls.push("rm");
        if (hasTag(p, "example")) cls.push("e");
        return cls.join(" ");
      }

      function makeLink(p, className, text) {
        var a = document.createElement("a");
        if (className) a.className = className;
        a.href = "/" + p.address;
        a.setAttribute("search", p.title + " " + p.address);
        a.textContent = text || p.title;
        return a;
      }

      function visiblePagesOf(node) {
        return node.pages.filter(function (p) {
          return !usedAsCategory[p.address.toLowerCase()];
        });
      }

      function render(node, name, path, level) {
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        var childKeys = Object.keys(node.children).sort();
        var visiblePages = visiblePagesOf(node);
        var owner = ownerPageFor(path, name);

        if (owner) {
          // Original class-style entry: <details class="level2 cm type e"><summary><a ...>
          var typeCls = "cm type" + (hasTag(owner, "example") ? " e" : "");
          details.className = "level" + level + " " + typeCls;
          summary.appendChild(makeLink(owner, typeCls, name));
        } else if (level >= 2) {
          // Subcategories always match the class-entry look, even without a
          // backing page; an <a> without href just toggles the details.
          details.className = "level" + level + " cm type";
          var plain = document.createElement("a");
          plain.className = "cm type";
          plain.textContent = name;
          summary.appendChild(plain);
        } else {
          details.className = "level" + level;
          var div = document.createElement("div");
          var icon = document.createElement("i");
          icon.className = "mdi mdi-folder";
          div.appendChild(icon);
          div.appendChild(document.createTextNode(" " + name + " "));
          var count = document.createElement("span");
          count.className = "child-count";
          count.textContent = childKeys.length + visiblePages.length;
          div.appendChild(count);
          summary.appendChild(div);
        }
        details.appendChild(summary);

        var ul = document.createElement("ul");
        childKeys.forEach(function (k) {
          var li = document.createElement("li");
          li.appendChild(render(node.children[k], k, path ? path + "/" + k : k, level + 1));
          ul.appendChild(li);
        });
        visiblePages
          .sort(function (a, b) {
            return a.title.localeCompare(b.title);
          })
          .forEach(function (p) {
            var li = document.createElement("li");
            li.appendChild(makeLink(p, leafClasses(p)));
            ul.appendChild(li);
          });
        if (ul.children.length > 0) details.appendChild(ul);
        return details;
      }

      var contents = document.getElementById("contents");
      if (!contents) return;
      if (!replace && document.getElementById("custom-wiki-section")) return;
      var header = document.createElement("div");
      header.className = "sectionheader";
      header.id = "custom-wiki-header";
      header.textContent = "Custom Wiki";
      var section = document.createElement("div");
      section.className = "section";
      section.id = "custom-wiki-section";
      var keys = Object.keys(root.children).sort();
      for (var i = 0; i < keys.length; i++) {
        section.appendChild(render(root.children[keys[i]], keys[i], keys[i], 1));
      }
      if (visiblePagesOf(root).length > 0) {
        section.appendChild(render({ children: {}, pages: root.pages }, "Uncategorized", "", 1));
      }
      var oldHeader = document.getElementById("custom-wiki-header");
      var oldSection = document.getElementById("custom-wiki-section");
      if (oldSection) {
        // Refresh after a save/delete: snapshot the LIVE sidebar state first,
        // swap the section in place (the sidebar never shrinks, so the scroll
        // position can't clamp), then restore that exact state onto the fresh
        // nodes вЂ” open categories, search, scroll all stay put.
        saveSidebarState();
        if (oldHeader) oldHeader.replaceWith(header);
        else contents.insertBefore(header, oldSection);
        oldSection.replaceWith(section);
        applySidebarOpenState();
        applySidebarScroll();
        if (Navigate.pageContent) Navigate.UpdateSidebar();
      } else {
        contents.appendChild(header);
        contents.appendChild(section);

        // The freshly built section starts collapsed вЂ” re-apply the saved
        // sidebar state to it, and highlight the current page if its link
        // lives in this section (a custom page opened via full load builds
        // the sidebar in either order relative to Navigate.Install).
        applySidebarOpenState();
        if (Navigate.pageContent) Navigate.UpdateSidebar();
        if (!applySidebarScroll()) {
          var active = document.getElementById("sidebar").getElementsByClassName("active");
          if (active.length == 1) active[0].scrollIntoView({ block: "center" });
        }
      }
    })
    .catch(function (e) {
      console.warn("custom sidebar unavailable", e);
    });
}

// Rebuilds the Custom Wiki sidebar section from the API вЂ” called after a page
// or category changes, so the sidebar updates without any reload. The section
// is swapped atomically and the live sidebar state (open categories, search,
// scroll) is carried over.
function RefreshCustomSidebar() {
  InitCustomSidebar(true);
}

// Wires up the custom-pages index (/custom): delete buttons and the
// new-category form. Runs on direct loads and after Navigate swaps the index
// into #pagecontent. No-op on other pages.
function InitCustomIndex() {
  var form = document.getElementById("new-category-form");
  if (!form) return;

  // Instead of location.reload(): re-render the index in place and refresh
  // the sidebar section вЂ” nothing else on the page moves.
  var rerender = () => {
    RefreshCustomSidebar();
    Navigate.ToPage("/custom", false);
  };

  document.querySelectorAll(".page-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const address = btn.dataset.address;
      if (!confirm(`Delete page '${address}'? This cannot be undone.`)) return;
      try {
        const res = await fetch("/api/custom/pages/" + encodeURIComponent(address), { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        rerender();
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    });
  });

  document.querySelectorAll(".cat-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = btn.dataset.name;
      if (!confirm(`Delete category '${name}' (including its subcategories)?`)) return;
      try {
        let res = await fetch("/api/custom/categories?name=" + encodeURIComponent(name), { method: "DELETE" });
        let data = await res.json();
        if (res.status === 409 && data.pagesInTree) {
          if (!confirm(`Category '${name}' still contains ${data.pagesInTree} page(s), including subcategories. Delete the pages too?`)) return;
          res = await fetch("/api/custom/categories?name=" + encodeURIComponent(name) + "&pages=1", { method: "DELETE" });
          data = await res.json();
        }
        if (!res.ok) throw new Error(data.error || res.statusText);
        rerender();
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("category-status");
    status.textContent = "Saving...";
    try {
      const res = await fetch("/api/custom/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("category-name").value,
          description: document.getElementById("category-description").value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      rerender();
    } catch (err) {
      status.textContent = "Error: " + err.message;
    }
  });
}

// Wires up the custom-page editor (preview, save, delete). Runs on direct
// loads of /custom/edit and after Navigate.ToEditor swaps the editor into
// #pagecontent (innerHTML-injected scripts never execute, so the logic lives
// here). No-op on pages without the editor.
function InitCustomEditor() {
  var addressInput = document.getElementById("page-address");
  var markupInput = document.getElementById("page-markup");
  if (!addressInput || !markupInput) return;

  var titleInput = document.getElementById("page-title");
  var categoryInput = document.getElementById("page-category");
  var commitInput = document.getElementById("page-commit");
  var authorInput = document.getElementById("page-author");
  var preview = document.getElementById("preview");
  var status = document.getElementById("editor-status");
  var isEdit = addressInput.hasAttribute("readonly");

  // the author name is remembered per browser and pre-filled on later edits
  try {
    var savedAuthor = localStorage.getItem("gmodwiki-author");
    if (savedAuthor) authorInput.value = savedAuthor;
  } catch (e) {}

  var previewTimer = null;

  async function updatePreview() {
    try {
      const res = await fetch("/api/custom/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          markup: markupInput.value,
          address: addressInput.value.trim(),
          title: titleInput.value,
          category: categoryInput.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      preview.innerHTML = data.html || "<i>Nothing to preview yet.</i>";
    } catch (err) {
      preview.innerHTML = "<i>Preview failed: " + err.message + "</i>";
    }
  }

  markupInput.addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 600);
  });
  updatePreview();

  document.getElementById("save-button").addEventListener("click", async () => {
    const address = addressInput.value.trim();
    if (!address) {
      status.textContent = "Address is required.";
      return;
    }

    status.textContent = "Saving...";
    const author = authorInput.value.trim() || "Anon";
    try {
      localStorage.setItem("gmodwiki-author", author);
    } catch (e) {}
    const body = JSON.stringify({
      address,
      title: titleInput.value,
      category: categoryInput.value,
      markup: markupInput.value,
      commitMessage: commitInput.value.trim() || (isEdit ? "Minor Change" : "Created Page"),
      author,
    });

    try {
      const res = await fetch(
        isEdit
          ? "/api/custom/pages/" + encodeURIComponent(address).replaceAll("%2F", "/")
          : "/api/custom/pages",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      status.textContent = "Saved!";
      // swap straight to the saved page вЂ” no reload, the sidebar keeps its
      // state вЂ” and refresh the Custom Wiki section (page may be new)
      RefreshCustomSidebar();
      Navigate.ToPage("/" + data.page.address);
    } catch (err) {
      status.textContent = "Error: " + err.message;
    }
  });

  const deleteButton = document.getElementById("delete-button");
  if (deleteButton) {
    deleteButton.addEventListener("click", async () => {
      if (!confirm("Delete this custom page? This cannot be undone.")) return;
      status.textContent = "Deleting...";
      try {
        const address = addressInput.value.trim();
        const res = await fetch(
          "/api/custom/pages/" + encodeURIComponent(address).replaceAll("%2F", "/"),
          { method: "DELETE" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        // swap to the custom-pages index вЂ” no reload, the sidebar keeps
        // its state вЂ” and drop the deleted page from the sidebar section
        RefreshCustomSidebar();
        Navigate.ToPage("/custom");
      } catch (err) {
        status.textContent = "Error: " + err.message;
      }
    });
  }
}

// The main init chain runs inside requestAnimationFrame after `load`, which
// browsers suspend in hidden tabs вЂ” build the custom sidebar, the editor and
// the Live/Edit button independently so they work as soon as the DOM is ready.
function InitCustomExtras() {
  InitCustomSidebar();
  InitCustomEditor();
  InitCustomIndex();
  UpdateToolbar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", InitCustomExtras);
} else {
  InitCustomExtras();
}

function getTimeSince(utcTimestamp) {
  const now = new Date().getTime();
  const diffInMilliseconds = now - utcTimestamp;
  const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
  const days = Math.floor(diffInHours / 24);
  const hours = Math.floor(diffInHours % 24);

  let result = "";
  if (days > 0) result += `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0)
    result += `${result ? ", " : ""}${hours} hour${hours > 1 ? "s" : ""}`;
  return (result || "<1 hour") + " ago";
}

function setupLastParsed() {
  const lastParseElement = document.getElementById("last-parse");
  if (!lastParseElement) return; // mirror notice hidden via HIDE_MIRROR_NOTICE

  fetch("/last_build.txt", { method: "GET" })
    .then((r) => {
      r.text().then(
        (t) => (lastParseElement.textContent = getTimeSince(parseInt(t, 10))),
      );
    })
    .catch((e) => {
      console.warn("Failed to fetch last parsed date", e);
      lastParseElement.textContent = "Unknown";
    });
}

window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    applySidebarOpenState();
    UpdateToolbar();

    requestAnimationFrame(() => {
      InitSearch();
      Navigate.Install();
      setupLastParsed();
      InitCustomSidebar();

      // restore the search text and scroll position; without a saved state
      // fall back to centering the active page link like before
      var searchRestored = applySidebarSearch();
      var scrollRestored = applySidebarScroll();
      if (!searchRestored && !scrollRestored) {
        var sidebar = document.getElementById("sidebar");
        var active = sidebar.getElementsByClassName("active");
        if (active.length == 1) {
          active[0].scrollIntoView({ smooth: true, block: "center" });
        }
      }
    });
  });
});

