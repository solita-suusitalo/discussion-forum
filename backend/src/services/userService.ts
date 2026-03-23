import prisma from "../db.js";
import type { User } from "../generated/prisma/client.js";

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
    console.log(data);
    return prisma.user.create({
        data: { ...data },
    });
}

export async function updateUser(
    id: number,
    data: Partial<Pick<User, "email" | "username" | "password">>
): Promise<Omit<User, "password"> | null> {
    console.log(id, data);
    return prisma.user.update({
        where: {
            userId: id,
        },
        data: {
            ...data,
        },
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
