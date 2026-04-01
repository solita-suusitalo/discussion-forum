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
</script>

<a href="/" class="back-link">&larr; Back to discussions</a>

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

  <!-- Post vote widget -->
  <div class="vote-bar">
    <button
      class="vote-btn vote-btn--up"
      class:vote-btn--active={postUserVote === 1}
      disabled={!auth.current || auth.current.userId === data.post.authorId}
      onclick={() => handlePostVote(1)}
      aria-label="Upvote">👍</button
    >
    <span
      class="vote-score"
      class:vote-score--pos={postScore > 0}
      class:vote-score--neg={postScore < 0}>{postScore}</span
    >
    <button
      class="vote-btn vote-btn--down"
      class:vote-btn--active={postUserVote === -1}
      disabled={!auth.current || auth.current.userId === data.post.authorId}
      onclick={() => handlePostVote(-1)}
      aria-label="Downvote">👎</button
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
  <h2 class="comments__heading">
    {comments.length === 0
      ? "No replies yet"
      : `${comments.length} ${comments.length === 1 ? "Reply" : "Replies"}`}
  </h2>

  {#each comments as comment (comment.commentId)}
    <div class="comment">
      <div class="comment__vote">
        <button
          class="vote-btn vote-btn--sm vote-btn--up"
          class:vote-btn--active={commentUserVote(comment.commentId) === 1}
          disabled={!auth.current || auth.current.userId === comment.authorId}
          onclick={() => handleCommentVote(comment.commentId, 1)}
          aria-label="Upvote comment">👍</button
        >
        <span
          class="vote-score"
          class:vote-score--pos={commentScore(comment.commentId) > 0}
          class:vote-score--neg={commentScore(comment.commentId) < 0}
          >{commentScore(comment.commentId)}</span
        >
        <button
          class="vote-btn vote-btn--sm vote-btn--down"
          class:vote-btn--active={commentUserVote(comment.commentId) === -1}
          disabled={!auth.current || auth.current.userId === comment.authorId}
          onclick={() => handleCommentVote(comment.commentId, -1)}
          aria-label="Downvote comment">👎</button
        >
      </div>
      <div class="comment__body">
        <div class="comment__meta">
          <span class="comment__author">{comment.author.username}</span>
          <span class="comment__date">{formatDate(comment.createdAt)}</span>
          {#if auth.current?.userId === comment.authorId}
            <button
              class="comment__delete"
              onclick={() => handleDeleteComment(comment.commentId)}
              aria-label="Delete comment">Delete</button
            >
          {/if}
        </div>
        <p class="comment__text">{comment.content}</p>
      </div>
    </div>
  {/each}

  {#if auth.current}
    <form class="comment-form" onsubmit={handleComment}>
      {#if commentError}
        <div class="alert alert--error">{commentError}</div>
      {/if}
      <div class="form-group">
        <label for="comment-text">Add a reply</label>
        <textarea
          id="comment-text"
          bind:value={commentText}
          required
          rows={3}
          placeholder="Write a reply…"
        ></textarea>
      </div>
      <button
        type="submit"
        class="btn btn--primary"
        disabled={submittingComment}
      >
        {submittingComment ? "Posting…" : "Post Reply"}
      </button>
    </form>
  {:else}
    <p class="comments__login-prompt">
      <a href="/login">Log in</a> to join the discussion.
    </p>
  {/if}
</section>

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

  // ── Vote widget ──────────────────────────────────────────────────────────────
  .vote-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-5);
  }

  .vote-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1;
    transition:
      color 100ms,
      border-color 100ms;

    &:hover:not(:disabled) {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &--up#{&}--active {
      color: #16a34a;
      border-color: #16a34a;
    }

    &--down#{&}--active {
      color: var(--color-danger);
      border-color: var(--color-danger);
    }

    &--sm {
      padding: 2px 6px;
      font-size: 10px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  .vote-score {
    min-width: 2ch;
    text-align: center;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);

    &--pos {
      color: var(--color-primary);
    }
    &--neg {
      color: var(--color-danger);
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────────
  .comments {
    margin-top: var(--space-8);

    &__heading {
      font-size: var(--text-xl);
      font-weight: 600;
      margin-bottom: var(--space-5);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    &__login-prompt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-5);

      a {
        color: var(--color-primary);
      }
    }
  }

  .comment {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-border);

    &__vote {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      min-width: 28px;
    }

    &__body {
      flex: 1;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    &__author {
      font-weight: 600;
      color: var(--color-text);
    }

    &__delete {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--color-danger);
      font-size: var(--text-sm);
      margin-left: auto;

      &:hover {
        text-decoration: underline;
      }
    }

    &__text {
      font-size: var(--text-base);
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      word-break: break-word;
    }
  }

  .comment-form {
    margin-top: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
</style>
