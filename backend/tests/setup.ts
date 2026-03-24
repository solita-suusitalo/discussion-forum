// Provide dummy env vars so modules that guard on them at import time don't throw
// during unit tests. The actual db.ts module is mocked in service/controller tests
// so DATABASE_URL is never used to open a real connection.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-hs256";
