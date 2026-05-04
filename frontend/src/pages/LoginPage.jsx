import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { saveAuth } from "../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      saveAuth(res.data.access_token);
      navigate("/");
    } catch (err) {
      let errorMsg = "Login failed";
      if (err.response?.data?.detail) {
        errorMsg = Array.isArray(err.response.data.detail) 
          ? err.response.data.detail[0].msg 
          : err.response.data.detail;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <form className="bg-white p-6 rounded-lg shadow w-full max-w-md space-y-4" onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold">Login</h2>
        <input className="w-full border rounded p-2" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="w-full border rounded p-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">{loading ? "Signing in..." : "Login"}</button>
        <p className="text-sm">No account? <Link className="text-blue-600" to="/signup">Sign up</Link></p>
      </form>
    </div>
  );
}
