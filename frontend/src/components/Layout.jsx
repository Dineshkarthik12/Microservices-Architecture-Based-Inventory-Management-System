import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../auth";

export default function Layout() {
  const navigate = useNavigate();
  const { role, userId } = getAuth();

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white p-4 space-y-2">
        <h1 className="text-lg font-semibold mb-4">Inventory System</h1>
        <Link className="block p-2 hover:bg-slate-700 rounded" to="/">Dashboard</Link>
        {role === "ADMIN" && <Link className="block p-2 hover:bg-slate-700 rounded" to="/admin">Admin Panel</Link>}
        <Link className="block p-2 hover:bg-slate-700 rounded" to="/user">Products</Link>
        <Link className="block p-2 hover:bg-slate-700 rounded" to="/orders">Orders</Link>
      </aside>

      <main className="flex-1">
        <nav className="bg-white border-b p-4 flex justify-between items-center">
          <div className="text-sm text-slate-700">User #{userId} ({role})</div>
          <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={logout}>Logout</button>
        </nav>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
