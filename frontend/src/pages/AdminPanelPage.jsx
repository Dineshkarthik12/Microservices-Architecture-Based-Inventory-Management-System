import { useEffect, useState } from "react";
import api from "../api";

export default function AdminPanelPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", stock: 0 });
  const [stockUpdate, setStockUpdate] = useState({});

  const loadProducts = async () => {
    setLoading(true);
    const res = await api.get("/inventory/products");
    setProducts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addProduct = async (e) => {
    e.preventDefault();
    await api.post("/inventory/products", { ...newProduct, stock: Number(newProduct.stock) });
    setNewProduct({ name: "", stock: 0 });
    loadProducts();
  };

  const updateStock = async (id) => {
    await api.patch(`/inventory/products/${id}/stock`, { stock: Number(stockUpdate[id] ?? 0) });
    loadProducts();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin Panel</h2>
      <form className="bg-white p-4 rounded shadow grid md:grid-cols-3 gap-2" onSubmit={addProduct}>
        <input className="border rounded p-2" placeholder="Product name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
        <input className="border rounded p-2" type="number" min="0" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
        <button className="bg-emerald-600 text-white rounded p-2">Add Product</button>
      </form>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Update Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan="4">Loading...</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3 flex gap-2">
                  <input className="border rounded p-1 w-24" type="number" min="0" value={stockUpdate[p.id] ?? p.stock} onChange={(e) => setStockUpdate({ ...stockUpdate, [p.id]: e.target.value })} />
                  <button className="bg-blue-600 text-white px-2 rounded" onClick={() => updateStock(p.id)}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
