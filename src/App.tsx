import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./lib/auth";
import { AdminPage } from "./pages/AdminPage";
import { ClassificationPage } from "./pages/ClassificationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FinalPredictionPage } from "./pages/FinalPredictionPage";
import { LoginPage } from "./pages/LoginPage";
import { MatchPredictionsPage } from "./pages/MatchPredictionsPage";
import { RankingPage } from "./pages/RankingPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

export function App() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f9f5] text-sm font-semibold text-emerald-900">
        Carregando bolão...
      </div>
    );
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/palpites" element={<MatchPredictionsPage />} />
        <Route path="/classificacao" element={<ClassificationPage />} />
        <Route path="/final" element={<FinalPredictionPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
