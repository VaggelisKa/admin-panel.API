export const Mutation = {
    signup: (parent: any, 
        {username, email, password}: { username: string; email: string, password: string}, 
        ctx: any, info: any) => {
            const newUser = {
                username,
                email,
                password,
            };
            
            return newUser;
        }
};