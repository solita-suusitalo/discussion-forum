export async function getAllPosts() {
    // TODO: return all posts from DB
    return [];
}

export async function getPostById(id: string) {
    // TODO: return post by id from DB
    console.log(id);
    return null;
}

export async function createPost(data: unknown) {
    // TODO: create post in DB
    console.log(data);
    return {};
}

export async function updatePost(id: string, data: unknown) {
    // TODO: update post in DB
    console.log(id, data);
    return null;
}

export async function deletePost(id: string) {
    // TODO: delete post from DB
    console.log(id);
}
