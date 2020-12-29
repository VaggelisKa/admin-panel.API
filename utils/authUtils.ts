import { Request } from "https://deno.land/x/oak/mod.ts";
import { client } from '../database/db.ts';
import { RoleOptions, User } from "../types/types.ts";
import { queryByIdString } from "./queryStrings.ts";

export const isAuthenticated = async (request: Request): Promise<User> => {
    if (!request.userId) throw new Error('Please log in to proceed');

    await client.connect();

    const result = client.query(queryByIdString(request.userId));
    const user = (await result).rowsOfObjects()[0] as User;
    if (!user) throw new Error('Not authenticated');

    if (user.token_version !== request.tokenVersion) throw new Error ('Not authenticated');

    await client.end();

    return user;
};

export const isSuperadmin = (roles: RoleOptions[]): boolean => roles.includes(RoleOptions.superAdmin);