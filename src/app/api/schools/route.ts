import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const createSchoolSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  currency: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Réservé au super-admin" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchoolSchema.parse(body);

    const existing = await prisma.school.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 400 });
    }

    const school = await prisma.school.create({ data });
    return NextResponse.json(school, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: err.errors[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
