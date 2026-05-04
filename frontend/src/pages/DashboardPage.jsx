import { getAuth } from "../auth";

export default function DashboardPage() {
  const { role } = getAuth();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-4">
          <p className="text-slate-500 text-sm">Current Role</p>
          <p className="text-xl font-semibold">{role}</p>
        </div>
        <div className="bg-white rounded shadow p-4">
          <p className="text-slate-500 text-sm">Inventory</p>
          <p className="text-xl font-semibold">Live Product Management</p>
        </div>
        <div className="bg-white rounded shadow p-4">
          <p className="text-slate-500 text-sm">Orders</p>
          <p className="text-xl font-semibold">Track your order history</p>
        </div>
      </div>
    </div>
  );
}
