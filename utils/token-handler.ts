import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.0/mod.ts";
import { Cookies } from "https://deno.land/x/oak/mod.ts";

import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

const { TOKEN_SECRET, TOKEN_NAME } = config();

const header: Header = {
    alg: "HS512",
    typ: "JWT"
}

export const createToken = async (id: string, tokenVersion: number) => {
    const payloadInfo = {
        id,
        tokenVersion
    };
    
    const payload: Payload = {
        payloadInfo,
        exp: getNumericDate(Date.now() + 1000 * 3600 * 24 * 15),
    }

    return await create(header, payload, TOKEN_SECRET);
};

export const sendToken = (cookies: Cookies, token: string) => cookies.set(
    TOKEN_NAME,
    token,
    { httpOnly: true }
);
