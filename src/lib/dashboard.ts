import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole, type TenantContext } from "@/lib/tenant";

export type UnpaidStudentSummary = {
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  unpaidCount: number;
  unpaidAmount: number; // dans la devise de l'école (une seule école par appel, jamais mélangée)
  oldestUnpaidPeriod: string; // "2026-09"
};

export type UnpaidClassroomSummary = {
  classroomId: string;
  classroomName: string;
  studentsCount: number;
  studentsWithUnpaid: number;
  totalUnpaidAmount: number;
};

export type UnpaidDashboard = {
  currency: string; // une seule école = une seule devise, jamais additionnée entre écoles
  byClassroom: UnpaidClassroomSummary[];
  byStudent: UnpaidStudentSummary[];
};

/**
 * Tableau de bord des impayés pour L'ÉCOLE de l'utilisateur courant
 * uniquement (isolation tenant appliquée par requireTenantContext en amont).
 * Ne retourne jamais de somme cross-écoles : si un opérateur gère plusieurs
 * écoles (zones XOF et XAF mélangées), cette fonction doit être appelée une
 * fois par école et les résultats affichés séparément, jamais additionnés.
 */
export async function getUnpaidDashboard(ctx: TenantContext): Promise<UnpaidDashboard> {
  requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT]);

  const school = await prisma.school.findUniqueOrThrow({
    where: { id: ctx.schoolId },
    select: { currency: true },
  });

  const unpaidInstallments = await prisma.installment.findMany({
    where: {
      schoolId: ctx.schoolId,
      status: { in: ["DUE", "LATE"] },
    },
    include: {
      student: { include: { classroom: true } },
    },
    orderBy: { period: "asc" },
  });

  const byStudentMap = new Map<string, UnpaidStudentSummary>();

  for (const installment of unpaidInstallments) {
    const s = installment.student;
    const existing = byStudentMap.get(s.id);

    if (existing) {
      existing.unpaidCount += 1;
      existing.unpaidAmount += installment.amountDue;
      if (installment.period < existing.oldestUnpaidPeriod) {
        existing.oldestUnpaidPeriod = installment.period;
      }
    } else {
      byStudentMap.set(s.id, {
        studentId: s.id,
        studentName: s.fullName,
        classroomId: s.classroomId,
        classroomName: s.classroom.name,
        unpaidCount: 1,
        unpaidAmount: installment.amountDue,
        oldestUnpaidPeriod: installment.period,
      });
    }
  }

  const byStudent = Array.from(byStudentMap.values()).sort(
    (a, b) => b.unpaidAmount - a.unpaidAmount
  );

  // Agrégation par classe à partir du détail par élève (source unique de
  // vérité, pour ne jamais désynchroniser les deux vues).
  const byClassroomMap = new Map<string, UnpaidClassroomSummary>();
  for (const student of byStudent) {
    const existing = byClassroomMap.get(student.classroomId);
    if (existing) {
      existing.studentsWithUnpaid += 1;
      existing.totalUnpaidAmount += student.unpaidAmount;
    } else {
      byClassroomMap.set(student.classroomId, {
        classroomId: student.classroomId,
        classroomName: student.classroomName,
        studentsCount: 0, // complété ci-dessous
        studentsWithUnpaid: 1,
        totalUnpaidAmount: student.unpaidAmount,
      });
    }
  }

  // Complète le nombre total d'élèves par classe (y compris ceux à jour),
  // utile pour afficher un taux de recouvrement par classe.
  const classroomTotals = await prisma.student.groupBy({
    by: ["classroomId"],
    where: { schoolId: ctx.schoolId, active: true },
    _count: { id: true },
  });
  for (const row of classroomTotals) {
    const entry = byClassroomMap.get(row.classroomId);
    if (entry) entry.studentsCount = row._count.id;
  }

  const byClassroom = Array.from(byClassroomMap.values()).sort(
    (a, b) => b.totalUnpaidAmount - a.totalUnpaidAmount
  );

  return { currency: school.currency, byClassroom, byStudent };
}
