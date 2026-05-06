import crypto from "crypto";
import { requireEnv } from "./env";

function getKey() {
  return crypto
    .createHash("sha256")
    .update(requireEnv("GMAIL_TOKEN_ENCRYPTION_KEY"))
    .digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted token is malformed.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signState(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getKey())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyState<T>(state: string): T {
  const [body, signature] = state.split(".");

  if (!body || !signature) {
    throw new Error("OAuth state is malformed.");
  }

  const expected = crypto
    .createHmac("sha256", getKey())
    .update(body)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("OAuth state signature is invalid.");
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
}
