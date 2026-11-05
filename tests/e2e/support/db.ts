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
