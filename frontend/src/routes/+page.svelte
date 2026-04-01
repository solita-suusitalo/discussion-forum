<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { auth } from "$lib/auth.svelte";
  import { createApi, ApiError } from "$lib/api";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let title = $state("");
  let content = $state("");
  let formError = $state("");
  let submitting = $state(false);

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    formError = "";
    submitting = true;
    try {
      const api = createApi(globalThis.fetch, auth.current?.token);
      await api.post("/posts", { title, content });
      title = "";
      content = "";
      showForm = false;
      await invalidateAll();
    } catch (err) {
      formError =
        err instanceof ApiError ? err.message : "Failed to create post";
    } finally {
      submitting = false;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function preview(content: string, max = 160) {
    return content.length > max
      ? content.slice(0, max).trimEnd() + "\u2026"
      : content;
  }
</script>

<div class="page-header">
  <h1 class="page-title">Recent Discussions</h1>
  {#if auth.current}
    <button class="btn btn--primary" onclick={() => (showForm = !showForm)}>
      {showForm ? "Cancel" : "+ New Discussion"}
    </button>
  {/if}
</div>

{#if showForm}
  <div class="create-form">
    {#if formError}
      <div class="alert alert--error">{formError}</div>
    {/if}
    <form onsubmit={handleCreate}>
      <div class="form-group">
        <label for="post-title">Title</label>
        <input
          id="post-title"
          type="text"
          bind:value={title}
          required
          maxlength="200"
        />
      </div>
      <div class="form-group">
        <label for="post-content">Content</label>
        <textarea id="post-content" bind:value={content} required></textarea>
      </div>
      <button type="submit" class="btn btn--primary" disabled={submitting}>
        {submitting ? "Posting…" : "Post Discussion"}
      </button>
    </form>
  </div>
{/if}

{#each data.summaries as post (post.id)}
  <a href="/post/{post.id}" class="post-card">
    <div class="post-card__header">
      <h2 class="post-card__title">{post.title}</h2>
      <span class="post-card__date">{formatDate(post.createdAt)}</span>
    </div>
    <p class="post-card__preview">{preview(post.content)}</p>
    <footer class="post-card__meta">
      <span class="post-card__author">{post.author}</span>
      <span class="post-card__replies">
        {post.commentCount === 1 ? "1 reply" : `${post.commentCount} replies`}
      </span>
    </footer>
  </a>
{:else}
  <p class="empty">No posts yet.</p>
{/each}

<style lang="scss">
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
  }

  .create-form {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    margin-bottom: var(--space-6);
    box-shadow: var(--shadow-sm);

    form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .alert {
      margin-bottom: var(--space-2);
    }
  }

  .post-card {
    display: block;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    margin-bottom: var(--space-4);
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow-sm);
    transition:
      box-shadow 150ms ease,
      border-color 150ms ease;

    &:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--color-primary);
    }

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    &__title {
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-primary);
    }

    &__date {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    &__preview {
      color: var(--color-text-muted);
      font-size: var(--text-base);
      line-height: 1.6;
      overflow-wrap: break-word;
      word-break: break-word;
      margin-bottom: var(--space-4);
    }

    &__meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    &__author {
      color: var(--color-text-muted);
    }

    &__replies {
      font-weight: 500;
      color: var(--color-primary);
    }
  }

  .empty {
    color: var(--color-text-muted);
  }
</style>
