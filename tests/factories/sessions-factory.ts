import { Session, User } from '@prisma/client';
import { createUser } from './users-factory';
import { prisma } from '@/config';

export async function createSession(token: string, user: User): Promise<Session> {
  return prisma.session.create({
    data: {
      token: token,
      userId: user.id,
    },
  });
}
