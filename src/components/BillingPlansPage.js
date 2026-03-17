import { useEffect, useState } from "react";

const PRODUCT_ID = "69589d3ba7306459dd47fd87";
const API_BASE = "https://geo-track-1.onrender.com"; // Change to your backend URL

export default function BillingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyLicense, setCompanyLicense] = useState(null);
  const [userCount, setUserCount] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [renewType, setRenewType] = useState("manual");

  // Get token from localStorage
  const token = localStorage.getItem("token");

  /* ================= FETCH COMPANY LICENSE (FROM YOUR BACKEND) ================= */
  useEffect(() => {
    if (!token) {
      console.warn("No auth token found");
      return;
    }

    const fetchLicense = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/license/my-license`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("📄 COMPANY LICENSE:", data);

        setCompanyLicense(data);
      } catch (err) {
        console.error("Failed to load company license:", err);
        setCompanyLicense(null);
      }
    };

    fetchLicense();
  }, [token]);

  /* ================= FETCH USER COUNT ================= */
  useEffect(() => {
    if (!token) return;

    const fetchUserCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/license/my-license/user-count`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("👥 USER COUNT:", data);

        setUserCount(data);
      } catch (err) {
        console.error("Failed to load user count:", err);
      }
    };

    fetchUserCount();
  }, [token]);

  /* ================= FETCH PLANS FROM LMS ================= */
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(
          `https://lisence-system.onrender.com/api/license/licenses-by-product/69589d3ba7306459dd47fd87`
        );
        const data = await res.json();

        const transformedPlans = (data?.licenses || []).map((plan) => ({
          ...plan,
          licenseType: plan.licenseType,
        }));

        setPlans(transformedPlans);
      } catch (err) {
        console.error("Failed to load plans", err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  /* ================= HELPERS ================= */
  const isCurrentPlan = (plan) => {
    if (!companyLicense?.license?.plan) return false;
    if (!plan?.licenseType?.name) return false;

    // Match by plan name (e.g., "Standard", "Professional", "Business")
    return (
      companyLicense.license.plan.toLowerCase() === 
      plan.licenseType.name.toLowerCase()
    );
  };

  const openModal = (plan) => {
    const currentPlan = companyLicense?.license?.plan || "";
    const isRenew = currentPlan.toLowerCase() === plan.licenseType?.name.toLowerCase();

    setSelectedPlan({
      licenseTypeId: plan.licenseType._id,
      name: plan.licenseType?.name,
      price: plan.licenseType?.price?.amount,
      isRenew,
    });

    setRenewType("manual");
    setShowModal(true);
  };

  const handleProceed = () => {
    console.log("Proceed payload:", {
      licenseTypeId: selectedPlan.licenseTypeId,
      renewType,
      isRenew: selectedPlan.isRenew,
      price: selectedPlan.price,
      companyId: companyLicense?.company?.id,
      companySubdomain: companyLicense?.company?.subdomain,
    });

    // TODO: Redirect to payment gateway or trigger purchase API
    // window.location.href = `payment-url?plan=${selectedPlan.licenseTypeId}`;

    setShowModal(false);
  };

  if (loading) return <div className="p-6">Loading plans...</div>;

  /* ================= DEBUG LOGS ================= */
  console.log("COMPANY LICENSE:", companyLicense);
  console.log("CURRENT PLAN:", companyLicense?.license?.plan);

  plans.forEach((p, i) => {
    console.log(
      "PLAN", i,
      "NAME:", p.licenseType?.name,
      "MATCH:", isCurrentPlan(p)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ================= LICENSE STATUS BANNER ================= */}
      {companyLicense?.license && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          companyLicense.license.isExpired 
            ? 'bg-red-50 border-red-300' 
            : companyLicense.license.isExpiringSoon 
            ? 'bg-yellow-50 border-yellow-300' 
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {companyLicense.company.name}
              </h3>
              <p className="text-sm text-gray-600">
                Current Plan: <strong>{companyLicense.license.plan}</strong>
              </p>
              <p className="text-sm text-gray-600">
                License Key: <code className="bg-gray-200 px-2 py-0.5 rounded">{companyLicense.license.licenseKey}</code>
              </p>
            </div>
            <div className="text-right">
              {companyLicense.license.expiresAt ? (
                <>
                  <p className="text-sm text-gray-600">
                    {companyLicense.license.isExpired ? 'Expired on' : 'Expires on'}
                  </p>
                  <p className="font-semibold">
                    {new Date(companyLicense.license.expiresAt).toLocaleDateString()}
                  </p>
                  {!companyLicense.license.isExpired && (
                    <p className="text-xs text-gray-500 mt-1">
                      ({companyLicense.license.daysUntilExpiry} days remaining)
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-600">No expiry</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= USER COUNT ================= */}
      {userCount && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Current Users</p>
              <p className="text-2xl font-bold">{userCount.currentUsers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Allowed</p>
              <p className="text-2xl font-bold">{userCount.maxAllowedUsers || '∞'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Slots</p>
              <p className="text-2xl font-bold text-green-600">
                {userCount.availableSlots ?? '∞'}
              </p>
            </div>
          </div>
          {userCount.isAtCapacity && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ You've reached your user limit. Upgrade to add more users.
            </p>
          )}
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-6">Pricing Plans</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const type = plan.licenseType || {};
          const active = isCurrentPlan(plan);

          return (
            <div
              key={plan._id}
              className="rounded-2xl p-5 bg-[#ecf0f3] relative"
              style={{
                boxShadow: active
                  ? "inset 6px 6px 12px #c5c8cf, inset -6px -6px 12px #ffffff"
                  : "8px 8px 16px #c5c8cf, -8px -8px 16px #ffffff",
              }}
            >
              {/* ACTIVE BADGE */}
              {active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 
                    bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow">
                  ✓ Active Plan
                </div>
              )}

              <h3 className="text-lg font-semibold mb-1">{type.name}</h3>

              <p className="text-sm text-gray-600 mb-2">
                {type.description || "No description available"}
              </p>

              <div className="text-2xl font-bold mb-1">
                ₹{type.price?.amount ?? 0}
              </div>

              <p className="text-sm text-gray-500 mb-3">
                {type.price?.billingPeriod || "monthly"}
              </p>

              {Array.isArray(type.features) && (
                <ul className="text-sm text-gray-600 mb-4 space-y-1">
                  {type.features.map((f, i) => (
                    <li key={i}>• {f.uiLabel || f}</li>
                  ))}
                </ul>
              )}

              {plan.maxLimits && (
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  <div>Users: {plan.maxLimits.users}</div>
                  <div>Storage: {plan.maxLimits.storageGB} GB</div>
                  <div>API Calls: {plan.maxLimits.apiCalls}</div>
                </div>
              )}

              {active && companyLicense?.license?.expiresAt && (
                <p className="text-xs text-green-700 mb-3">
                  {companyLicense.license.isExpired ? 'Expired on' : 'Renews on'}{" "}
                  <strong>
                    {new Date(companyLicense.license.expiresAt).toLocaleDateString()}
                  </strong>
                </p>
              )}

              {active ? (
                <button
                  disabled
                  className="w-full py-2 rounded-xl font-semibold bg-green-200 text-green-800 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => openModal(plan)}
                  className="w-full py-2 rounded-xl text-white font-medium"
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                  }}
                >
                  {companyLicense?.license ? 'Upgrade' : 'Select Plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-xl overflow-hidden">
            {/* HEADER */}
            <div className="px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedPlan?.isRenew
                      ? "Renew Subscription"
                      : "Upgrade Plan"}
                  </h3>
                  <p className="text-sm opacity-90">
                    {selectedPlan?.name}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-4">
              <div className="relative bg-gray-100 rounded-xl p-1 flex">
                <div
                  className={`absolute top-1 left-1 h-[42px] w-1/2 rounded-lg bg-indigo-600 transition-all ${
                    renewType === "auto" ? "translate-x-full" : ""
                  }`}
                />

                <button
                  className={`relative z-10 flex-1 h-10 font-semibold ${
                    renewType === "manual"
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                  onClick={() => setRenewType("manual")}
                >
                  Renew Manually
                </button>

                <button
                  className={`relative z-10 flex-1 h-10 font-semibold ${
                    renewType === "auto"
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                  onClick={() => setRenewType("auto")}
                >
                  Auto Renew
                </button>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-700">
                {renewType === "manual" ? (
                  <>
                    You will manually renew this subscription when it expires.
                    <div className="text-gray-500 mt-1">
                      No automatic charges.
                    </div>
                  </>
                ) : (
                  <>
                    Subscription will renew automatically before expiry.
                    <div className="text-gray-500 mt-1">
                      You can disable auto-renew anytime.
                    </div>
                  </>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-sm font-semibold mb-2">Order Summary</p>
                <div className="flex justify-between text-sm mb-1">
                  <span>Plan:</span>
                  <span className="font-semibold">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Price:</span>
                  <span className="font-semibold">₹{selectedPlan?.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Type:</span>
                  <span className="font-semibold">
                    {selectedPlan?.isRenew ? 'Renewal' : 'Upgrade'}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t flex justify-between">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={handleProceed}
                className="px-8 py-2 rounded-xl bg-purple-600 text-white font-semibold"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}