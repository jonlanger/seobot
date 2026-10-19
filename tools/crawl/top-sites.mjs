#!/usr/bin/env node
/**
 * Build the pinned, filtered "top sites" input list for the JS-wall study.
 *
 * Source: Tranco (tranco-list.eu) — research-grade, manipulation-hardened
 * top-sites ranking. The exact list version is pinned via list ID for
 * reproducibility (see data/top-500.json metadata).
 *
 * Filtering: drops infrastructure domains (CDNs, DNS/hosting backends,
 * telemetry, shorteners, auth portals) that don't serve an auditable web
 * experience. Post-crawl curation can exclude more — with reasons — at
 * analysis time; nothing is deleted here beyond this documented filter.
 *
 * Usage:
 *   node top-sites.mjs --csv /path/to/tranco-<listid>.csv --n 500
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/* ----------------------- infrastructure filter ----------------------- */

/** Exact domains that serve infrastructure/portals, not browsable content. */
const EXACT_EXCLUDES = new Set([
  // Google infrastructure & product redirects
  "googleapis.com", "googleusercontent.com", "googlevideo.com", "googletagmanager.com",
  "googlesyndication.com", "googleadservices.com", "googledomains.com", "gvt1.com", "gvt2.com",
  "doubleclick.net", "gstatic.com", "dns.google", "gmail.com",
  // CDN / static delivery
  "amazonaws.com", "akamai.net", "akamaiedge.net", "akadns.net", "akam.net", "edgekey.net",
  "edgesuite.net", "fbcdn.net", "fastly.net", "cloudfront.net", "aaplimg.com", "pv-cdn.net",
  "tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "gwfb.net", "yimg.com", "ytimg.com",
  "nflxso.net", "nflximg.com", "nflxvideo.net", "netflix.net", "mzstatic.com", "jsdelivr.net",
  "tbcache.com", "2mdn.net", "media.net", "openx.net", "adobedc.net", "adobe.net",
  // Cloud platform backends
  "azurefd.net", "tm-azurefd.net", "azurewebsites.net", "azureedge.net", "ax-msedge.net",
  "spo-msedge.net", "spov-msedge.net", "wac-msedge.net", "dual-s-msedge.net", "msedge.net",
  "bx-msedge.net", "cloudflare.net", "cloudflare-dns.com", "yandex.net", "yandexcloud.net",
  "root-servers.net", "tencent-cloud.net", "byteoversea.net", "ibyteimg.com", "capcutapi.com",
  "userapi.com", "vkuser.net", "steamserver.net", "virginm.net", "live.net", "live-video.net",
  "discord.media", "playstation.net", "xiaomi.net", "whatsapp.net", "static.microsoft",
  "facebook.net", "kwai.net", "ngenix.net", "ovh.net", "bunnyinfra.net", "bidswitch.net",
  "smaato.net", "hstgr.net", "allawnos.com", "samsungcloudsolution.com",
  // DNS / hosting / network operations
  "domaincontrol.com", "gtld-servers.net", "apple-dns.net", "gandi.net", "myfritz.net",
  "workers.dev", "trafficmanager.net", "windowsupdate.com", "windows.net", "dnsowl.com",
  "dns-parking.com", "jomodns.com", "duckdns.org", "namebrightdns.com", "ttdns2.com",
  "alidns.com", "alibabadns.com", "dnspod.net", "ripn.net", "impervadns.net", "cloudns.net",
  "ui-dns.com", "bdydns.com", "nease.net", "azure-dns.com", "squarespacedns.com",
  "dnsmadeeasy.com", "vercel-dns-016.com", "vercel-dns-017.com", "vercel-dns-3.com",
  "amazonvideo.com",
  // Telemetry / ads / auth / portals with no public content
  "appsflyersdk.com", "microsoftonline.com", "office.net", "sharepoint.com", "cloud.microsoft",
  "azure.com", "office.com", "icloud.com", "live.com", "telekom.net", "comcast.net",
  "hicloudcam.com", "ezviz7.com", "atlassian.net", "statsigapi.net", "online-metrix.net",
  "demdex.net", "omtrdc.net", "nr-data.net", "ip-api.com", "firefox-portal-detection.com",
  "firetvcaptiveportal.com",
  // URL shorteners / redirectors
  "wa.me", "youtu.be", "goo.gl", "goo.su", "bit.ly", "lnkd.in", "tinyurl.com", "buff.ly", "ow.ly",
  // Second pass — discovered during the first production crawl (2026-10-16):
  // ad/telemetry networks
  "adnxs.com", "adsrvr.org", "3lift.com", "lijit.com", "pubmatic.com", "sharethrough.com",
  "dotomi.com", "inner-active.mobi", "pangle.io", "tiktokpangle.us", "smaato.net", "ad-tech.ru",
  "googletagservices.com", "amazon-adsystem.com", "app-measurement.com", "app-analytics-services.com",
  "browser-intake-datadoghq.com", "skybridge.click", "list-manage.com", "google-analytics.com",
  // Google/Meta/Amazon/Microsoft/Apple infrastructure & backends
  "a2z.com", "amzn.to", "media-amazon.com", "youtube-nocookie.com", "ggpht.com", "h264.io",
  "aws.dev", "amazon.dev", "awswaf.com", "awsglobalaccelerator.com",
  "on.aws", "sfx.ms", "svc.ms", "clarity.ms", "msftconnecttest.com", "msftncsi.com",
  "prodregistryv2.org", "run.app", "usercontent.goog", "translate.goog",
  "telephony.goog", "imgsmail.ru",
  // Cloud portals & app-service backends
  "myqcloud.com", "myhuaweicloud.com", "hicloud.com", "heytapmobile.com", "heytapdl.com",
  "byteglb.com", "allawnos.com", "samsungcloudsolution.com", "samsungqbe.com", "samsungapps.com",
  "samsungcloud.com", "tiktokv.us", "tiktokv.eu", "kwai-pro.com", "kwaipros.com",
  "office365.com", "shopifysvc.com", "myshopify.com", "wixsite.com",
  // DNS / hosting / relay backends
  "lsrelayaccess.com", "w2rt6byl5nf1opmc-a.com", "name-services.com", "worldnic.com", "nstld.com",
  "gandi-ns.fr", "resolver.arpa", "ipv4only.arpa", "libp2p.direct", "telecid.ru", "mangosip.ru",
  "spaceweb.pro", "netangels.ru", "hichina.com", "aliyuncs.com", "aliyuncsslbintl.com", "shifen.com",
  // misc non-content
  "comcast.com", "mtgglobals.com", "workbox.dk",
  // Third pass — tail-of-list stragglers (ranks ~690-800) verified by title check
  "twimg.com", "typekit.net", "quantserve.com", "imrworldwide.com", "bidr.io", "yieldmo.com",
  "agkn.com", "1rx.io", "gumgum.com", "outbrain.com", "githubusercontent.com", "bamgrid.com",
  "usgovcloudapi.net", "nel.goog", "g.co", "hihonorcloud.com", "dbankcloud.com", "nmrodam.com",
  "samsungacr.com", "featureassets.org", "googlezip.net", "plex.direct", "pvp.net", "parklogic.com",
  "uk.com", "easebar.com", "nodeflix.net", "eeroup.com", "fb.com", "vkontakte.ru", "bitdefender.net",
  "nintendo.net",
  // Fourth pass — tail stragglers (ranks ~770-812)
  "crwdcntrl.net", "singular.net", "recaptcha.net", "mybluehost.me", "amagi.tv", "moloco.com",
  "liadm.com", "steamstatic.com", "safebrowsing.apple", "pinimg.com", "samsungosp.com",
  "shopeemobile.com", "oxylabs.io", "adjust.com", "dyingbirds.com", "kunluncan.com",
  "33across.com", "discordapp.com", "teads.tv",
  // Fifth pass — ad-serving/verification ecosystems found by brand-name audit
  "applovin.com", "vungle.com", "rubiconproject.com", "taboola.com", "casalemedia.com",
  "inmobi.com", "adsafeprotected.com", "smartadserver.com", "doubleverify.com", "adform.net",
  "liftoff.io", "turn.com", "vedsalb.com", "a-mo.net",
  // Sixth pass — final surgical sweep (platform backends + zero-content unknowns)
  "elasticbeanstalk.com", "adobedtm.com", "msidentity.com", "oraclecloud.com", "xboxlive.com",
  "force.com", "herokuapp.com", "gotinder.com", "t.co", "adtrafficquality.google",
  "shalltry.com", "exp-tas.com", "wbx2.com", "sc-gw.com", "supertms.com", "bybanking.com",
  "vidaahub.com", "e2ro.com", "0xrpc.io", "whecloud.com",
  "id5-sync.com", "onetag-sys.com", "msftauth.net", "fbsbx.com", "cloudsink.net", "me.com", "gafg.com",
  "ssl-images-amazon.com", "adgrx.com", "appcenter.ms",
]);

