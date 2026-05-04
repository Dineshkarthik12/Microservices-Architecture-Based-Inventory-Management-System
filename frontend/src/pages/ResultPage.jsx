import { Link, useParams } from "react-router-dom";

export default function ResultPage() {
  const { type } = useParams();
  const success = type === "success";

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="bg-white shadow rounded p-8 text-center max-w-md">
        <h2 className={`text-2xl font-semibold ${success ? "text-green-600" : "text-red-600"}`}>
          {success ? "Order Successful" : "Order Failed"}
        </h2>
        <p className="mt-2 text-slate-600">
          {success ? "Your order has been placed." : "Something went wrong while placing your order."}
        </p>
        <Link to="/user" className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded">Back to Products</Link>
      </div>
    </div>
  );
}
