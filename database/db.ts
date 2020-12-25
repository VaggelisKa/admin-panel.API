import { Client } from "https://deno.land/x/postgres@v0.4.6/mod.ts";


export const client = new Client({
    database: "simple_panel",
    user: "simple_admin",
    password: "4567891452",
    hostname: "localhost",
    port: 5432
});

export async function main() {
    const client = new Client({
      user: "user",
      database: "test",
      hostname: "localhost",
      port: 5432
    });
    await client.connect();
    const result = await client.query("SELECT * FROM people;");
    console.log(result.rows);
    await client.end();
  }