/** Legitimate content sites whose domains contain risky-looking substrings. */
const ALLOW_EXCEPTIONS = new Set([
  "dns-shop.ru", "researchgate.net", "sourceforge.net", "speedtest.net",
  "slideshare.net", "behance.net", "php.net", "cpanel.net",
]);

/** Risky substrings — infrastructure families, ad/telemetry networks. */
const RISKY_PATTERNS = [
  /cdn|dns|msedge|azurefd|azureedge|azurewebsites|nflx|mzstatic|2mdn|byteoversea|ibyteimg|ttvnw|vkuser|userapi|statsig|demdex|omtrdc|nr-data|online-metrix|openx|adobedc|doubleclick|adservice|googlesyndication|googletagmanager|appsflyer|scorecardresearch|criteo|moatads|branch\.io/,
  /domaincontrol|gtld-servers|trafficmanager|myfritz|workers\.dev|registrar|akamai|akadns|edgekey|edgesuite|llnwd|gvt\d|gstatic|googleapis|googleusercontent|googlevideo|fbcdn|aaplimg|fastly|cloudfront|tiktokcdn|pv-cdn|gwfb|yimg/,
  /windowsupdate|microsoftonline|office\.net|sharepoint|cloud\.microsoft|hicloudcam|ezviz|portal-detection|captiveportal|webmail/,
];

