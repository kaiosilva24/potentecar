import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Dashboard from "./components/pages/dashboard";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen, LoadingSpinner } from "./components/ui/loading-spinner";
import { QueryProvider } from "./providers/QueryProvider";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/login" element={<LoginForm />} />
        {/* Rota de signup removida por segurança - apenas admins podem criar usuários */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        {/* Redirecionar qualquer rota não encontrada para login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen text="Loading application..." />}>
          <AppRoutes />
        </Suspense>
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
