import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. The API will not be able to reach the database.");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export async function query<T extends Record<string, any> = any>(text: string, params: any[] = []) {
  const result = await pool.query<T>(text, params);
  return result;
}
