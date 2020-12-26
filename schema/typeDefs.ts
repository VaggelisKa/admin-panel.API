import { gql } from "https://deno.land/x/oak_graphql/mod.ts";

// GraphQL types
 export const typeDefs = (gql as any) `
     enum RoleOptions {
        CLIENT
        ITEMEDITOR
        ADMIN
        SUPERADMIN
      }

    type User {
        id: String!
        username: String!
        email: String!
        roles: [RoleOptions!]!
        created_at: String!
    }

    type Query {
        users: [User]!
    }

    type Mutation {
        signup(username: String!, email: String!, password: String!): User
    }
`;