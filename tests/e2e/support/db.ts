import { createHash, createHmac, randomBytes } from "node:crypto";
import { Client } from "pg";
import { readState } from "./state";

/** The code the e2e tests seed and then enter. Each test has its own account, so one value serves them all. */
export const TEST_VERIFICATION_CODE = "246810";

/**
 * Matches EmailVerification:CodeSecret in src/Web.Api/appsettings.Testing.json. The API keys the HMAC of every
 * verification code with it, so the seeded hash must use the same key.
 */
const VERIFICATION_CODE_SECRET = "tydee-e2e-verification-code-secret-32chars";

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const state = readState();
  const client = new Client({
    host: "127.0.0.1",
    port: state.port,
    database: state.database,
    user: state.user,
  });

  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/**
 * Stores a known one-time code for the account, so a test can spend it. The API keeps only a keyed HMAC of each code
 * and the fake sender discards the raw one, so the test cannot read the code from anywhere else. The hash is the
 * same one VerificationSecrets computes: Base64 of HMAC-SHA256 over `${userId}:${code}`, keyed with the e2e secret.
 */
export async function seedVerificationCode(email: string, code: string): Promise<void> {
  await withClient(async (client) => {
    const user = await client.query<{ id: string }>("select id from users where email = $1", [email]);

    if (user.rowCount !== 1) {
      throw new Error(`Expected one user for ${email}, found ${user.rowCount}.`);
    }

    const userId = user.rows[0].id;
    const codeHash = createHmac("sha256", VERIFICATION_CODE_SECRET)
      .update(`${userId}:${code}`, "utf8")
      .digest("base64");

    const result = await client.query(
      "update email_verifications set code_hash = $1, code_expires_on_utc = now() + interval '15 minutes', attempts = 0 where user_id = $2",
      [codeHash, userId],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Could not seed a code for ${email}: updated ${result.rowCount} rows.`);
    }
  });
}

/**
 * True once the worker has bound this browser's verification secret to the account. A resend only queues a row, so
 * the binding happens on the worker's next tick. Used with expect.poll.
 */
export async function verificationBoundTo(email: string, verificationSecret: string): Promise<boolean> {
  const sessionHash = createHash("sha256").update(verificationSecret, "utf8").digest("base64");

  return withClient(async (client) => {
    const result = await client.query<{ bound: boolean }>(
      "select ev.session_hash = $1 as bound from email_verifications ev join users u on u.id = ev.user_id where u.email = $2",
      [sessionHash, email],
    );

    return result.rows[0]?.bound ?? false;
  });
}

export async function userId(email: string): Promise<string> {
  return withClient(async (client) => {
    const result = await client.query<{ id: string }>(
      "select id from users where email = $1",
      [email],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Expected one user for ${email}, found ${result.rowCount}.`);
    }

    return result.rows[0].id;
  });
}

export async function setEmailVerified(email: string): Promise<void> {
  await withClient(async (client) => {
    await client.query("update users set is_email_verified = true where email = $1", [email]);
  });
}

/**
 * Stores the hash of a fresh reset token the way ForgotPassword does (Base64 of SHA-256 over the raw token), and
 * returns the raw token. The test can then complete a reset, which the e-mail would normally make possible: the
 * fake sender discards the raw token.
 */
export async function seedPasswordResetToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(rawToken, "utf8").digest("base64");

  await withClient(async (client) => {
    const result = await client.query(
      "update users set password_reset_token_hash = $1, password_reset_token_expires_at = now() + interval '1 hour' where email = $2",
      [hash, email],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Could not seed a reset token for ${email}: updated ${result.rowCount} rows.`);
    }
  });

  return rawToken;
}

/** True once the worker has stored a reset token for this account. Used with expect.poll. */
export async function passwordResetTokenStored(email: string): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query<{ stored: boolean }>(
      "select password_reset_token_hash is not null as stored from users where email = $1",
      [email],
    );

    return result.rows[0]?.stored ?? false;
  });
}

export async function userCountByEmail(email: string): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query<{ count: string }>(
      "select count(*)::text as count from users where email = $1",
      [email],
    );

    return Number(result.rows[0].count);
  });
}
