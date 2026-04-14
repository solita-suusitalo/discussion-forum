<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { auth } from "$lib/auth.svelte";
  import { createApi, ApiError } from "$lib/api";
  import type { User } from "$lib/types";

  let user = $state<User | null>(null);
  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    if (!auth.current) {
      loading = false;
      return;
    }
    try {
      const api = createApi(globalThis.fetch, auth.current.token);
      user = await api.get<User>(`/users/${auth.current.userId}`);
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Failed to load profile";
    } finally {
      loading = false;
    }
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function handleLogout() {
    try {
      await createApi(globalThis.fetch, auth.current?.token).delete(
        "/auth/logout"
      );
    } finally {
      auth.logout();
      goto("/");
    }
  }
</script>

{#if loading}
  <p class="status">Loading…</p>
{:else if !auth.current}
  <div class="not-logged-in">
    <h1>Profile</h1>
    <p>You are not logged in.</p>
    <a href="/login" class="btn btn--primary">Login</a>
  </div>
{:else if error}
  <div class="alert alert--error">{error}</div>
{:else if user}
  <div class="profile">
    <h1 class="profile__name">{user.username}</h1>
    <dl class="profile__details">
      <dt>Email</dt>
      <dd>{user.email}</dd>
      <dt>Member since</dt>
      <dd>{formatDate(user.createdAt)}</dd>
    </dl>
    <button class="btn btn--outline" onclick={handleLogout}>Logout</button>
  </div>
{/if}

<style lang="scss">
  .status {
    color: var(--color-text-muted);
  }

  .not-logged-in {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);

    h1 {
      font-size: var(--text-3xl);
      font-weight: 700;
    }
  }

  .profile {
    max-width: 32rem;

    &__name {
      font-size: var(--text-3xl);
      font-weight: 700;
      margin-bottom: var(--space-5);
    }

    &__details {
      display: grid;
      grid-template-columns: 8rem 1fr;
      gap: var(--space-2) var(--space-4);
      margin-bottom: var(--space-6);
      font-size: var(--text-base);

      dt {
        color: var(--color-text-muted);
        font-weight: 500;
      }

      dd {
        margin: 0;
      }
    }
  }
</style>
