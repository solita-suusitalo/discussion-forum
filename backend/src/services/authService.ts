export async function login(email: string, password: string) {
    // TODO: validate credentials against DB, return JWT token
    console.log(email, password);
    return null;
}

export async function logout() {
    // TODO: invalidate session / token
}
