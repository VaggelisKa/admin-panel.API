import { RouterContext } from "../dependencies/oak-deps.ts";
import { client } from '../database/db.ts';
import { UserResponse } from "../types/types.ts";
import { isAdmin, isAuthenticated, isSuperadmin } from "../utils/authUtils.ts";



export const Query = {
    users: async (_: any, __: any, { request }: RouterContext): Promise<UserResponse[] | null> => {
        try {
            const authenticatedUser = await isAuthenticated(request);
            if (!authenticatedUser) throw new Error('Please login to proceed');

            const isUserSuperadmin = isSuperadmin(authenticatedUser.roles);
            const isUserAdmin = isAdmin(authenticatedUser.roles);
            if (!isUserSuperadmin && !isUserAdmin) throw new Error('Unauthorized');
    
            await client.connect();
    
            const result = await client.query('SELECT * FROM users;')
            const users = result.rowsOfObjects();
    
            await client.end();

            const usersToReturn: UserResponse[] = users.map(user => 
                ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles,
                    created_at: user.created_at
                })
            );
    
            return usersToReturn;
        } catch (error) {
            console.log(error);
            throw error;
        }
    },

    user: async (_: any, __: any, { request }: RouterContext): Promise<UserResponse | null> => {
        try {
            const authenticatedUser = await isAuthenticated(request);
            if (!authenticatedUser) throw new Error('Please login to proceed');

            const userToReturn: UserResponse = {
                id: authenticatedUser.id,
                username: authenticatedUser.username,
                email: authenticatedUser.email,
                roles: authenticatedUser.roles,
                created_at: authenticatedUser.created_at
            }

            return userToReturn;
        } catch (error) {
            return null;
        }
    }
}