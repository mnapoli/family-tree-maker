// Short IDs backed by Workers KV. Deterministic: same tree → same id.
// Uses SHA-256 of the encoded tree, base64url-truncated.

const ID_LEN = 8;
const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

export async function putShortId(kv: KVNamespace, encoded: string): Promise<string> {
  const id = await hashId(encoded);
  await kv.put(id, encoded, { expirationTtl: TTL_SECONDS });
  return id;
}

export async function getEncoded(kv: KVNamespace, id: string): Promise<string | null> {
  return kv.get(id);
}

async function hashId(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, ID_LEN);
}
