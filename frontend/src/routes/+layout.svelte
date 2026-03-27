<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../lib/styles/app.scss";

  // $props() is Svelte 5 runes syntax — every layout/component receives its
  // props this way instead of the old `export let` pattern.
  let { children } = $props();
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
      <a href="/" class="site-nav__link">Home</a>
      <!-- Auth links will be conditionally shown once we add auth in Step 4 -->
      <a href="/login" class="site-nav__link">Login</a>
      <a href="/register" class="site-nav__link btn btn--primary">Register</a>
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

      &:hover {
        color: var(--color-text);
        text-decoration: none;
      }
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
