<script lang="ts">
  import { invalidateAll, goto } from "$app/navigation";
  import { untrack } from "svelte";
  import { auth } from "$lib/auth.svelte";
  import { createApi, ApiError } from "$lib/api";
  import type { PageData } from "./$types";
  import type { Comment } from "$lib/types";

  let { data }: { data: PageData } = $props();

  const isOwner = $derived(
    auth.current !== null && auth.current.userId === data.post.authorId
  );

  const hasComments = $derived(data.post._count.comments > 0);

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

  // ─── Post vote state (optimistic) ────────────────────────────────────────────
  function sumVotes(votes: { value: number }[]) {
    return votes.reduce((s, v) => s + v.value, 0);
  }

  function myVote(
    votes: { userId: number; value: number }[],
    userId: number | undefined
  ): 1 | -1 | null {
    if (!userId) return null;
    return (votes.find((v) => v.userId === userId)?.value ?? null) as
      | 1
      | -1
      | null;
  }

  let postVotes = $state([...data.post.votes]);
  const postScore = $derived(sumVotes(postVotes));
  const postUserVote = $derived(myVote(postVotes, auth.current?.userId));

  async function handlePostVote(value: 1 | -1) {
    if (!auth.current) return;
    const api = createApi(globalThis.fetch, auth.current.token);
    const uid = auth.current.userId;
    const existing = postUserVote;
    // Optimistic update
    postVotes = postVotes.filter((v) => v.userId !== uid);
    if (existing !== value) {
      postVotes = [...postVotes, { userId: uid, value }];
    }
    try {
      if (existing === value) {
        await api.removePostVote(data.post.postId);
      } else {
        await api.votePost(data.post.postId, value);
      }
    } catch {
      // Revert on failure
      postVotes = [...data.post.votes];
    }
  }

  // ─── Comments state ───────────────────────────────────────────────────────────
  let comments = $state<Comment[]>([...data.post.comments]);

  // Per-comment vote state (map commentId → votes array)
  let commentVotesMap = $state(
    Object.fromEntries(
      data.post.comments.map((c) => [c.commentId, [...c.votes]])
    )
  );

  function commentScore(commentId: number) {
    return sumVotes(commentVotesMap[commentId] ?? []);
  }

  function commentUserVote(commentId: number): 1 | -1 | null {
    return myVote(commentVotesMap[commentId] ?? [], auth.current?.userId);
  }

  async function handleCommentVote(commentId: number, value: 1 | -1) {
    if (!auth.current) return;
    const api = createApi(globalThis.fetch, auth.current.token);
    const uid = auth.current.userId;
    const existing = commentUserVote(commentId);
    // Optimistic update
    const prev = commentVotesMap[commentId] ?? [];
    const next = prev.filter((v) => v.userId !== uid);
    commentVotesMap = {
      ...commentVotesMap,
      [commentId]:
        existing !== value ? [...next, { userId: uid, value }] : next,
    };
    try {
      if (existing === value) {
        await api.removeCommentVote(data.post.postId, commentId);
      } else {
        await api.voteComment(data.post.postId, commentId, value);
      }
    } catch {
      commentVotesMap = {
        ...commentVotesMap,
        [commentId]: prev,
      };
    }
  }

  // ─── Add comment ──────────────────────────────────────────────────────────────
  let commentText = $state("");
  let commentError = $state("");
  let submittingComment = $state(false);

  async function handleComment(e: SubmitEvent) {
    e.preventDefault();
    commentError = "";
    submittingComment = true;
    try {
      const api = createApi(globalThis.fetch, auth.current?.token);
      const newComment = await api.createComment(data.post.postId, commentText);
      comments = [...comments, newComment];
      commentVotesMap = { ...commentVotesMap, [newComment.commentId]: [] };
      commentText = "";
    } catch (err) {
      commentError =
        err instanceof ApiError ? err.message : "Failed to post comment";
    } finally {
      submittingComment = false;
    }
  }

  // ─── Delete comment ───────────────────────────────────────────────────────────
  async function handleDeleteComment(commentId: number) {
    try {
      const api = createApi(globalThis.fetch, auth.current?.token);
      await api.deleteComment(data.post.postId, commentId);
      comments = comments.filter((c) => c.commentId !== commentId);
    } catch {
      // silently ignore — user can retry
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

  const AVATAR_COLORS = [
    "#7c6faa",
    "#5b8fa8",
    "#a8826b",
    "#6b9e7a",
    "#a87a9e",
    "#7a8ea8",
    "#9e8a5b",
    "#6b8ea8",
  ];

  function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return (
      AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!
    );
  }

  function initials(name: string): string {
    return name.slice(0, 2).toUpperCase();
  }
</script>

<article class="post">
  <header class="post__header">
    {#if editing}
      {#if hasComments}
        <h1 class="post__title">{data.post.title}</h1>
        <p class="title-locked">
          Title cannot be changed after replies have been posted.
        </p>
      {:else}
        <input
          class="edit-title"
          type="text"
          bind:value={editTitle}
          maxlength="200"
        />
      {/if}
    {:else}
      <h1 class="post__title">{data.post.title}</h1>
    {/if}
    <div class="post__meta">
      <div
        class="post__author-avatar"
        style="background: {avatarColor(data.post.author.username)}"
        aria-hidden="true"
      >
        {initials(data.post.author.username)}
      </div>
      <span class="post__meta-author">{data.post.author.username}</span>
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

  <!-- Post vote widget -->
  <div
    class="vote-pill"
    class:vote-pill--up-active={postUserVote === 1}
    class:vote-pill--down-active={postUserVote === -1}
  >
    <button
      class="vote-pill__btn vote-pill__btn--up"
      disabled={!auth.current || auth.current.userId === data.post.authorId}
      onclick={() => handlePostVote(1)}
      aria-label="Upvote"
      aria-pressed={postUserVote === 1}>▲</button
    >
    <span
      class="vote-pill__score"
      class:vote-pill__score--pos={postScore > 0}
      class:vote-pill__score--neg={postScore < 0}>{postScore}</span
    >
    <button
      class="vote-pill__btn vote-pill__btn--down"
      disabled={!auth.current || auth.current.userId === data.post.authorId}
      onclick={() => handlePostVote(-1)}
      aria-label="Downvote"
      aria-pressed={postUserVote === -1}>▼</button
    >
  </div>

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

<!-- ── Comments section ──────────────────────────────────────────────────── -->
<section class="comments">
  <header class="comments__header">
    <h2 class="comments__heading">
      {comments.length === 0
        ? "No replies yet"
        : `${comments.length} ${comments.length === 1 ? "reply" : "replies"}`}
    </h2>
  </header>

  {#if comments.length > 0}
    <div class="feed">
      <div class="feed__line"></div>

      {#each comments as comment, i (comment.commentId)}
        <div class="bubble" style="animation-delay: {i * 70}ms">
          <div
            class="bubble__node"
            class:bubble__node--up={commentUserVote(comment.commentId) === 1}
            class:bubble__node--down={commentUserVote(comment.commentId) === -1}
          ></div>
          <div class="bubble__card">
            <div
              class="bubble__avatar"
              style="background: {avatarColor(comment.author.username)}"
              aria-hidden="true"
            >
              {initials(comment.author.username)}
            </div>
            <div class="bubble__body">
              <div class="bubble__header">
                <span class="bubble__author">{comment.author.username}</span>
                <time class="bubble__date" datetime={comment.createdAt}>
                  {formatDate(comment.createdAt)}
                </time>
              </div>
              <p class="bubble__text">{comment.content}</p>
              <footer class="bubble__footer">
                <div
                  class="vote-pill vote-pill--sm"
                  class:vote-pill--up-active={commentUserVote(
                    comment.commentId
                  ) === 1}
                  class:vote-pill--down-active={commentUserVote(
                    comment.commentId
                  ) === -1}
                >
                  <button
                    class="vote-pill__btn vote-pill__btn--up"
                    disabled={!auth.current ||
                      auth.current.userId === comment.authorId}
                    onclick={() => handleCommentVote(comment.commentId, 1)}
                    aria-label="Upvote comment"
                    aria-pressed={commentUserVote(comment.commentId) === 1}
                    >▲</button
                  >
                  <span
                    class="vote-pill__score"
                    class:vote-pill__score--pos={commentScore(
                      comment.commentId
                    ) > 0}
                    class:vote-pill__score--neg={commentScore(
                      comment.commentId
                    ) < 0}>{commentScore(comment.commentId)}</span
                  >
                  <button
                    class="vote-pill__btn vote-pill__btn--down"
                    disabled={!auth.current ||
                      auth.current.userId === comment.authorId}
                    onclick={() => handleCommentVote(comment.commentId, -1)}
                    aria-label="Downvote comment"
                    aria-pressed={commentUserVote(comment.commentId) === -1}
                    >▼</button
                  >
                </div>
                {#if auth.current?.userId === comment.authorId}
                  <button
                    class="bubble__delete"
                    onclick={() => handleDeleteComment(comment.commentId)}
                    aria-label="Delete comment">Delete</button
                  >
                {/if}
              </footer>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if auth.current}
    <form class="reply-form" onsubmit={handleComment}>
      {#if commentError}
        <div class="alert alert--error">{commentError}</div>
      {/if}
      <div class="reply-form__input-row">
        <div
          class="reply-form__avatar"
          style="background: {avatarColor(auth.current.username)}"
          aria-hidden="true"
        >
          {initials(auth.current.username)}
        </div>
        <textarea
          class="reply-form__textarea"
          id="comment-text"
          bind:value={commentText}
          required
          rows={3}
          placeholder="Write a reply…"
        ></textarea>
      </div>
      <div class="reply-form__actions">
        <button
          type="submit"
          class="reply-form__submit"
          disabled={submittingComment}
          >{submittingComment ? "Posting…" : "Post reply"}</button
        >
      </div>
    </form>
  {:else}
    <p class="comments__login-prompt">
      <a href="/login">Log in</a> to join the discussion.
    </p>
  {/if}
</section>

<style lang="scss">
  .post {
    margin-top: var(--space-7);
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
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    &__author-avatar {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 0.04em;
      user-select: none;
    }

    &__meta-author {
      font-weight: 600;
      color: var(--color-text);
    }

    &__content {
      font-size: var(--text-base);
      line-height: 1.75;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      word-break: break-word;
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

  .title-locked {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-style: italic;
    margin-top: var(--space-2);
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

  // ── Vote pill ─────────────────────────────────────────────────────────────────
  .vote-pill {
    display: inline-flex;
    align-items: stretch;
    margin-top: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
    background: var(--color-surface);

    &__btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 7px 16px;
      font-size: 11px;
      line-height: 1;
      color: var(--color-text-muted);
      cursor: pointer;
      transition:
        background var(--t-fast),
        color var(--t-fast);

      &--up {
        border-right: 1px solid transparent;
        transition:
          background var(--t-fast),
          color var(--t-fast),
          border-color var(--t-fast);

        &:hover:not(:disabled) {
          background: var(--color-primary-dim);
          color: var(--color-primary);
        }
      }

      &--down {
        border-left: 1px solid transparent;
        transition:
          background var(--t-fast),
          color var(--t-fast),
          border-color var(--t-fast);

        &:hover:not(:disabled) {
          background: rgba(217, 95, 75, 0.1);
          color: var(--color-danger);
        }
      }

      &:disabled {
        opacity: 0.3;
        cursor: default;
      }
    }

    // Internal dividers appear when hovering the pill
    &:hover &__btn--up {
      border-right-color: var(--color-border);
    }
    &:hover &__btn--down {
      border-left-color: var(--color-border);
    }

    &__score {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      min-width: 2.5rem;
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.02em;
      user-select: none;

      &--pos {
        color: var(--color-primary);
      }
      &--neg {
        color: var(--color-danger);
      }
    }

    // Active states — button tinted when vote is cast
    &--up-active &__btn--up {
      color: var(--color-primary);
      background: var(--color-primary-dim);
      border-right-color: var(--color-border);
    }

    &--down-active &__btn--down {
      color: var(--color-danger);
      background: rgba(217, 95, 75, 0.1);
      border-left-color: var(--color-border);
    }

    // Small variant for comments
    &--sm {
      margin-top: 0;
    }
    &--sm &__btn {
      padding: 5px 12px;
      font-size: 10px;
    }
    &--sm &__score {
      padding: 0 8px;
      min-width: 2rem;
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────────
  .comments {
    margin-top: var(--space-8);
    margin-bottom: var(--space-7);

    &__header {
      margin-bottom: var(--space-5);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    &__heading {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 600;
      color: var(--color-text);
    }

    &__login-prompt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-5);
      padding-left: 48px;

      a {
        color: var(--color-primary);
      }
    }
  }

  // ── Timeline feed ────────────────────────────────────────────────────────────
  .feed {
    position: relative;
    padding-left: 48px;

    &__line {
      position: absolute;
      left: 16px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: linear-gradient(
        to bottom,
        transparent,
        var(--color-border) 6%,
        var(--color-border) 94%,
        transparent
      );
      pointer-events: none;
    }
  }

  // ── Comment bubble ───────────────────────────────────────────────────────────
  .bubble {
    position: relative;
    padding-bottom: var(--space-4);
    opacity: 0;
    animation: bubble-in 320ms ease forwards;

    &__node {
      position: absolute;
      left: -38px;
      top: 14px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-surface-2);
      border: 2px solid var(--color-border);
      transition:
        background var(--t-fast),
        border-color var(--t-fast),
        box-shadow var(--t-fast);
      z-index: 1;

      &--up {
        background: var(--color-primary-dim);
        border-color: var(--color-primary);
        box-shadow: 0 0 8px rgba(201, 161, 74, 0.35);
      }

      &--down {
        background: rgba(217, 95, 75, 0.12);
        border-color: var(--color-danger);
        box-shadow: 0 0 8px rgba(217, 95, 75, 0.25);
      }
    }

    &__card {
      display: flex;
      gap: var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      transition:
        border-color var(--t-fast),
        box-shadow var(--t-fast);

      &:hover {
        border-color: rgba(201, 161, 74, 0.2);
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
      }
    }

    &__avatar {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xs);
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 0.04em;
      user-select: none;
    }

    &__body {
      flex: 1;
      min-width: 0;
    }

    &__header {
      display: flex;
      align-items: baseline;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
      flex-wrap: wrap;
    }

    &__author {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-text);
    }

    &__date {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-primary);
      opacity: 0.8;
      letter-spacing: 0.02em;
    }

    &__text {
      font-size: var(--text-sm);
      line-height: 1.7;
      color: var(--color-text);
      white-space: pre-wrap;
      overflow-wrap: break-word;
      word-break: break-word;
      margin-bottom: var(--space-3);
    }

    &__footer {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    &__delete {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      opacity: 0.4;
      letter-spacing: 0.04em;

      &:hover {
        color: var(--color-danger);
        opacity: 1;
      }
    }
  }

  // ── Reply form ───────────────────────────────────────────────────────────────
  .reply-form {
    margin-top: var(--space-5);
    padding-left: 48px;

    &__input-row {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }

    &__avatar {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xs);
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 0.04em;
      user-select: none;
      margin-top: 2px;
    }

    &__textarea {
      flex: 1;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--color-text);
      resize: none;
      outline: none;
      line-height: 1.6;
      transition:
        border-color var(--t-fast),
        box-shadow var(--t-fast);

      &::placeholder {
        color: var(--color-text-muted);
        opacity: 0.4;
      }

      &:focus {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-focus);
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-3);
    }

    &__submit {
      padding: 7px 20px;
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

      &:hover {
        background: var(--color-primary-dark);
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }

  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateX(14px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
