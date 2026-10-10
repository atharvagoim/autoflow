import dns from "dns/promises";
import net from "net";
import { AppError } from "./AppError";

// Outgoing requests made on behalf of users (webhook steps, Slack URLs) must
// not reach the server's own private network. Only public http(s) hosts.
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw AppError.badRequest(`"${raw}" is not a valid web address`);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw AppError.badRequest("Only http and https addresses are allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw AppError.badRequest("That address points to a private network, which isn't allowed");
  }
  return url;
}

export async function safePostJSON(rawUrl: string, body: unknown, timeoutMs = 10000) {
  const url = await assertPublicUrl(rawUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "AutoFlow/1.0" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error",
  });
  return { ok: res.ok, status: res.status };
}
