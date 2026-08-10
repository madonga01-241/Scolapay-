import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/notifications/send-reminders";

/** Appelé automatiquement par Vercel Cron (voir vercel.json). */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json(result);
}
