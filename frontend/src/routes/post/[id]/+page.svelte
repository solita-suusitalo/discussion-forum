<script lang="ts">
  import { invalidateAll, goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { auth } from "$lib/auth.svelte";
  import { createApi, ApiError } from "$lib/api";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const isOwner = $derived(
    auth.current !== null && auth.current.userId === data.post.authorId,
  );

  // ─── Edit state ─────────────────────────────────────────────────────────────
  let editing = $state(false);
  let editTitle = $state(untrack(() => data.post.title));
  let editContent = $state(untrack(() => data.post.content));
  let editError = $state("");
  let saving = $state(false);

  async function handleEdit(e: SubmitEvent) {
    e.preventDefault();
    editError = "";
    saving = true;
    try {
      const api = createApi(globalThis.fetch, auth.current?.token);
      await api.put(`/posts/${data.post.postId}`, {
        title: editTitle,
        content: editContent,
      });
      editing = false;
      await invalidateAll();
    } catch (err) {
      editError = err instanceof ApiError ? err.message : "Failed to save";
    } finally {
      saving = false;
    }
  }

  // ─── Delete state ────────────────────────────────────────────────────────────
  let confirmDelete = $state(false);
  let deleting = $state(false);
  let deleteError = $state("");

  async function handleDelete() {
    deleteError = "";
    deleting = true;
    try {
      const api = createApi(globalThis.fetch, auth.current?.token);
      await api.delete(`/posts/${data.post.postId}`);
      goto("/");
    } catch (err) {
      deleteError = err instanceof ApiError ? err.message : "Failed to delete";
      deleting = false;
      confirmDelete = false;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<a href="/" class="back-link">&larr; Back to discussions</a>

<article class="post">
  <header class="post__header">
    {#if editing}
      <input
        class="edit-title"
        type="text"
        bind:value={editTitle}
        maxlength="200"
      />
    {:else}
      <h1 class="post__title">{data.post.title}</h1>
    {/if}
    <div class="post__meta">
      <span>{data.post.author.username}</span>
      <span>Posted {formatDate(data.post.createdAt)}</span>
      {#if data.post.updatedAt !== data.post.createdAt}
        <span>Edited {formatDate(data.post.updatedAt)}</span>
      {/if}
    </div>
  </header>

  {#if editing}
    <form class="edit-form" onsubmit={handleEdit}>
      {#if editError}
        <div class="alert alert--error">{editError}</div>
      {/if}
      <div class="form-group">
        <label for="edit-content">Content</label>
        <textarea id="edit-content" bind:value={editContent}></textarea>
      </div>
      <div class="edit-form__actions">
        <button type="submit" class="btn btn--primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          class="btn btn--outline"
          onclick={() => {
            editing = false;
            editTitle = data.post.title;
            editContent = data.post.content;
          }}>Cancel</button
        >
      </div>
    </form>
  {:else}
    <div class="post__content">{data.post.content}</div>
  {/if}

  {#if isOwner && !editing}
    <footer class="post__actions">
      <button class="btn btn--outline" onclick={() => (editing = true)}
        >Edit</button
      >
      <button class="btn btn--danger" onclick={() => (confirmDelete = true)}
        >Delete</button
      >
    </footer>

    {#if confirmDelete}
      <div class="confirm-delete">
        {#if deleteError}
          <div class="alert alert--error">{deleteError}</div>
        {/if}
        <p>Are you sure you want to delete this post? This cannot be undone.</p>
        <div class="confirm-delete__actions">
          <button
            class="btn btn--danger"
            onclick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            class="btn btn--outline"
            onclick={() => (confirmDelete = false)}>Cancel</button
          >
        </div>
      </div>
    {/if}
  {/if}
</article>

<style lang="scss">
  .back-link {
    display: inline-block;
    margin-bottom: var(--space-5);
    font-size: var(--text-sm);
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .post {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);

    &__header {
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }

    &__title {
      font-size: var(--text-3xl);
      font-weight: 700;
      margin-bottom: var(--space-3);
    }

    &__meta {
      display: flex;
      gap: var(--space-4);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    &__content {
      font-size: var(--text-base);
      line-height: 1.75;
      white-space: pre-wrap;
      color: var(--color-text);
    }

    &__actions {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-6);
      padding-top: var(--space-5);
      border-top: 1px solid var(--color-border);
    }
  }

  .edit-title {
    width: 100%;
    font-size: var(--text-2xl);
    font-weight: 700;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-3);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);

    &__actions {
      display: flex;
      gap: var(--space-3);
    }
  }

  .confirm-delete {
    margin-top: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
    background: #fdf2f0;

    p {
      font-size: var(--text-sm);
      color: var(--color-danger);
      margin-bottom: var(--space-3);
    }

    &__actions {
      display: flex;
      gap: var(--space-3);
    }
  }
</style>
