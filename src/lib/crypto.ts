// src/lib/crypto.ts
// Minimal AES-GCM helper using Web Crypto API (Node 20+ and modern browsers)
const enc = new TextEncoder();
const dec = new TextDecoder();

function getKeyBytes() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET is not set");
  // accept base64 or hex; fallback to utf-8
  if (/^[0-9a-fA-F]+$/.test(secret) && secret.length % 2 === 0) {
    return Uint8Array.from(secret.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  }
  try {
    return Uint8Array.from(Buffer.from(secret, "base64"));
  } catch {
    return enc.encode(secret);
  }
}

export async function getAesKey() {
  const keyBytes = getKeyBytes();
  return await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(obj: any) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: Buffer.from(iv).toString("base64"), data: Buffer.from(new Uint8Array(ct)).toString("base64") };
}

export async function decryptJson(payload: { iv: string; data: string }) {
  const key = await getAesKey();
  const iv = Uint8Array.from(Buffer.from(payload.iv, "base64"));
  const data = Uint8Array.from(Buffer.from(payload.data, "base64"));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(dec.decode(pt));
}

