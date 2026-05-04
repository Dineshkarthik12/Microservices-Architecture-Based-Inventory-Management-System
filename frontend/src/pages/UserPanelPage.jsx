import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function UserPanelPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await api.get("/inventory/products");
      setProducts(res.data);
      setLoading(false);
    };
    load();
  }, []);

  const placeOrder = async (productId) => {
    try {
      await api.post("/orders/orders", { product_id: productId, quantity: 1, email });
      navigate("/result/success");
    } catch {
      navigate("/result/failure");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Browse Products</h2>
      <input className="border rounded p-2 bg-white" placeholder="Email for notifications" value={email} onChange={(e) => setEmail(e.target.value)} />
      {loading && <p>Loading products...</p>}
      <div className="grid md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div className="bg-white p-4 rounded shadow space-y-2" key={p.id}>
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-slate-600">Stock: {p.stock}</p>
            <button disabled={!email || p.stock <= 0} className="bg-indigo-600 text-white px-3 py-1 rounded disabled:bg-slate-400" onClick={() => placeOrder(p.id)}>
              Place Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
