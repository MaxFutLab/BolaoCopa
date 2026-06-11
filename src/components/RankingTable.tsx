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
          <thead className="bg-emerald-950 text-white">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 text-right">Jogos</th>
              <th className="px-4 py-3 text-right">Classificação</th>
              <th className="px-4 py-3 text-right">Final</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isCurrent = row.user_id === currentUserId;
              return (
                <tr
                  key={row.user_id}
                  className={[
                    "border-t border-slate-100",
                    isCurrent ? "bg-amber-50" : "bg-white",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-black text-emerald-900">
                    <span className="inline-flex items-center gap-2">
                      {index < 3 ? <Medal size={16} /> : null}
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {row.match_points}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {row.group_points}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {row.final_points}
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-black text-emerald-800">
                    {row.total_points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