function isExcluded(domain) {
  if (ALLOW_EXCEPTIONS.has(domain)) return false;
  if (EXACT_EXCLUDES.has(domain)) return true;
  return RISKY_PATTERNS.some((re) => re.test(domain));
}

/* ------------------------------- main ------------------------------- */

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const csvPath = getArg("--csv", "");
const targetN = Number(getArg("--n", "500"));
const outPath = getArg("--out", path.join(import.meta.dirname, "data", "top-500.json"));
if (!csvPath) {
  console.error("Usage: node top-sites.mjs --csv /path/to/tranco-<listid>.csv [--n 500] [--out file]");
  process.exit(1);
}

const csv = await readFile(csvPath, "utf8");
const rows = csv
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [rank, domain] = line.split(",");
    return { rank: Number(rank), domain: (domain ?? "").toLowerCase() };
  })
  .filter((r) => r.domain && Number.isFinite(r.rank));

const selected = [];
const excludedSample = [];
for (const row of rows) {
  if (selected.length >= targetN) break;
  if (isExcluded(row.domain)) {
    if (excludedSample.length < 40) excludedSample.push({ ...row, reason: "infrastructure filter" });
    continue;
  }
  selected.push({ rank: row.rank, domain: row.domain });
}

const output = {
  source: "Tranco",
  listId: getArg("--list-id", path.basename(csvPath).replace(/^tranco-|\.csv$/g, "")),
  note: "Tranco top-sites ranking, pinned list version. Infrastructure domains filtered (see filters). Ranks are original Tranco ranks.",
  filteredAt: new Date().toISOString(),
  requested: targetN,
  selected: selected.length,
  skippedInfrastructure: rows.length - selected.length,
  filters: {
    exact: [...EXACT_EXCLUDES],
    patterns: RISKY_PATTERNS.map(String),
  },
  excludedSample,
  sites: selected,
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(output, null, 2));
console.log(
  `Selected ${selected.length} sites (requested ${targetN}) → ${outPath}\n` +
    `First 25: ${selected.slice(0, 25).map((s) => `${s.rank}:${s.domain}`).join(" ")}\n` +
    `Last 5:   ${selected.slice(-5).map((s) => `${s.rank}:${s.domain}`).join(" ")}`,
);
