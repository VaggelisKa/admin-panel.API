import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import { RouterContext } from "https://deno.land/x/oak/mod.ts";
import { v4 } from "https://deno.land/std@0.82.0/uuid/mod.ts";


import { client } from "../database/db.ts";
import { SigninArgs, SignupArgs, UpdateRolesArgs, User, UserResponse } from "../types/types.ts";
import { createToken, deleteToken, sendToken } from "../utils/token-handler.ts";
import { insertUserString, queryByEmailString, queryByIdString, queryByResetPasswordTokenString, updateRequestResetPasswordString, updateResetPasswordString, updateRolesString, updateTokenVersionString } from "../utils/queryStrings.ts";
import { validatePassword, validateUsername, validateEmail } from "../utils/validations.ts";
import { isAuthenticated, isSuperadmin } from "../utils/authUtils.ts";
import { sendEmail } from "../utils/email-handler.ts";


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
                throw error;
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
                throw error;
            }
        },

    signout: async (
           _: any,
           __: any,
           { cookies, request }: RouterContext
        ): Promise<{ message: string } | null> => {
            try {
                const user = await isAuthenticated(request);
                const newTokenVersion = 1;

                await client.connect();

                const updatedUserData = await client.query(updateTokenVersionString(user.id, newTokenVersion));
                const updatedUser = updatedUserData.rowsOfObjects()[0] as User;

                if (!updatedUser) throw new Error('There was an error during signout');

                await client.end();

                deleteToken(cookies);

                return { message: `Goodbye ${updatedUser.username}` }
            } catch (error) {
                throw error
            }
        },

    requestToResetPassword: async (
            _: any,
            { email }: { email: string },
        ): Promise<{ message: string } | null> => {
            try {
                if (!email) throw new Error('Email is required');
                const formattedEmail = email.trim().toLowerCase();

                // Querry user from database
                await client.connect();
                const result = await client.query(queryByEmailString(formattedEmail));
                
                const user = result.rowsOfObjects()[0] as User;
                if (!user) throw new Error('Email is not in use by any user');

                // Create reset password token & token expiry time
                const uuid = v4.generate();
                const reset_password_token = await bcrypt.hash(uuid);
                const reset_password_token_expiry = Date.now() + 1000 * 1800;

                // Update user
                const updatedUserData = await client.query(updateRequestResetPasswordString(
                    formattedEmail, 
                    reset_password_token, 
                    reset_password_token_expiry
                ));
                const updatedUser = updatedUserData.rowsOfObjects()[0] as User;
                if (!updatedUser) throw new Error('Sorry, you cannot proceed');

                await client.end();

                // Send a reset link
                const subject = 'Reset your password';
                const html = `
                    <div style={{width: '60%'}}>
                        <p>Please click the link below to reset your password</p>
                        <a 
                            href='http://localhost:8000/?resetToken=${reset_password_token}' 
                            target='blank'
                            style={{color: 'blue'}}
                        > Click to reset password
                        </a>
                    </div>
                `;
                const res = await sendEmail(formattedEmail, subject, html);
                if (!res.ok) throw new Error('Sorry, something went wrong');

                return { 
                    message: 'Please check your email for further instructions' 
                };
            } catch (error) {
                throw error;
            }
        },

    resetPassword: async (
            _: any,
            { newPassword, token }: { newPassword: string, token: string }
        ): Promise<{ message: string } | null> => {
            try {
                if (!newPassword || !token) throw new Error('Sorry, you cannot proceed');
                
                // Querry users by reset password token
                await client.connect();

                const result = client.query(queryByResetPasswordTokenString(token));
                const user = (await result).rowsOfObjects()[0] as User;
                if (!user) throw new Error('Error during password reset');

                // Check if the reset token is expired
                if (!user.reset_password_token_expiry) throw new Error('Error during password reset');
                const isTokenExpired = Date.now() > user.reset_password_token_expiry;

                if (isTokenExpired) 
                    throw new Error('This email has expired, please go through the reset process again');

                // Hash, salt new password & update user
                const salt = await bcrypt.genSalt(8);
                const hashedPassword = await bcrypt.hash(newPassword, salt);

                const updatingUserResult = await client.query(updateResetPasswordString(user.id, hashedPassword));
                const updatedUser = updatingUserResult.rowsOfObjects()[0] as User;
                if (!updatedUser) throw new Error('Error during password reset');

                await client.end();

                return {
                    message: 'Your password has been reset'
                }
            } catch (error) {
                console.log(error);
                throw error;
            }
        },

    updateRoles: async (
            _: any,
            { id, newRoles }: UpdateRolesArgs,
            { request }: RouterContext
        ): Promise<UserResponse | null> => {
            try {
                if (!newRoles || !id) throw new Error('Sorry, you cannot proceed');

                // Check if user is authenticated
                const authenticatedUser = await isAuthenticated(request);
                if (!authenticatedUser) throw new Error('You cannot proceed, please log in first');

                // Check if user who is logged in is SUPERADMIN (authorization)
                const isUserSuperadmin = isSuperadmin(authenticatedUser.roles);
                if (!isUserSuperadmin) throw new Error('No authorization');


                // Query the user to be updated info
                await client.connect();

                const result = await client.query(queryByIdString(id));
                const userToBeUpdated = result.rowsOfObjects()[0] as User;
                if (!userToBeUpdated) throw new Error('Sorry, you cannot proceed');

                // Update user and return response
                const updateUserResult = await client.query(updateRolesString(id, newRoles));
                const updatedUser = updateUserResult.rowsOfObjects()[0] as User;
                if (!updatedUser) throw new Error('Error while updating user');

                const userToReturn: UserResponse = {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    username: updatedUser.username,
                    roles: updatedUser.roles,
                    created_at: updatedUser.created_at
                }
                await client.end();
                
                return userToReturn;
            } catch (error) {
                console.log(error);
                throw error;
            }
        }
};