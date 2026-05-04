import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import UserPanelPage from "./pages/UserPanelPage";
import OrdersPage from "./pages/OrdersPage";
import ResultPage from "./pages/ResultPage";
import { getAuth } from "./auth";

function ProtectedRoute({ children }) {
  const { token } = getAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="admin" element={<AdminPanelPage />} />
        <Route path="user" element={<UserPanelPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="result/:type" element={<ResultPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
