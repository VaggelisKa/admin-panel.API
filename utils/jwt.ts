import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v2.0/mod.ts";

const key = "very secret key";

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

    return await create(header, payload, key);
}
