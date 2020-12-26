import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";

import { client } from "../database/db.ts";
import { SignupArgs, User, UserResponse } from "../types/types.ts";
import { insertUserString, queryByEmailString } from "../utils/queryStrings.ts";
import { validatePassword, validateUsername, validateEmail } from "../utils/validations.ts";

export const Mutation = {
    signup: async (
            parent: any, 
            {username, email, password}: SignupArgs, 
            ctx: any, info: any
        ): Promise<UserResponse | null | undefined> => {
            try {
                if (!username) throw new Error('Username is required!');
                if (!email) throw new Error('Email is required!');
                if (!password) throw new Error('Password is required!');

                const formatedUsername = username.trim();
                const isUsernameValid = validateUsername(formatedUsername);
                if (!isUsernameValid) throw new Error('Username must be between 8 & 30 characters');

                const isPasswordValid = validatePassword(password);
                if (!isPasswordValid) throw new Error('Password must be between 6 and 30 characters');

                const formatedEmail = email.trim().toLowerCase();
                const isEmailValid = validateEmail(formatedEmail);
                if (!isEmailValid) throw new Error('Email is invalid');

                // Connect to database and check whether email exists
                await client.connect();

                const result =  await client.query(queryByEmailString(formatedEmail));
                const user = result.rowsOfObjects()[0] as User;
                if (user) throw new Error('This email already in use');

                // Hash, salt password and save user to the database
                const salt = await bcrypt.genSalt(8);
                const hashedPassword = await bcrypt.hash(password, salt);

                const userData = await client.query(insertUserString(formatedUsername, formatedEmail, hashedPassword));
                const newUser = userData.rowsOfObjects()[0] as User;

                const userToReturn: UserResponse = {
                    id: newUser.id,
                    email: newUser.email,
                    username: newUser.username,
                    roles: newUser.roles,
                    created_at: newUser.created_at
                }
                return userToReturn;
            } catch (error) {
                console.log(error);
            }
        }
};