import { NextRequest, NextResponse } from "next/server";
import { generateInstallmentsForPeriod } from "@/lib/installments";

/**
 * Appelé automatiquement par Vercel Cron (voir vercel.json). Vercel ajoute
 * lui-même le header `Authorization: Bearer <CRON_SECRET>` quand la
 * variable d'env CRON_SECRET est définie sur le projet — on la vérifie ici
 * pour empêcher qu'un tiers déclenche cette route manuellement.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const result = await generateInstallmentsForPeriod({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  });

  return NextResponse.json(result);
}
