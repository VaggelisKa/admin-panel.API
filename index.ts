import { Application } from "https://deno.land/x/oak/mod.ts";

import { GraphQLService } from './server.ts';

import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

const { PORT } = config();

const app = new Application();

app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

console.log("deno server running!!");

await app.listen({ port: +PORT });