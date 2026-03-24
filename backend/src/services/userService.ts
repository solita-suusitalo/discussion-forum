import prisma from "../db.js";
import type { User } from "../generated/prisma/client.js";
import bcrypt from "bcryptjs";

export async function getAllUsers(): Promise<Omit<User, "password">[]> {
    return prisma.user.findMany({
        select: {
            userId: true,
            email: true,
            username: true,
            createdAt: true,
        },
    });
}

export async function getUserById(
    id: number
): Promise<Omit<User, "password"> | null> {
    console.log(id);
    return prisma.user.findUnique({
        where: {
            userId: id,
        },
        select: {
            userId: true,
            email: true,
            username: true,
            createdAt: true,
        },
    });
}

export async function createUser(
    data: Omit<User, "createdAt" | "userId">
): Promise<Omit<User, "password">> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log("createUser:", { email: data.email, username: data.username });
    return prisma.user.create({
        data: { ...data, password: hashedPassword },
        select: {
            userId: true,
            email: true,
            username: true,
            createdAt: true,
        },
    });
}

export async function updateUser(
    id: number,
    data: { email?: string; username?: string; password?: string }
): Promise<Omit<User, "password">> {
    const updateData: { email?: string; username?: string; password?: string } =
        {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password !== undefined)
        updateData.password = await bcrypt.hash(data.password, 10);
    console.log("updateUser:", id, {
        email: updateData.email,
        username: updateData.username,
    });
    return prisma.user.update({
        where: { userId: id },
        data: updateData,
        select: {
            userId: true,
            email: true,
            username: true,
            createdAt: true,
        },
    });
}

export async function deleteUser(id: number): Promise<User> {
    console.log(id);
    return prisma.user.delete({
        where: {
            userId: id,
        },
    });
}
