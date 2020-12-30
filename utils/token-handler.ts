import { create, Header, Payload, decode } from "../dependencies/djwt-deps.ts";
import { Cookies } from "../dependencies/oak-deps.ts";

import { config } from "../dependencies/dotenv-deps.ts";

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
        exp: Date.now() + 1000 * 3600 * 24 * 15,
    }

    const createdToken = await create(header, payload, TOKEN_SECRET);

    return createdToken;
};

export const sendToken = (cookies: Cookies, token: string) => cookies.set(
    TOKEN_NAME,
    token,
    { httpOnly: true }
);

export const decodeToken = (token: string) => {
    const { payload, signature } = decode(token);

    return { payload, signature }
};

export const deleteToken = (cookies: Cookies) => cookies.delete(TOKEN_NAME);
