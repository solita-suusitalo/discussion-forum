import prisma from "../db.js";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_EXPIRY = "24h";

export async function login(
    email: string,
    password: string
): Promise<{ token: string } | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is not set");

    const token = await new SignJWT({ username: user.username })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(user.userId))
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(new TextEncoder().encode(secret));

    return { token };
}

export async function logout(): Promise<void> {
    // Stateless JWT: the token expires on its own
}
