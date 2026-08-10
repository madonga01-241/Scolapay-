import Link from "next/link";
import { requireTenantContext } from "@/lib/tenant";
import { getStudentDetail } from "@/lib/student-detail";
import { formatFcfaAmount } from "@/lib/currency";
import { RecordPaymentForm } from "./record-payment-form";

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  DUE: "En attente",
  LATE: "En retard",
  PAID: "Payé",
};
const STATUS_CLASS: Record<string, string> = {
  UPCOMING: "status-pill--due",
  DUE: "status-pill--due",
  LATE: "status-pill--late",
  PAID: "status-pill--paid",
};

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireTenantContext();
  const student = await getStudentDetail(ctx, params.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand hover:underline">
        ← Retour au tableau de bord
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl text-brand">{student.fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {student.classroom.name} · Parent : {student.parent.fullName} ({student.parent.phone})
        </p>
      </header>

      <div className="space-y-4">
        {student.installments.map((installment) => {
          const paid = installment.payments
            .filter((p) => p.status === "PAID")
            .reduce((sum, p) => sum + p.amount, 0);
          const remaining = installment.amountDue - paid;

          return (
            <div key={installment.id} className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize text-ink">{formatPeriod(installment.period)}</p>
                  <p className="text-sm text-slate-600">
                    {formatFcfaAmount(installment.amountDue)}
                    {paid > 0 && installment.status !== "PAID" && (
                      <> · déjà réglé : {formatFcfaAmount(paid)}</>
                    )}
                  </p>
                </div>
                <span className={`status-pill ${STATUS_CLASS[installment.status]}`}>
                  {STATUS_LABEL[installment.status]}
                </span>
              </div>

              {installment.status !== "PAID" && (
                <div className="border-t border-slate-100 pt-3">
                  <RecordPaymentForm installmentId={installment.id} amountDue={remaining} />
                </div>
              )}

              {installment.payments.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  {installment.payments.map((p) => (
                    <li key={p.id}>
                      {formatFcfaAmount(p.amount)} · {p.method} · {p.status} ·{" "}
                      {p.createdAt.toLocaleDateString("fr-FR")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {student.installments.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucune échéance générée pour cet élève pour le moment.
          </p>
        )}
      </div>
    </main>
  );
}
