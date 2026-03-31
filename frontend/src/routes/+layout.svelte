<script lang="ts">
  import { onMount } from "svelte";
  import favicon from "$lib/assets/favicon.svg";
  import "../lib/styles/app.scss";
  import { auth } from "$lib/auth.svelte";

  let { children } = $props();

  onMount(() => {
    auth.init();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Forum</title>
</svelte:head>

<!-- The header is shared across every page because it lives in the root layout -->
<header class="site-header">
  <div class="container site-header__inner">
    <a href="/" class="site-header__logo">Forum</a>

    <nav class="site-nav">
      {#if auth.current}
        <a
          href="/profile"
          class="site-nav__link site-nav__profile"
          aria-label="Profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><circle cx="12" cy="8" r="4" /><path
              d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            /></svg
          >
          <span>{auth.current.username}</span>
        </a>
      {:else}
        <a href="/login" class="site-nav__link">Login</a>
      {/if}
    </nav>
  </div>
</header>

<main class="site-main">
  <div class="container">
    {@render children()}
  </div>
</main>

<footer class="site-footer">
  <div class="container">
    <p>Forum &copy; {new Date().getFullYear()}</p>
  </div>
</footer>

<style lang="scss">
  .site-header {
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding-block: var(--space-3);
    position: sticky;
    top: 0;
    z-index: 10;

    &__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    &__logo {
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--color-text);

      &:hover {
        text-decoration: none;
        color: var(--color-primary);
      }
    }
  }

  .site-nav {
    display: flex;
    align-items: center;
    gap: var(--space-4);

    &__link {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      font-family: inherit;

      &:hover {
        color: var(--color-text);
        text-decoration: none;
      }
    }

    &__profile {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-text);
    }
  }

  .site-main {
    flex: 1; // pushes the footer to the bottom (body is flex column)
    padding-block: var(--space-6);
  }

  .site-footer {
    border-top: 1px solid var(--color-border);
    padding-block: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-align: center;
  }
</style>
