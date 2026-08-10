import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MobileMoneyProvider } from "@prisma/client";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant";
import { registerMerchantAccount, listActiveProvidersForSchool } from "@/lib/payments/merchant-accounts";

const schema = z.object({
  provider: z.nativeEnum(MobileMoneyProvider),
  merchantId: z.string().min(1),
  apiSecret: z.string().min(1),
});

/** L'école enregistre/actualise son propre compte marchand pour un provider. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const body = schema.parse(await req.json());

    const account = await registerMerchantAccount({ ctx, ...body });
    return NextResponse.json(account, { status: 201 });
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

/** Liste les moyens Mobile Money actifs pour l'école courante (affichage parent). */
export async function GET() {
  try {
    const ctx = await requireTenantContext();
    const providers = await listActiveProvidersForSchool(ctx.schoolId);
    return NextResponse.json({ providers });
  } catch (err) {
    if (err instanceof TenantAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
