import bcrypt from "../dependencies/bcrypt-deps.ts";
import { RouterContext } from "../dependencies/oak-deps.ts";
import { v4 } from "../dependencies/uuid-deps.ts";


import { client } from "../database/db.ts";
import { Provider, SigninArgs, SignupArgs, SocialMediaSigninArgs, UpdateRolesArgs, User, UserResponse } from "../types/types.ts";
import { createToken, deleteToken, sendToken } from "../utils/token-handler.ts";
import { 
    deleteUserByIdString, 
    insertUserString, 
    queryByEmailString, 
    queryByIdString, 
    queryByProviderIdString, 
    queryByResetPasswordTokenString, 
    updateRequestResetPasswordString, 
    updateResetPasswordString, 
    updateRolesString, 
    updateTokenVersionString } from "../utils/queryStrings.ts";
import { validatePassword, validateUsername, validateEmail, validateProviderToken } from "../utils/validations.ts";
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

                if (user.facebook_id || user.google_id) {
                    throw new Error(
                        `This account was created using ${user.facebook_id ? 'Facebook login' : 'Google login'}
                        , you cannot login via password. Please use the buttons above`
                    );
                }

                // Check if the reset_password_token is not null
                if (user.reset_password_token) 
                    throw new Error('Please finish reseting your password');

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
                const newTokenVersion = user.token_version + 1;

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
                            href='http://localhost:3000/?resetToken=${reset_password_token}' 
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
                if (authenticatedUser.id === userToBeUpdated.id) throw new Error('You cannot update your roles');

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
        },

    deleteUser: async (
            _: any,
            { id }: { id: string },
            { request }: RouterContext
        ): Promise<{ message: string } | null> => {
            try {
                if (!id) throw new Error('Sorry you cannot proceed');

                // Check if user is authenticated
                const authenticatedUser = await isAuthenticated(request);
                if (!authenticatedUser) throw new Error('You cannot proceed, please log in first');

                // Check if user who is logged in is SUPERADMIN (authorization)
                const isUserSuperadmin = isSuperadmin(authenticatedUser.roles);
                if (!isUserSuperadmin) throw new Error('No authorization');
                if (authenticatedUser.id === id) throw new Error('You cannot delete yourself');

                // Query database for user and delete
                await client.connect();

                const deleteResult = await client.query(deleteUserByIdString(id));
                if (!deleteResult?.query?.result?.rowCount) throw new Error('Error while deleting user');

                await client.end();

                return {
                    message: `User with ID: "${id}" has been deleted`
                }
            } catch (error) {
                console.log(error);
                throw error;
            }
        },

    socialMediaLogin: async (
            _: any,
            { id, email, username, expiration, provider }: SocialMediaSigninArgs,
            { cookies }: RouterContext
        ): Promise<UserResponse | null | undefined> => {
            try {
                //Check if args are correct
                if (!id || !email || !username || !expiration || !provider) 
                    throw new Error('Error while signing up');

                // Validate token
                const isTokenValid = validateProviderToken(+expiration);
                if (!isTokenValid) throw new Error('Sorry cannot proceed');

                // Querry user by provider ID
                await client.connect();

                const result = await client.query(queryByProviderIdString(id, provider));
                const user = result.rowsOfObjects()[0] as User;

                const formattedEmail = email.toLowerCase().trim() || provider;

                if (!user) {
                    // Check if user already has signed up with this email
                    const res = await client.query(queryByEmailString(formattedEmail));
                    const userWithEmail = res.rowsOfObjects()[0] as User;
                    if (userWithEmail)
                        throw new Error('This email is already in use, please try logging in with your password');

                    // Create new user
                    let queryRes;

                    if (provider === Provider.facebook) {
                        queryRes = await client.query(insertUserString(
                            username,
                            formattedEmail,
                            provider,
                            id
                        ));
                    } else {
                        queryRes = await client.query(insertUserString(
                            username,
                            formattedEmail,
                            provider,
                            undefined,
                            id
                        ));
                    }

                    const newUser = queryRes.rowsOfObjects()[0] as User;
                    if (!newUser) throw new Error('Unexpected Error cannot proceed');

                    const userToReturn: UserResponse = {
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        roles: newUser.roles,
                        created_at: newUser.created_at
                    }

                    await client.end();

                // Create & send JWT token
                const token = await createToken(newUser.id, newUser.token_version);
                sendToken(cookies, token);

                return userToReturn;
                } else {
                    const userToReturn: UserResponse = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        roles: user.roles,
                        created_at: user.created_at
                    }

                    await client.end();

                // Create & send JWT token
                const token = await createToken(user.id, user.token_version);
                sendToken(cookies, token);

                return userToReturn;
                }
            } catch (error) {
                console.log(error);
                throw error;
            }
        }
};