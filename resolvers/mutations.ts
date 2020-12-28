import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { Context, RouterContext } from "https://deno.land/x/oak/mod.ts";


import { client } from "../database/db.ts";
import { SigninArgs, SignupArgs, User, UserResponse } from "../types/types.ts";
import { createToken, deleteToken, sendToken } from "../utils/token-handler.ts";
import { insertUserString, queryByEmailString, updateTokenVersionString } from "../utils/queryStrings.ts";
import { validatePassword, validateUsername, validateEmail } from "../utils/validations.ts";
import { isAuthenticated } from "../utils/authUtils.ts";


export const Mutation = {
    signup: async (
            _: any, 
            { username, email, password }: SignupArgs, 
            { cookies }: RouterContext
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
                await client.end();
                
                // Create JWT token
                const token = await createToken(newUser.id, newUser.token_version);

                // Send token through cookie
                sendToken(cookies, token);

                return userToReturn;
            } catch (error) {
                console.log(error);
            }
        },

    signin: async (
            _: any,
            { email, password }: SigninArgs,
            { cookies }: RouterContext
        ): Promise<UserResponse | null | undefined> => {
            try {
                if (!email) throw new Error('Email is required!');
                if (!password) throw new Error('Password is required!');

                const formattedEmail = email.trim().toLowerCase();

                await client.connect();

                const result = await client.query(queryByEmailString(formattedEmail));
                const user = result.rowsOfObjects()[0] as User;
                if (!user) throw new Error("Email or password is invalid");

                const isPasswordCorrect = await bcrypt.compare(password, user.password);
                if (!isPasswordCorrect) throw new Error("Email or password is invalid");

                const userToReturn: UserResponse = {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    created_at: user.created_at
                }
                await client.end();

                // Create JWT token
                const token = await createToken(user.id, user.token_version);

                // Send token through cookie
                sendToken(cookies, token);

                return userToReturn;
            } catch (error) {
                console.log(error.message);
            }
        },

    signout: async (
           _: any,
           __: any,
           { cookies, request }: RouterContext
        ): Promise<{ message: string } | null> => {
            try {
                const user = await isAuthenticated(request);
                const newTokenVersion = user.token_version + 1;

                await client.connect();

                const updatedUserData = await client.query(updateTokenVersionString(user.id, newTokenVersion));
                const updatedUser = updatedUserData.rowsOfObjects()[0] as User;

                await client.end();

                if (!updatedUser) throw new Error('There was an error during signout');

                deleteToken(cookies);

                return { message: `Goodbye ${updatedUser.username}` }
            } catch (error) {
                throw error
            }
        }
};