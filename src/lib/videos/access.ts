import { prisma } from "@/prisma/client";

export type AuthUser = { id: string; email: string; role: string };

export async function getVisibleUserIds(user: AuthUser): Promise<string[] | "all"> {
  if (user.role === "ADMIN") return "all";
  if (user.role === "COACH") {
    const squadMembers = await prisma.squadMember.findMany({
      where: { squad: { coachId: user.id } },
      select: { userId: true },
    });
    return Array.from(new Set([user.id, ...squadMembers.map((m) => m.userId)]));
  }
  if (user.role === "PARENT") {
    const linkedChildren = await prisma.guardianLink.findMany({
      where: { parentId: user.id },
      select: { childId: true },
    });
    return Array.from(new Set([user.id, ...linkedChildren.map((l) => l.childId)]));
  }
  return [user.id];
}

export async function canAccessVideo(
  user: AuthUser,
  videoUserId: string
): Promise<boolean> {
  const visible = await getVisibleUserIds(user);
  if (visible === "all") return true;
  return visible.includes(videoUserId);
}

export function videoVisibilityWhere(user: AuthUser, visible: string[] | "all") {
  return {
    isDeleted: false as const,
    ...(visible === "all" ? {} : { userId: { in: visible } }),
  };
}
