<script lang="ts">
  import { onMount } from "svelte";
  // favicon served from /static/logo.png
  import "../lib/styles/app.scss";
  import { auth } from "$lib/auth.svelte";

  let { children } = $props();

  onMount(() => {
    auth.init();
  });
</script>

<svelte:head>
  <link rel="icon" href="/logo.png" />
  <title>Forum</title>
</svelte:head>

<!-- The header is shared across every page because it lives in the root layout -->
<header class="site-header">
  <div class="container site-header__inner">
    <a href="/" class="site-header__logo nav-underline">
      <img src="/logo.png" alt="Forum" class="site-header__logo-img" />
    </a>

    <nav class="site-nav">
      {#if auth.current}
        <a
          href="/profile"
          class="site-nav__link site-nav__profile nav-underline"
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
        <a href="/login" class="site-nav__link nav-underline">Login</a>
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
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(16, 15, 14, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--color-border);
    padding-block: 0;

    &__inner {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
    }

    &__logo {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }

    &__logo-img {
      height: 64px;
      width: auto;
      display: block;
    }
  }

  .site-nav {
    display: flex;
    align-items: stretch;
    gap: var(--space-4);

    &__link {
      display: flex;
      align-items: center;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      text-decoration: none;

      &:hover {
        color: var(--color-text);
        text-decoration: none;
      }
    }

    &__profile {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);

      &:hover {
        color: var(--color-text);
      }
    }
  }

  // ── Golden underline hover animation ────────────────────────────────────────
  .nav-underline {
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 1.5px;
      background: var(--color-primary);
      transition: width 160ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover::after {
      width: 100%;
    }
  }

  .site-main {
    flex: 1;
  }

  .site-footer {
    border-top: 1px solid var(--color-border);
    padding-block: var(--space-5);

    p {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  }
</style>
