"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecordPaymentForm({
  installmentId,
  amountDue,
}: {
  installmentId: string;
  amountDue: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(amountDue);
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/payments/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installmentId, amount, method }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible d'enregistrer ce paiement.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Montant (FCFA)</label>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input w-36"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Moyen</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as "CASH" | "BANK_TRANSFER")}
          className="input w-40"
        >
          <option value="CASH">Espèces</option>
          <option value="BANK_TRANSFER">Virement</option>
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Enregistrement..." : "Enregistrer le paiement"}
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
