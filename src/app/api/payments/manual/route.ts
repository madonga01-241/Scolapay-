import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant";
import { recordManualPayment } from "@/lib/payments/service";

const schema = z.object({
  installmentId: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER"]),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const body = schema.parse(await req.json());

    const payment = await recordManualPayment({ ctx, ...body });
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    if (err instanceof TenantAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
