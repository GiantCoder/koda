import { PointEarnSource } from "@prisma/client";
import { prisma } from "@/prisma/client";

/** Whether the platform awards points for full video upload analyses. */
export async function shouldAwardPointsForUploads(): Promise<boolean> {
  const settings = await getSettings();
  return (
    settings.pointEarnSource === PointEarnSource.UPLOADS_ONLY ||
    settings.pointEarnSource === PointEarnSource.BOTH
  );
}

/** Whether the platform awards points for shadow batting analyses. */
export async function shouldAwardPointsForShadowBatting(): Promise<boolean> {
  const settings = await getSettings();
  return (
    settings.pointEarnSource === PointEarnSource.SHADOW_BATTING_ONLY ||
    settings.pointEarnSource === PointEarnSource.BOTH
  );
}

export async function getSettings(): Promise<{ pointEarnSource: PointEarnSource }> {
  const row = await prisma.gameSettings.upsert({
    where: { id: "default" },
    create: { id: "default", pointEarnSource: "BOTH" },
    update: {},
  });
  return { pointEarnSource: row.pointEarnSource };
}

export async function setPointEarnSource(
  source: PointEarnSource
): Promise<{ pointEarnSource: PointEarnSource }> {
  const row = await prisma.gameSettings.upsert({
    where: { id: "default" },
    create: { id: "default", pointEarnSource: source },
    update: { pointEarnSource: source },
  });
  return { pointEarnSource: row.pointEarnSource };
}
