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
          history.pushState({}, "", address);
        }

        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          this.UpdatePage(newData);
          this.pageContent.parentElement.classList.remove("loading");

          requestAnimationFrame(() => {
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

  static UpdatePage(json) {
    requestAnimationFrame(() => {
      this.pageContent.innerHTML = json.html;
      this.pageTitle.innerText = json.title;
      this.pageFooter.innerHTML = json.footer;
      this.pageTitle2.innerText = "";
      UpdateLiveButton();

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
    let address = document.location.href;
    if (address.indexOf("#") > 0)
      address = address.substring(0, address.indexOf("#"));

    this.ToPage(address, false);
  }

  static Install() {
    this.Init();
    window.onpopstate = (e) => this.OnNavigated(e);

    if (this.pageContent == null) return true;

    var thisHost = window.location.host;
    // Links that must never go through the JSON content loader: anchors,
    // special pages, anything with a query string, and app pages like the
    // custom-page editor or the API.
    var skipNav = (val) =>
      val.indexOf("#") >= 0 ||
      val.indexOf("~") >= 0 ||
      val.indexOf("?") >= 0 ||
      val.indexOf("/custom") === 0 ||
      val.indexOf("/api/") === 0;

    this.sideBar.addEventListener("click", (e) => {
      var a = e.target;

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
      var a = e.target;

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
      window.location.href = "/websearch?query=" + SearchInput.value;
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
  cta.onclick = function () {
    window.location.href = "/websearch?query=" + encodeURIComponent(query);
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

// Custom pages carry an invisible #custom-page-marker element: on them the
// header "Live" button (which links to the official wiki) becomes an "Edit"
// button opening the page in the custom-page editor.
function UpdateLiveButton() {
  var liveButton = document.getElementById("live-button");
  if (!liveButton) return;

  var marker = document.getElementById("custom-page-marker");

  if (marker) {
    liveButton.innerHTML = '<i class="mdi mdi-pencil"></i>Edit';
    liveButton.href = "/custom/edit?address=" + encodeURIComponent(marker.getAttribute("data-address") || "");
    liveButton.removeAttribute("target");
  } else {
    liveButton.innerHTML = '<i class="mdi mdi-history"></i>Live';
    liveButton.href = "https://wiki.facepunch.com/gmod" + window.location.pathname;
    liveButton.target = "_blank";
  }
}

// Builds the "Custom Wiki" sidebar section from the database-backed custom
// pages/categories. Category names use "/" for nesting (e.g. "MyAddon/Hooks").
// Links get a `search` attribute so the sidebar quick-search finds them.
function InitCustomSidebar() {
  if (document.getElementById("custom-wiki-section")) return;
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
      // function, rc/rs/rm = realm colors, e = has example.
      function leafClasses(p) {
        if (!(hasTag(p, "function") || hasTag(p, "enum") || hasTag(p, "struct"))) return "";
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
      if (!contents || document.getElementById("custom-wiki-section")) return;
      var header = document.createElement("div");
      header.className = "sectionheader";
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
      contents.appendChild(header);
      contents.appendChild(section);
    })
    .catch(function (e) {
      console.warn("custom sidebar unavailable", e);
    });
}

// The main init chain runs inside requestAnimationFrame after `load`, which
// browsers suspend in hidden tabs — build the custom sidebar and set up the
// Live/Edit button independently so they are there as soon as the DOM is ready.
function InitCustomExtras() {
  InitCustomSidebar();
  UpdateLiveButton();
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
    var sidebar = document.getElementById("sidebar");
    var active = sidebar.getElementsByClassName("active");
    if (active.length == 1) {
      active[0].scrollIntoView({ smooth: true, block: "center" });
    }

    UpdateLiveButton();

    requestAnimationFrame(() => {
      InitSearch();
      Navigate.Install();
      setupLastParsed();
      InitCustomSidebar();
    });
  });
});
