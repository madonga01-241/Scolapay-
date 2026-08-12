import { requireTenantContext } from "@/lib/tenant";
import { getUnpaidDashboard } from "@/lib/dashboard";
import { formatFcfaAmount } from "@/lib/currency";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const data = await getUnpaidDashboard(ctx);

  const totalUnpaid = data.byStudent.reduce((sum, s) => sum + s.unpaidAmount, 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-brand">Suivi des impayés</h1>
          <p className="mt-1 text-sm text-slate-600">
            Vue d&rsquo;ensemble des échéances en attente ou en retard.
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-600">Total impayé</p>
          <p className="mt-1 text-2xl font-semibold text-danger">
            {formatFcfaAmount(totalUnpaid)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">Élèves concernés</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{data.byStudent.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">Classes concernées</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{data.byClassroom.length}</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg text-brand">Par classe</h2>
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Élèves en retard</th>
                <th className="px-4 py-3 font-medium">Effectif</th>
                <th className="px-4 py-3 text-right font-medium">Montant dû</th>
              </tr>
            </thead>
            <tbody>
              {data.byClassroom.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Aucun impayé actuellement — tout est à jour.
                  </td>
                </tr>
              )}
              {data.byClassroom.map((c) => (
                <tr key={c.classroomId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{c.classroomName}</td>
                  <td className="px-4 py-3">
                    {c.studentsWithUnpaid} / {c.studentsCount}
                  </td>
                  <td className="px-4 py-3">{c.studentsCount}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatFcfaAmount(c.totalUnpaidAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg text-brand">Par élève</h2>
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium">Échéances dues</th>
                <th className="px-4 py-3 font-medium">Depuis</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.byStudent.map((s) => (
                <tr key={s.studentId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{s.studentName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.classroomName}</td>
                  <td className="px-4 py-3">
                    <span className="status-pill status-pill--late">{s.unpaidCount} échéance(s)</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatPeriod(s.oldestUnpaidPeriod)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatFcfaAmount(s.unpaidAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/students/${s.studentId}`}
                      className="text-sm text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                    >
                      Voir / encaisser
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
