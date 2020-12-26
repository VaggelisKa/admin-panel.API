import { gql } from "https://deno.land/x/oak_graphql/mod.ts";

// GraphQL types
 export const typeDefs = (gql as any) `
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