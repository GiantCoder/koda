import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Queue } from "bullmq";
import { prisma } from "@/prisma/client";
import { uploadToStorage } from "@/src/lib/storage";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * Upload endpoint used by the dashboard upload flow.
 * Persists the video record and enqueues processing for worker-driven analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const queueConnection = {
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
    };
    const videoQueue = new Queue("video-processing", {
      connection: queueConnection,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const assigneeUserIdRaw = formData.get("assigneeUserId");
    const assigneeUserId = typeof assigneeUserIdRaw === "string" && assigneeUserIdRaw.trim()
      ? assigneeUserIdRaw.trim()
      : null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser(request);
    const fallbackUser = authUser
      ? null
      : await prisma.user.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
    const uploaderUserId = authUser?.id ?? fallbackUser?.id;

    if (!uploaderUserId) {
      return NextResponse.json(
        { error: "No active user available to assign uploaded video" },
        { status: 500 }
      );
    }

    let assignedUserId = uploaderUserId;
    if (authUser) {
      if (authUser.role === "COACH" || authUser.role === "ADMIN") {
        if (assigneeUserId) {
          const assignee = await prisma.user.findUnique({
            where: { id: assigneeUserId },
            select: { id: true, role: true, isActive: true },
          });
          if (!assignee || !assignee.isActive || assignee.role !== "PLAYER") {
            return NextResponse.json({ error: "Assigned player not found" }, { status: 404 });
          }
          if (authUser.role === "COACH") {
            const membership = await prisma.squadMember.findFirst({
              where: {
                userId: assignee.id,
                squad: { coachId: authUser.id },
              },
              select: { id: true },
            });
            if (!membership) {
              return NextResponse.json(
                { error: "Forbidden: Player is not in your squad" },
                { status: 403 }
              );
            }
          }
          assignedUserId = assignee.id;
        }
      } else if (authUser.role === "PARENT") {
        const childLinks = await prisma.guardianLink.findMany({
          where: { parentId: authUser.id },
          include: {
            child: {
              select: { id: true, role: true, isActive: true },
            },
          },
        });
        const childPlayers = childLinks
          .map((link) => link.child)
          .filter((child) => child.isActive && child.role === "PLAYER");
        if (childPlayers.length === 0) {
          return NextResponse.json(
            { error: "No child player is linked to your account" },
            { status: 403 }
          );
        }
        if (assigneeUserId) {
          const isLinkedChild = childPlayers.some((child) => child.id === assigneeUserId);
          if (!isLinkedChild) {
            return NextResponse.json(
              { error: "Forbidden: Assigned player is not linked to your account" },
              { status: 403 }
            );
          }
          assignedUserId = assigneeUserId;
        } else if (childPlayers.length === 1) {
          assignedUserId = childPlayers[0].id;
        } else {
          return NextResponse.json(
            { error: "Please select which child player this video is for" },
            { status: 400 }
          );
        }
      } else if (authUser.role === "PLAYER") {
        if (assigneeUserId && assigneeUserId !== authUser.id) {
          return NextResponse.json(
            { error: "Forbidden: Players can only upload videos for themselves" },
            { status: 403 }
          );
        }
        assignedUserId = authUser.id;
      }
    }

    const uploadId = randomUUID();
    const storagePath = `uploads/${assignedUserId}/${uploadId}/${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    await uploadToStorage(storagePath, fileBuffer, file.type || "video/mp4");

    const video = await prisma.video.create({
      data: {
        userId: assignedUserId,
        filename: title?.trim() || file.name,
        originalFormat: file.name.split(".").pop() ?? "mp4",
        storagePath,
        fileSizeBytes: BigInt(file.size),
      },
      select: {
        id: true,
        filename: true,
        fileSizeBytes: true,
      },
    });

    await videoQueue.add("video.process", {
      videoId: video.id,
      userId: assignedUserId,
      description: description?.trim() || null,
    });

    return NextResponse.json({
      id: video.id,
      title: video.filename,
      description: description?.trim() || null,
      filename: file.name,
      size: Number(video.fileSizeBytes),
      assignedUserId,
    });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
