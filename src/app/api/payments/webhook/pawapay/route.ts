import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("pawaPay callback reçu:", JSON.stringify(body));

    // TODO: vérifier la signature/authenticité du callback selon la doc pawaPay
    // TODO: retrouver le paiement correspondant (via depositId) et mettre à jour son statut

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Erreur webhook pawaPay:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
