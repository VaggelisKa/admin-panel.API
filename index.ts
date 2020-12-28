import { Application } from "https://deno.land/x/oak/mod.ts";

import { GraphQLService } from './server.ts';

import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";
import { decodeToken } from "./utils/token-handler.ts";
import { DecodedToken } from './types/types.ts';

const { PORT, TOKEN_NAME } = config();

const app = new Application();

app.use(async (ctx, next) => {
    const token = ctx.cookies.get(TOKEN_NAME);
    if (token) {
        const decodedToken = decodeToken(token) as DecodedToken | null;
        if (decodedToken) {
            const { payloadInfo, exp } = decodedToken.payload;

            ctx.request.userId = payloadInfo.id;
            ctx.request.tokenVersion = payloadInfo.tokenVersion;
            ctx.request.exp = exp;
        }
    }
    await next();
});

app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

console.log("deno server running!!");

await app.listen({ port: +PORT });