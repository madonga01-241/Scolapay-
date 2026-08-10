import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MobileMoneyProvider } from "@prisma/client";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant";
import { initiateMobileMoneyPayment } from "@/lib/payments/service";

const schema = z.object({
  installmentId: z.string().cuid(),
  provider: z.nativeEnum(MobileMoneyProvider),
  phone: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const body = schema.parse(await req.json());

    const result = await initiateMobileMoneyPayment({ ctx, ...body });

    return NextResponse.json(result, { status: 201 });
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
