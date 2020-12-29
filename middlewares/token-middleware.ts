import { Middleware } from "https://deno.land/x/oak/mod.ts";
import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

import { DecodedToken, User } from "../types/types.ts";
import { createToken, decodeToken, sendToken } from "../utils/token-handler.ts";
import { isAuthenticated } from "../utils/authUtils.ts";
import { client } from "../database/db.ts";
import { updateTokenVersionString } from '../utils/queryStrings.ts'

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


            const currentTokenAge = Date.now() + 1000 * 3600 * 24 * 15 - exp;
            if (currentTokenAge > 1000 * 3600 * 6) {
                try {
                    const authenticatedUser = await isAuthenticated(ctx.request);
                    if (authenticatedUser) {
                        await client.connect();

                        const updateTokenResult = await client.query(updateTokenVersionString(
                            authenticatedUser.id,
                            authenticatedUser.token_version
                        ));
                        const updatedUser = updateTokenResult.rowsOfObjects()[0] as User;
                        if (!updatedUser) return;

                        const newToken = await createToken(updatedUser.id, updatedUser.token_version);
                        console.log('NEW TOKEN => ', newToken);
                        sendToken(ctx.cookies, newToken);

                        // Re-attach new token version and time till expiration
                        ctx.request.tokenVersion = updatedUser.token_version;
                        ctx.request.exp = Date.now() + 1000 * 3600 * 24 * 15;
                    }
                } catch (error) {
                    
                }
            }
        }
    }
    await next();
}
