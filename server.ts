import { applyGraphQL } from "https://deno.land/x/oak_graphql/mod.ts";
import { Router, RouterContext } from "https://deno.land/x/oak@v6.4.1/router.ts";
import { typeDefs } from './schema/typeDefs.ts';
import { resolvers } from './resolvers/resolvers.ts';


export const GraphQLService = await applyGraphQL<Router>({
    Router,
    typeDefs,
    resolvers,
    context: (ctx: RouterContext) => ctx
});