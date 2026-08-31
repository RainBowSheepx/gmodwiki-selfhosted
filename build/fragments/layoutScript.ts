const logo = "/garry/822e60dc-c931-43e4-800f-cbe010b3d4cc.webp";

// HIDE_MIRROR_NOTICE=1 (or true/yes) at launch hides the mirror disclaimer
// shown under every page; by default it is visible.
const showMirrorNotice = !/^(1|true|yes)$/i.test(process.env.HIDE_MIRROR_NOTICE ?? "");

const ogLogo = `${Astro.url.protocol}//${Astro.url.host}${logo}`;
const fullUrl = `${Astro.url.protocol}//${Astro.url.host}${Astro.url.pathname}`;
