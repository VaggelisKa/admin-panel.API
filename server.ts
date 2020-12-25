import { applyGraphQL, gql } from "https://deno.land/x/oak_graphql/mod.ts";
import { Router, RouterContext } from "https://deno.land/x/oak@v6.4.1/router.ts";

import { client } from './database/db.ts';

// GraphQL type
const typeDefs = (gql as any) `
    type User {
        username: String!
        email: String!
        password: String!
    }

    type Query {
        users: [User]!
    }

    type Mutation {
        signup(username: String!, email: String!, password: String!): User
    }
`;


// Resolvers
const resolvers = {
    Query: {
        users: async () => {
            await client.connect();

            const result = await client.query('SELECT * FROM users;')

            const users = result.rowsOfObjects();

            return users;
        }
    },

    Mutation: {
        signup: (parent: any, 
            {username, email, password}: { username: string; email: string, password: string}, 
            ctx: any, info: any) => {
                const newUser = {
                    username,
                    email,
                    password,
                };

                // users.push(newUser);

                return newUser;
            }
    }
};

export const GraphQLService = await applyGraphQL<Router>({
    Router,
    typeDefs,
    resolvers,
    context: (ctx: RouterContext) => ctx
});