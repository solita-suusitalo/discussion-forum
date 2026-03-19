export async function getAllUsers() {
    // TODO: return all users from DB
    return [];
}

export async function getUserById(id: string) {
    // TODO: return user by id from DB
    console.log(id);
    return null;
}

export async function createUser(data: unknown) {
    // TODO: create user in DB
    console.log(data);
    return {};
}

export async function updateUser(id: string, data: unknown) {
    // TODO: update user in DB
    console.log(id, data);
    return null;
}

export async function deleteUser(id: string) {
    // TODO: delete user from DB
    console.log(id);
}
