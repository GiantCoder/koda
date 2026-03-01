import { prisma } from "@/prisma/client";
import { getBearerToken, verifyJwt } from "@/lib/auth";

export async function getAuthUser(request: Request): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  const headerUserId = request.headers.get("x-auth-user-id");
  const headerRole = request.headers.get("x-auth-role");
  if (headerUserId && headerRole) {
    const userFromHeaders = await prisma.user.findUnique({
      where: { id: headerUserId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!userFromHeaders || !userFromHeaders.isActive) return null;
    return userFromHeaders;
  }

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
