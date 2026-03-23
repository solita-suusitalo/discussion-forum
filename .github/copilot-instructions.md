# GitHub Copilot Instructions: Full-Stack Discussion Forum

## Project Context

This is a full-stack, containerized discussion forum application designed to be production-ready and hosted on Azure Container Apps. The architecture strictly separates the frontend UI from the backend API.

## Tech Stack & Ecosystem

- **Frontend:** SvelteKit, TypeScript
- **Backend:** Node.js (v24 LTS), Express.js, TypeScript (ESM, `NodeNext`)
- **Database & ORM:** PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)
- **Validation:** Zod
- **Infrastructure:** Docker, Terraform, Azure Container Apps

---

## 1. Frontend Conventions (SvelteKit)

The frontend is strictly for the User Interface, routing, and Server-Side Rendering (SSR).

- **Data Fetching:** SvelteKit must retrieve all data by making standard REST HTTP requests (using `fetch`) to the Express backend.
- **No Direct DB Access:** Never write Prisma or database queries inside SvelteKit files (like `+server.ts` or `+page.server.ts`). All database interactions belong in the Express backend.
- **File Structure:** Follow standard SvelteKit file-system routing (`+page.svelte`, `+layout.svelte`, `+page.ts`).
- **State Management:** Use Svelte's native reactivity (stores or runes) for client-side state (like handling the UI for real-time-like comment updates).

---

## 2. Backend Architecture (Express.js)

The backend is a pure REST API following a strict layered architecture: **Router -> Middleware -> Controller -> Service**. Never bypass a layer.

- **Routes (`/src/routes`)**: Maps HTTP methods/URLs to validation middleware, then to controllers. Use strict RESTful naming (e.g., `/api/users`, `/api/posts/:id`).
- **Validation Middleware (`/src/middleware/validate.ts` + `schemas/`)**: All request validation (`body`, `params`, `query`) MUST be done using Zod schemas BEFORE hitting the controller. Use `z.coerce.number()` for URL parameters.
- **Zod**: Using Zod version 4.3 meaning that z.email() is valid, and z.string().email() is invalid.
- **Controllers (`/src/controllers`)**: Responsible ONLY for extracting valid data, calling the Service layer, handling explicit database errors, and sending HTTP responses.
- **Services (`/src/services`)**: Contains pure business logic and Prisma database calls. **Crucial Rule:** Services must be completely agnostic of HTTP. Never import or use Express `Request` or `Response` objects here.

---

## 3. Backend Database & Error Handling (Prisma 7)

- **Prisma 7 ESM Import:** Always import the client from the generated directory using a `.js` extension: `import { PrismaClient } from '../generated/prisma/client/index.js';`
- **Explicit Error Handling (Controllers):** Handle expected errors inside the controller's `try/catch` block by checking `error instanceof Prisma.PrismaClientKnownRequestError`.
  - `P2002` -> Return `409 Conflict` (Unique constraint failed).
  - `P2025` -> Return `404 Not Found` (Record to update/delete not found).
  - `P2003` -> Return `422 Unprocessable Entity` (Foreign key constraint failed).
- **Graceful Nulls:** `prisma.findUnique` returns `null` if not found. Check for `!result` and return `404 Not Found`. Do not throw an error.

---

## 4. General TypeScript & Infrastructure

- **Strict Typing:** Always type Express route parameters explicitly (`req: Request, res: Response, next: NextFunction`). Use `import type` where appropriate.
- **ESM Imports:** All relative imports must use `.js` extensions (required by `moduleResolution: "nodenext"`), even when the source file is `.ts`.
- **Environment Variables:** Assume all configuration (like `DATABASE_URL` or Backend API URLs) is injected via environment variables at runtime, as the apps will be containerized via Docker.

---

## 5. Development Setup

### Start the database

```bash
docker compose up -d
```

### Create `backend/.env`

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/discussion_forum
JWT_SECRET=<32-byte hex string>
PORT=3000
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Install dependencies & run

```bash
cd backend
npm install       # also runs `prisma generate` automatically via postinstall
npm run dev       # tsx watch — hot reload
```

### Key commands

| Command                                | Purpose                                |
| -------------------------------------- | -------------------------------------- |
| `npm run dev`                          | Dev server with hot reload             |
| `npm run build`                        | Compile TypeScript to `dist/`          |
| `npm start`                            | Run production build                   |
| `npm run lint` / `lint:fix`            | ESLint                                 |
| `npx prisma migrate dev --name <desc>` | Create + apply a new migration         |
| `npx prisma generate`                  | Regenerate client after schema changes |
| `npx prisma studio`                    | Visual DB browser                      |

> **No automated test suite yet.** Use `backend/api.rest` with the VS Code REST Client extension for manual endpoint testing.

---

## 6. Common Pitfalls

- **Missing `.js` in relative imports** — `nodenext` module resolution requires them; TypeScript will not compile without them.
- **Never instantiate `PrismaClient` directly in a service** — always import the singleton from `src/db.ts`.
- **`# @name` in `api.rest` must appear _after_ the `###` separator**, not before, for the VS Code REST Client variable capture (`{{login.response.body.token}}`) to work.
- **`noUncheckedIndexedAccess` is enabled** — array/object index access returns `T | undefined`; always guard before use.
- **`exactOptionalPropertyTypes` is enabled** — don't explicitly assign `undefined` to optional fields.
