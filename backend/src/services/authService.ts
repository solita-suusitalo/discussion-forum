import prisma from "../db.js";

// TODO: install bcrypt and jsonwebtoken (or a library like jose) to complete this service.
// Example: npm install bcrypt jsonwebtoken && npm install -D @types/bcrypt @types/jsonwebtoken

export async function login(
    email: string,
    password: string
): Promise<{ token: string } | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    // TODO: replace with bcrypt.compare(password, user.password)
    const passwordMatch = password === user.password;
    if (!passwordMatch) return null;

    // TODO: replace with jwt.sign({ sub: user.userId }, process.env.JWT_SECRET, { expiresIn: "1d" })
    const token = "TODO_JWT_TOKEN";
    return { token };
}

export async function logout(): Promise<void> {
    // TODO: if using refresh tokens, invalidate the token in the DB here
}
