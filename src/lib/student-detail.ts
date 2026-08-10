import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole, TenantAccessError, type TenantContext } from "@/lib/tenant";

export async function getStudentDetail(ctx: TenantContext, studentId: string) {
  requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT]);

  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: ctx.schoolId },
    include: {
      classroom: true,
      parent: true,
      installments: {
        orderBy: { period: "desc" },
        include: { payments: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!student) {
    throw new TenantAccessError("Élève introuvable pour cette école", 404);
  }

  return student;
}
