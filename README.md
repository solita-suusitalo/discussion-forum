# Discussion Forum

A full-stack, containerized discussion forum with a SvelteKit frontend and a Node.js/Express REST API backed by PostgreSQL.

**Stack:** SvelteKit · Express 5 · Node 24 · TypeScript · Prisma 7 · PostgreSQL 17 · Docker · Zod · JWT (jose)

---

## Architecture

```mermaid
graph LR
    Browser(["Browser"])

    subgraph FE["Frontend (SvelteKit)"]
        Pages["Pages & Layouts\n+page.svelte / +layout.svelte"]
        SSR["Server-Side Fetch\n+page.server.ts"]
    end

    subgraph BE["Backend (Express 5 · Node 24)"]
        subgraph Routes["Routers"]
            R_Auth["/api/auth\nPOST login · logout"]
            R_Users["/api/users\nCRUD"]
            R_Posts["/api/posts\nCRUD"]
            R_Health["GET /api/healthz"]
        end

        subgraph MW["Middleware"]
            RateLimit["Rate Limiter\n(login · 15 req/15 min)"]
            Auth["requireAuth\n(JWT · jose)"]
            Validate["validate(schema)\n(Zod)"]
        end

        subgraph Layer["Business Layer"]
            Controllers["Controllers\nHTTP in/out · error mapping"]
            Services["Services\nbcrypt · JWT sign · pure logic"]
        end
    end

    subgraph DB["Data"]
        Prisma["Prisma ORM\n(@prisma/adapter-pg)"]
        PG[("PostgreSQL 17\nDocker · port 5432")]
    end

    Browser -- "navigate" --> Pages
    Pages -- "SSR fetch" --> SSR
    SSR -- "REST (fetch)" --> Routes
    Browser -- "REST (fetch)" --> Routes

    R_Auth --> RateLimit --> Validate --> Controllers
    R_Users --> Auth --> Validate --> Controllers
    R_Posts --> Auth --> Validate --> Controllers
    R_Health --> Controllers

    Controllers --> Services
    Services --> Prisma
    Prisma --> PG

    PG -. "User 1──< Post\n(authorId FK)" .-> PG
```

### Data Models

| Model  | Key Fields                                                                    | Relation        |
| ------ | ----------------------------------------------------------------------------- | --------------- |
| `User` | `userId` PK · `email` (unique) · `username` (unique) · `password` (bcrypt)    | has many Posts  |
| `Post` | `postId` PK · `title` · `content` · `authorId` FK · `createdAt` · `updatedAt` | belongs to User |

### Auth Flow

1. `POST /api/auth/login` → rate-limited → Zod validation → `bcrypt.compare` → `SignJWT` (HS256, 24 h)
2. Protected routes → `Authorization: Bearer <token>` → `jwtVerify` → injects `req.user`
3. `POST /api/auth/logout` — stateless; client discards token
