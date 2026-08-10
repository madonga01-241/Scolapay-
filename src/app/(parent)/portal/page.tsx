import { requireTenantContext } from "@/lib/tenant";
import { getParentChildren } from "@/lib/parent-view";
import { formatFcfaAmount } from "@/lib/currency";
import { SignOutButton } from "../sign-out-button";

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  DUE: "À régler",
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

export default async function ParentPortalPage() {
  const ctx = await requireTenantContext();
  const parent = await getParentChildren(ctx);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-brand">Bonjour {parent.fullName.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-slate-600">{parent.school.name}</p>
        </div>
        <SignOutButton />
      </header>

      <div className="space-y-8">
        {parent.children.map((child) => {
          const unpaid = child.installments.filter((i) => i.status !== "PAID");
          const totalDue = unpaid.reduce((sum, i) => sum + i.amountDue, 0);

          return (
            <section key={child.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium text-ink">{child.fullName}</h2>
                <span className="text-sm text-slate-600">{child.classroom.name}</span>
              </div>

              {totalDue > 0 ? (
                <div className="card mb-3 bg-danger/5">
                  <p className="text-sm text-slate-600">Solde à régler</p>
                  <p className="text-xl font-semibold text-danger">{formatFcfaAmount(totalDue)}</p>
                </div>
              ) : (
                <div className="card mb-3 bg-success/5">
                  <p className="text-sm font-medium text-success">Scolarité à jour ✓</p>
                </div>
              )}

              <div className="card !p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {child.installments.map((installment) => (
                      <tr key={installment.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 capitalize text-ink">
                          {formatPeriod(installment.period)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatFcfaAmount(installment.amountDue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`status-pill ${STATUS_CLASS[installment.status]}`}>
                            {STATUS_LABEL[installment.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
