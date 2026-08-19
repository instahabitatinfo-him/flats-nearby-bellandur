import crypto from "crypto";

const COOKIE_NAME = "homeease_customer_session";

const getSecret = () => {
  const secret = process.env.HOME_EASE_SESSION_SECRET;

  if (!secret) {
    throw new Error("HOME_EASE_SESSION_SECRET is not configured");
  }

  return secret;
};

export function createCustomerSession(customerId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      customerId,
      createdAt: Date.now(),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyCustomerSession(session: string) {
  const [payload, signature] = session.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!parsed.customerId) {
      return null;
    }

    return {
      customerId: String(parsed.customerId),
    };
  } catch {
    return null;
  }
}

export const CUSTOMER_SESSION_COOKIE = COOKIE_NAME;