import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { TenantAccessError, type TenantContext } from "@/lib/tenant";

export async function getParentChildren(ctx: TenantContext) {
  if (ctx.role !== Role.PARENT) {
    throw new TenantAccessError("Réservé aux comptes parent", 403);
  }

  const parentProfile = await prisma.parentProfile.findFirst({
    where: { userId: ctx.userId, schoolId: ctx.schoolId },
    include: {
      school: true,
      children: {
        include: {
          classroom: true,
          installments: {
            orderBy: { period: "desc" },
            take: 12,
            include: { payments: true },
          },
        },
      },
    },
  });

  if (!parentProfile) {
    throw new TenantAccessError("Profil parent introuvable", 404);
  }

  return parentProfile;
}
