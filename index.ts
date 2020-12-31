import { Application } from "./dependencies/oak-deps.ts";
import { GraphQLService } from './server.ts';
import { config } from "./dependencies/dotenv-deps.ts";
import { checkToken } from "./middlewares/token-middleware.ts";
import { oakCors } from './dependencies/cors-deps.ts';

const { PORT, CLIENT_URI } = config();

const app = new Application();

app.use(oakCors(
    {
        credentials: true,
        origin: CLIENT_URI
    }
));

// Middlewares
app.use(checkToken);
app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

console.log("deno server running!!");

await app.listen({ port: +PORT });