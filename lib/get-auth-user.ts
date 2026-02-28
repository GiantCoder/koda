import { prisma } from "@/prisma/client";
import { getBearerToken, verifyJwt } from "@/lib/auth";

export async function getAuthUser(request: Request): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const payload = await verifyJwt(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  return user;
}
