import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const VIEW_COOKIE = "iserein-reading-day";

function signature(token: string, secret: string, day: string) {
  return createHmac("sha256", secret).update(`reading-day:${day}:${token}`).digest("hex");
}

export function readViewToken(value: string | undefined, secret: string, day: string): string | null {
  if (!value || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return null;
  const [token, supplied] = value.split(".");
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(token, secret, day), "hex")) ? token : null;
}

export function newViewCookie(secret: string, day: string) {
  const token = randomBytes(32).toString("hex");
  return `${token}.${signature(token, secret, day)}`;
}

export function viewReaderHash(secret: string, day: string, articleId: number, token: string) {
  return createHmac("sha256", secret).update(`reading:${day}:${articleId}:${token}`).digest("hex");
}

export function viewNetworkHash(secret: string, day: string, address: string) {
  return createHmac("sha256", secret).update(`reading-network:${day}:${address}`).digest("hex");
}
