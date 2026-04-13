<script lang="ts">
  import { createApi, ApiError } from "$lib/api";
  import { goto } from "$app/navigation";
  import { auth } from "$lib/auth.svelte";

  let email = $state("");
  let username = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = "";
    loading = true;
    try {
      const api = createApi();
      await api.post("/users", { email, username, password });
      const { token } = await api.post<{ token: string }>("/auth/login", {
        email,
        password,
      });
      auth.login(token);
      goto("/");
    } catch (err) {
      error = err instanceof ApiError ? err.message : "Something went wrong";
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="auth-card">
    <h1>Register</h1>

    {#if error}
      <div class="alert alert--error">{error}</div>
    {/if}

    <form onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          minlength="3"
          maxlength="30"
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>

      <button type="submit" class="btn btn--primary" disabled={loading}>
        {loading ? "Creating account…" : "Register"}
      </button>
    </form>

    <p class="auth-link">Already have an account? <a href="/login">Login</a></p>
  </div>
</div>

<style lang="scss">
  .auth-page {
    display: flex;
    justify-content: center;
    padding-top: var(--space-8);
  }

  .auth-card {
    width: 100%;
    max-width: 26rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);

    h1 {
      font-size: var(--text-2xl);
      font-weight: 700;
      margin-bottom: var(--space-5);
    }

    .alert {
      margin-bottom: var(--space-4);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  .auth-link {
    margin-top: var(--space-4);
    font-size: var(--text-sm);
    text-align: center;
    color: var(--color-text-muted);

    a {
      color: var(--color-primary);
    }
  }
</style>
