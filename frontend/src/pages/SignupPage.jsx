import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { saveAuth } from "../auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", role: "USER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", form);
      saveAuth(res.data.access_token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <form className="bg-white p-6 rounded-lg shadow w-full max-w-md space-y-4" onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold">Create account</h2>
        <input className="w-full border rounded p-2" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full border rounded p-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">{loading ? "Creating..." : "Sign up"}</button>
        <p className="text-sm">Already have an account? <Link className="text-blue-600" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
