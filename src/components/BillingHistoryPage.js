import { useEffect, useState } from "react";

export default function BillingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const email = user?.email;

  useEffect(() => {
    if (!email) return;

    const fetchBillingHistory = async () => {
      try {
        const res = await fetch(
          `https://lisence-system.onrender.com/api/license/transactions?email=${email}`
        );

        const data = await res.json();

        if (data?.success && Array.isArray(data.transactions)) {
          setHistory(data.transactions);
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error("Failed to fetch billing history:", err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingHistory();
  }, [email]);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">Billing History</h2>
        <p className="text-gray-500">Loading billing history...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-1">Billing History</h2>
      <p className="text-sm text-gray-500 mb-6">
        View your past billing and invoices
      </p>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-gray-500 shadow">
          No billing history found.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Type</th>
              </tr>
            </thead>

            <tbody>
              {history.map((item) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {item.licenseType?.name || "—"}
                  </td>

                  <td className="px-4 py-3">
                    ₹{item.amount ?? item.price ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "PAID" || item.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status || "unknown"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {item.isRenewal ? "Renewal" : "Purchase"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
