import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE URL env variable is not set.");
}

// Create one shared PrismaClient instance for the whole app.
// Re-using a single instance avoids opening a new DB connection pool on every request.
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

export default prisma;
