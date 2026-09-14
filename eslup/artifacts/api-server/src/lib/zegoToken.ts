import { createCipheriv, randomBytes, randomInt } from "node:crypto";

/**
 * ZEGOCLOUD Token04 binary format:
 * expire (8 bytes) + IV length (2 bytes) + IV + ciphertext length (2 bytes)
 * + AES-CBC ciphertext, encoded with standard Base64 and prefixed with "04".
 */
export function generateToken04(
  appId: number,
  userId: string,
  serverSecret: string,
  effectiveSeconds: number,
  payload: string,
): { token: string; expiresAt: Date } {
  if (!Number.isSafeInteger(appId) || appId <= 0) throw new Error("Invalid ZEGOCLOUD configuration");
  const key = Buffer.from(serverSecret, "utf8");
  if (key.length !== 32) throw new Error("Invalid ZEGOCLOUD configuration");
  if (!userId || effectiveSeconds <= 0) throw new Error("Invalid token input");

  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((createdAt + effectiveSeconds) * 1000);
  const expire = createdAt + effectiveSeconds;
  const plaintext = JSON.stringify({
    app_id: appId,
    user_id: userId,
    nonce: randomInt(-2147483648, 2147483647),
    ctime: createdAt,
    expire,
    payload,
  });
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  if (iv.length > 0xffff || encrypted.length > 0xffff) {
    throw new Error("Token payload is too large");
  }

  const expireBuffer = Buffer.allocUnsafe(8);
  expireBuffer.writeBigInt64BE(BigInt(expire));
  const ivLength = Buffer.allocUnsafe(2);
  ivLength.writeUInt16BE(iv.length);
  const encryptedLength = Buffer.allocUnsafe(2);
  encryptedLength.writeUInt16BE(encrypted.length);
  const packed = Buffer.concat([
    expireBuffer,
    ivLength,
    iv,
    encryptedLength,
    encrypted,
  ]);

  return { token: `04${packed.toString("base64")}`, expiresAt };
}