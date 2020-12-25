import { Client } from "https://deno.land/x/postgres@v0.4.6/mod.ts";


export const client = new Client({
    database: "simple_panel",
    user: "simple_admin",
    password: "4567891452",
    hostname: "localhost",
    port: 5432
});

