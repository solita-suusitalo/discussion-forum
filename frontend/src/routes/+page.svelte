<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { slide } from "svelte/transition";
  import { auth } from "$lib/auth.svelte";
  import { createApi, ApiError } from "$lib/api";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let title = $state("");
  let content = $state("");
  let formError = $state<string | null>(null);
  let submitting = $state(false);

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    formError = null;
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

  function preview(text: string, max = 120) {
    return text.length > max ? text.slice(0, max).trimEnd() + "\u2026" : text;
  }
</script>

<svelte:head>
  <title>Discussions — Forum</title>
</svelte:head>

<div class="home">
  <header class="home__header">
    <div class="home__heading">
      <span class="home__eyebrow">community discussions</span>
      <p class="home__count">
        {data.summaries.length}
        {data.summaries.length === 1 ? "thread" : "threads"}
      </p>
    </div>

    {#if auth.current}
      <button
        class="compose-btn"
        class:compose-btn--cancel={showForm}
        onclick={() => (showForm = !showForm)}
        aria-expanded={showForm}
      >
        <span class="compose-btn__icon" aria-hidden="true"
          >{showForm ? "×" : "+"}</span
        >
        <span>{showForm ? "Cancel" : "New thread"}</span>
      </button>
    {/if}
  </header>

  {#if showForm}
    <div class="compose-panel" transition:slide={{ duration: 260 }}>
      {#if formError}
        <div class="alert alert--error">{formError}</div>
      {/if}
      <form class="compose-form" onsubmit={handleCreate}>
        <input
          class="compose-form__title-input"
          type="text"
          placeholder="Thread title…"
          bind:value={title}
          required
          maxlength={200}
          autocomplete="off"
        />
        <div class="compose-form__rule"></div>
        <textarea
          class="compose-form__body"
          placeholder="Share your thoughts…"
          bind:value={content}
          required
        ></textarea>
        <div class="compose-form__footer">
          <button
            type="submit"
            class="compose-form__submit"
            disabled={submitting}
          >
            {submitting ? "Publishing…" : "Publish thread"}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="thread-list">
    {#each data.summaries as post, i (post.id)}
      <a
        href="/post/{post.id}"
        class="thread"
        style="animation-delay: {i * 55}ms"
      >
        <span class="thread__index" aria-hidden="true"
          >{String(i + 1).padStart(2, "0")}</span
        >
        <div class="thread__body">
          <h2 class="thread__title">{post.title}</h2>
          <p class="thread__preview">{preview(post.content)}</p>
          <footer class="thread__meta">
            <span class="thread__author">{post.author}</span>
            <span class="thread__dot" aria-hidden="true">·</span>
            <time class="thread__date" datetime={post.createdAt}
              >{formatDate(post.createdAt)}</time
            >
            <span class="thread__replies">
              {post.commentCount === 1
                ? "1 reply"
                : `${post.commentCount} replies`}
            </span>
          </footer>
        </div>
      </a>
    {:else}
      <div class="empty-state">
        <p class="empty-state__text">No threads yet. Start the conversation.</p>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  // ── Page wrapper ────────────────────────────────────────────────────────────
  .home {
    padding-block: var(--space-8);

    &__header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-5);
      margin-bottom: var(--space-7);
      padding-bottom: var(--space-6);
      border-bottom: 1px solid var(--color-border);
    }

    &__eyebrow {
      display: block;
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-primary);
      margin-bottom: var(--space-2);
    }

    &__title {
      font-family: var(--font-display);
      font-size: clamp(2.25rem, 6vw, 3.75rem);
      font-weight: 700;
      color: var(--color-text);
      line-height: 1;
      letter-spacing: -0.025em;
    }

    &__count {
      margin-top: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      letter-spacing: 0.02em;
    }
  }

  // ── Compose button ──────────────────────────────────────────────────────────
  .compose-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 9px 20px;
    background: var(--color-primary-dim);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-full);
    color: var(--color-primary);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    transition:
      background var(--t-fast),
      color var(--t-fast),
      border-color var(--t-fast);
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      background: var(--color-primary);
      color: var(--color-bg);
    }

    &--cancel {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text-muted);

      &:hover {
        background: var(--color-surface-2);
        border-color: var(--color-text-muted);
        color: var(--color-text);
      }
    }

    &__icon {
      font-size: var(--text-lg);
      line-height: 1;
    }
  }

  // ── Compose panel ───────────────────────────────────────────────────────────
  .compose-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-7);
    overflow: hidden;

    .alert {
      margin: var(--space-4) var(--space-5) 0;
    }
  }

  .compose-form {
    &__title-input {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      padding: var(--space-5) var(--space-5) var(--space-3);
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: 600;
      color: var(--color-text);

      &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.45;
      }
    }

    &__rule {
      height: 1px;
      background: var(--color-border);
      margin-inline: var(--space-5);
    }

    &__body {
      display: block;
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      padding: var(--space-4) var(--space-5);
      font-family: var(--font-sans);
      font-size: var(--text-base);
      color: var(--color-text);
      line-height: 1.7;
      min-height: 140px;

      &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.45;
      }
    }

    &__footer {
      display: flex;
      align-items: center;
      padding: var(--space-3) var(--space-5) var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    &__submit {
      padding: 8px 22px;
      background: var(--color-primary);
      color: var(--color-bg);
      border: none;
      border-radius: var(--radius-full);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      transition:
        background var(--t-fast),
        opacity var(--t-fast);
      letter-spacing: 0.01em;

      &:hover {
        background: var(--color-primary-dark);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }

  // ── Thread list ─────────────────────────────────────────────────────────────
  .thread-list {
    display: flex;
    flex-direction: column;
  }

  .thread {
    display: flex;
    align-items: flex-start;
    gap: var(--space-5);
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
    opacity: 0;
    animation: thread-in 380ms var(--t-base) forwards;

    &:first-child {
      border-top: 1px solid var(--color-border);
    }

    &:hover {
      .thread__title {
        color: var(--color-primary);
      }

      .thread__index {
        opacity: 0.9;
      }
    }

    &__index {
      font-family: var(--font-display);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-primary);
      opacity: 0.28;
      min-width: 2rem;
      padding-top: 0.3rem;
      transition: opacity var(--t-fast);
      user-select: none;
      flex-shrink: 0;
    }

    &__body {
      flex: 1;
      min-width: 0;
    }

    &__title {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text);
      line-height: 1.3;
      margin-bottom: var(--space-2);
      transition: color var(--t-fast);
    }

    &__preview {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      line-height: 1.65;
      margin-bottom: var(--space-3);
      overflow-wrap: break-word;
      word-break: break-word;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    &__author {
      font-weight: 600;
    }

    &__dot {
      opacity: 0.35;
    }

    &__replies {
      margin-left: auto;
      font-weight: 600;
      color: var(--color-primary);
      opacity: 0.8;
    }
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  .empty-state {
    padding: var(--space-10) 0;
    text-align: center;

    &__text {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-style: italic;
      color: var(--color-text-muted);
      opacity: 0.6;
    }
  }

  // ── Animation ───────────────────────────────────────────────────────────────
  @keyframes thread-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
