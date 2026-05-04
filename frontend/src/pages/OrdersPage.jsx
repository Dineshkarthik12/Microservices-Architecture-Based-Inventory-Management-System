import { useEffect, useState } from "react";
import api from "../api";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await api.get("/orders/orders");
      setOrders(res.data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Orders</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Order ID</th>
              <th className="p-3 text-left">Product ID</th>
              <th className="p-3 text-left">Qty</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan="4">Loading...</td></tr> : orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">{o.id}</td>
                <td className="p-3">{o.product_id}</td>
                <td className="p-3">{o.quantity}</td>
                <td className="p-3">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
