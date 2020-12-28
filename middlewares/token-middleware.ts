import { Middleware } from "https://deno.land/x/oak/mod.ts";
import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

import { DecodedToken } from "../types/types.ts";
import { decodeToken } from "../utils/token-handler.ts";

const { TOKEN_NAME } = config();

export const checkToken: Middleware = async (ctx, next) => {
    const token = ctx.cookies.get(TOKEN_NAME);
    if (token) {
        const decodedToken = decodeToken(token) as DecodedToken | null;
        if (decodedToken) {
            const { payloadInfo, exp } = decodedToken.payload;

            ctx.request.userId = payloadInfo?.id;
            ctx.request.tokenVersion = payloadInfo?.tokenVersion;
            ctx.request.exp = exp;
        }
    }
    await next();
}
