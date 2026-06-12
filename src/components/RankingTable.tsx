import { Medal } from "lucide-react";
import type { RankingRow } from "../types";

type RankingTableProps = {
  rows: RankingRow[];
  currentUserId?: string;
};

export function RankingTable({ rows, currentUserId }: RankingTableProps) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-4 py-3 text-xs uppercase tracking-[0.14em] text-sky-200">#</th>
              <th className="px-4 py-3 text-xs uppercase tracking-[0.14em] text-sky-200">Nome</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-sky-200">Jogos</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-sky-200">Classificacao</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-sky-200">Final</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-sky-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isCurrent = row.user_id === currentUserId;

              return (
                <tr
                  key={row.user_id}
                  className={[
                    "border-t border-slate-100 transition",
                    isCurrent ? "bg-sky-50" : "bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-black text-slate-900">
                    <span
                      className={[
                        "inline-flex min-w-11 items-center justify-center gap-1 rounded-full px-2 py-1",
                        index < 3 ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {index < 3 ? <Medal size={15} /> : null}
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{row.match_points}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.group_points}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.final_points}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex min-w-14 justify-center rounded-md bg-slate-950 px-3 py-1 text-lg font-black text-white shadow-sm shadow-slate-900/20">
                      {row.total_points}
                    </span>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center font-semibold text-slate-500" colSpan={6}>
                  Nenhum participante no ranking ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
