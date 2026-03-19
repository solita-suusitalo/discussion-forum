import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();
const PORT = process.env.PORT || 3000;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get('/dbtest', async (req: Request, res: Response) => {
  try {
    const newUser = await prisma.user.create({
      data: {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'hashed_password_here',
      },
    });

    const allUsers = await prisma.user.findMany();
    res.json({ message: "Prisma 7 connected!", new_user: newUser, all_users: allUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});