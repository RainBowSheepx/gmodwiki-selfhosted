// Markup generator helpers for the Trolleybus System wiki documentation.

export const UNSURE = " Claude не уверен, нужно доп. проверка.";

// The addon's repository — the "Search Github" button on every function page
// points here instead of Facepunch's garrysmod repo.
export const GITHUB_REPO = "https://github.com/ShadowBonnieRUS/Garry-s-Mod-Trolleybus-System";

export function fnMarkup({ name, parent, parentlink, type = "libraryfunc", realm, desc, args = [], rets = [], extra = "" }) {
  const plAttr = parentlink ? ` parentlink="${parentlink}"` : "";
  let m = `<function name="${name}" parent="${parent}"${plAttr} type="${type}" github="${GITHUB_REPO}">\n\t<description>\n${desc}\n\t</description>\n\t<realm>${realm}</realm>\n`;

  if (args.length) {
    m += "\t<args>\n";
    for (const a of args) {
      const def = a[3] !== undefined ? ` default="${a[3]}"` : "";
      m += `\t\t<arg name="${a[0]}" type="${a[1]}"${def}>${a[2]}</arg>\n`;
    }
    m += "\t</args>\n";
  }

  if (rets.length) {
    m += "\t<rets>\n";
    for (const r of rets) {
      m += `\t\t<ret name="" type="${r[0]}">${r[1]}</ret>\n`;
    }
    m += "\t</rets>\n";
  }

  m += "</function>\n";
  if (extra) m += "\n" + extra;
  return m;
}

/** Library function page: address Trolleybus_System.X or <ns>.X */
export function lib(name, realm, desc, args = [], rets = [], opts = {}) {
  const parent = opts.parent ?? "Trolleybus_System";
  const category = opts.category ?? "Trolleybus System/Trolleybus_System";
  return {
    address: `${parent}.${name}`,
    title: `${parent}.${name}`,
    category,
    markup: fnMarkup({ name, parent, realm, desc, args, rets, extra: opts.extra }),
  };
}

/** Trolleybus class method page: address Trolleybus:X */
export function method(name, realm, desc, args = [], rets = [], opts = {}) {
  return {
    address: `Trolleybus:${name}`,
    title: `Trolleybus:${name}`,
    category: "Trolleybus System/Trolleybus",
    markup: fnMarkup({ name, parent: "Trolleybus", type: "classfunc", realm, desc, args, rets, extra: opts.extra }),
  };
}

/** Hook page: address = full hook name */
export function hookPage(event, realm, desc, args = [], rets = [], opts = {}) {
  const name = opts.fullname ?? `TrolleybusSystem_${event}`;
  return {
    address: name,
    title: name,
    category: "Trolleybus System/Hooks",
    markup: fnMarkup({ name, parent: "", type: "hook", realm, desc, args, rets, extra: opts.extra }),
  };
}
