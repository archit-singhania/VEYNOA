import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
export type Envelope = {
  v: 1;
  salt: string;
  nonce: string;
  ciphertext: string;
};
const context = utf8ToBytes("veynoa-private-space-v1");
export async function deriveVaultKey(password: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, utf8ToBytes(password), salt, {
    c: 600000,
    dkLen: 32,
    asyncTick: 8,
  });
}
export function sealVault(
  text: string,
  key: Uint8Array,
  salt: Uint8Array,
  nonce: Uint8Array,
): string {
  if (salt.length !== 16 || nonce.length !== 12)
    throw new Error("Invalid vault parameters");
  const ciphertext = gcm(key, nonce, context).encrypt(utf8ToBytes(text));
  return JSON.stringify({
    v: 1,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  } satisfies Envelope);
}
export function parseVault(payload: string): Envelope {
  const e = JSON.parse(payload);
  if (
    e.v !== 1 ||
    typeof e.salt !== "string" ||
    e.salt.length !== 32 ||
    typeof e.nonce !== "string" ||
    e.nonce.length !== 24 ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length < 32
  )
    throw new Error("Unsupported or damaged vault.");
  return e;
}
export function vaultSalt(payload: string) {
  return hexToBytes(parseVault(payload).salt);
}
export function openVault(payload: string, key: Uint8Array) {
  const e = parseVault(payload);
  return new TextDecoder().decode(
    gcm(key, hexToBytes(e.nonce), context).decrypt(hexToBytes(e.ciphertext)),
  );
}
