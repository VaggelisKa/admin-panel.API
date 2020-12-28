import { Context } from "https://deno.land/x/oak/mod.ts";
import { client } from '../database/db.ts';
import { UserResponse } from "../types/types.ts";
import { isAuthenticated } from "../utils/authUtils.ts";

export const Query = {
    users: async () => {
        await client.connect();

        const result = await client.query('SELECT * FROM users;')

        const users = result.rowsOfObjects();

        return users;
    },

    user: async (_: any, __: any, { request }: Context): Promise<UserResponse> => {
        try {
            const user = await isAuthenticated(request);

            const userToReturn: UserResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles,
                created_at: user.created_at
            }

            return userToReturn;
        } catch (error) {
            throw error;
        }
    }
}