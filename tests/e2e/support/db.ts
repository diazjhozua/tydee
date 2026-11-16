import { createHash, randomBytes } from "node:crypto";
import { Client } from "pg";
import { readState } from "./state";

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

export async function verificationToken(email: string): Promise<string> {
  return withClient(async (client) => {
    const result = await client.query<{ email_verification_token: string | null }>(
      "select email_verification_token from users where email = $1",
      [email],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Expected one user for ${email}, found ${result.rowCount}.`);
    }

    const token = result.rows[0].email_verification_token;

    if (!token) {
      throw new Error(`No verification token stored for ${email}.`);
    }

    return token;
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

export async function promoteToAdmin(email: string): Promise<void> {
  await withClient(async (client) => {
    const result = await client.query("update users set is_admin = true where email = $1", [
      email,
    ]);

    if (result.rowCount !== 1) {
      throw new Error(`Could not promote ${email}: updated ${result.rowCount} rows.`);
    }
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
