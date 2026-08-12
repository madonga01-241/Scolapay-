import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireRole, TenantAccessError } from "@/lib/tenant";

const createStudentSchema = z.object({
  fullName: z.string().min(2),
  classroomId: z.string().min(1),
  parentId: z.string().min(1),
  monthlyFeeFcfa: z.number().int().positive(), // montant en FCFA, unité entière
});

export async function GET() {
  try {
    const ctx = await requireTenantContext();
    // GET : accessible aux admins/comptables (liste complète) et implicitement
    // filtré par école pour tout le monde — un parent utilisera plutôt
    // /api/parent/students, gardé volontairement séparé pour ne jamais
    // mélanger les règles d'accès "vue globale école" et "vue parent".
    requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT]);

    const students = await prisma.student.findMany({
      where: { schoolId: ctx.schoolId }, // <-- isolation tenant systématique
      include: { classroom: true, parent: true },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json(students);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    requireRole(ctx, [Role.SCHOOL_ADMIN, Role.ACCOUNTANT]);

    const body = await req.json();
    const data = createStudentSchema.parse(body);

    // On vérifie que la classe et le parent ciblés appartiennent bien
    // à la MÊME école que l'utilisateur courant, pour interdire tout
    // rattachement croisé entre écoles.
    const [classroom, parent] = await Promise.all([
      prisma.classroom.findFirst({
        where: { id: data.classroomId, schoolId: ctx.schoolId },
      }),
      prisma.parentProfile.findFirst({
        where: { id: data.parentId, schoolId: ctx.schoolId },
      }),
    ]);

    if (!classroom || !parent) {
      return NextResponse.json(
        { error: "Classe ou parent introuvable pour cette école" },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        schoolId: ctx.schoolId,
        fullName: data.fullName,
        classroomId: data.classroomId,
        parentId: data.parentId,
        monthlyFee: data.monthlyFeeFcfa,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof TenantAccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: err.errors }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
