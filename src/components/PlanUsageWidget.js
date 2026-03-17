import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Package, 
  HardDrive, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Crown,
  Lock,
  ArrowRight
} from 'lucide-react';


const formatNumber = (value, fallback = "Unlimited") =>
  value === null || value === undefined
    ? fallback
    : Number(value).toLocaleString();


const API_BASE_URL = "https://geo-track-1.onrender.com";

const NeumorphicCard = ({ children, className = "" }) => (
  <div
    className={`p-5 rounded-2xl ${className}`}
    style={{
      background: '#ecf0f3',
      boxShadow: '6px 6px 12px rgba(163,177,198,0.6), -6px -6px 12px rgba(255,255,255, 0.5)',
      border: '1px solid rgba(255,255,255,0.8)',
    }}
  >
    {children}
  </div>
);

const ProgressBar = ({ current, max, unlimited = false, color }) => {
  const percentage = unlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="relative">
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e6eaf0' }}>
        {!unlimited && (
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              background: isAtLimit 
                ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
                : isNearLimit 
                ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                : color,
            }}
          />
        )}
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm font-bold" style={{ color: '#1e293b' }}>
          {formatNumber(current)} {unlimited ? '' : `/ ${formatNumber(max)}`}
        </span>
        {unlimited ? (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(67, 233, 123, 0.2)', color: '#43e97b' }}>
            Unlimited
          </span>
        ) : isAtLimit ? (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
            ⚠️ Limit Reached
          </span>
        ) : isNearLimit ? (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
            ⚠️ {Math.max(0, max - current)} left
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#64748b' }}>
            {Math.floor(((max - current) / max) * 100)}% available
          </span>
        )}
      </div>
    </div>
  );
};

const FeatureBadge = ({ enabled, label }) => (
  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: enabled ? 'rgba(67, 233, 123, 0.1)' : 'rgba(148, 163, 184, 0.1)' }}>
    {enabled ? (
      <CheckCircle className="w-4 h-4" style={{ color: '#43e97b' }} />
    ) : (
      <Lock className="w-4 h-4" style={{ color: '#94a3b8' }} />
    )}
    <span className="text-xs font-medium" style={{ color: enabled ? '#1e293b' : '#94a3b8' }}>
      {label}
    </span>
  </div>
);

const PlanUsageWidget = () => {
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/my-plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch plan data");
      }

      const data = await response.json();
      setPlanData(data);
    } catch (err) {
      console.error("Plan data error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <NeumorphicCard>
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 animate-pulse" style={{ color: '#667eea' }} />
          <p style={{ color: '#64748b' }}>Loading plan information...</p>
        </div>
      </NeumorphicCard>
    );
  }

  if (error) {
    return (
      <NeumorphicCard>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444' }}>Failed to load plan data</p>
          <button 
            onClick={fetchPlanData}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#667eea', color: 'white' }}
          >
            Retry
          </button>
        </div>
      </NeumorphicCard>
    );
  }

  if (!planData) return null;

  const { plan, usage } = planData;
  const isFreePlan = plan.planName === 'starter';
  const isPremium = ['business', 'enterprise'].includes(plan.planName);

  return (
    <div className="space-y-5">
      {/* Plan Header */}
      <NeumorphicCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: isPremium 
                  ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                  : isFreePlan
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '3px 3px 6px rgba(0,0,0,0.15)',
              }}
            >
              {isPremium ? (
                <Crown className="w-8 h-8 text-white" />
              ) : (
                <Sparkles className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>
                  {plan.displayName}
                </h2>
                {isPremium && (
                  <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(250, 112, 154, 0.2)', color: '#fa709a' }}>
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Your current subscription plan
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold" style={{ color: '#667eea' }}>
              ₹{formatNumber(plan.priceINR, "Free")}
            </p>
            <p className="text-xs" style={{ color: '#64748b' }}>per month</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = '/dashboard?page=billingPlans'}
            className="px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
            }}
          >
            <TrendingUp className="w-4 h-4" />
            Upgrade Plan
          </button>
          <button
            onClick={() => window.location.href = '/dashboard?page=billingHistory'}
            className="px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{
              background: '#ecf0f3',
              boxShadow: '3px 3px 6px rgba(163,177,198,0.4), -3px -3px 6px rgba(255,255,255, 0.8)',
              color: '#667eea',
            }}
          >
            View Billing
          </button>
        </div>
      </NeumorphicCard>

      {/* Usage Limits */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
          <HardDrive className="w-5 h-5" style={{ color: '#667eea' }} />
          Resource Usage
        </h3>

        <div className="space-y-5">
          {/* Users */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: '#667eea' }} />
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                Team Members
              </span>
            </div>
            <ProgressBar 
              current={usage.users.current}
              max={usage.users.max}
              color="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
          </div>

          {/* Clients */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: '#43e97b' }} />
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                Clients
              </span>
            </div>
            <ProgressBar 
              current={usage.clients.current}
              max={usage.clients.max}
              unlimited={usage.clients.unlimited}
              color="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            />
          </div>

          {/* Storage */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4" style={{ color: '#4facfe' }} />
              <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
                Cloud Storage
              </span>
            </div>
            <div className="text-sm" style={{ color: '#64748b' }}>
              {plan.limits.storage.maxGB === null
  ? "Unlimited storage"
  : `${plan.limits.storage.maxGB} GB available`}
            </div>
          </div>
        </div>
      </NeumorphicCard>

      {/* Activity Stats */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#43e97b' }} />
          Current Activity
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#667eea' }}>Total Services</p>
            <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>{usage.services}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(67, 233, 123, 0.1)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#43e97b' }}>Total Meetings</p>
            <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>{usage.meetings}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(240, 147, 251, 0.1)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#f093fb' }}>Total Expenses</p>
            <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>{usage.expenses}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(79, 172, 254, 0.1)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#4facfe' }}>Location Logs</p>
            <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>{formatNumber((usage.locationLogs / 1000).toFixed(1), "0")}K
</p>
          </div>
        </div>
      </NeumorphicCard>

      {/* Features */}
      <NeumorphicCard>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1e293b' }}>
          <Package className="w-5 h-5" style={{ color: '#fa709a' }} />
          Available Features
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <FeatureBadge enabled={plan.features.services} label="Client Services" />
          <FeatureBadge enabled={plan.features.tallySync} label="Tally Integration" />
          <FeatureBadge enabled={plan.features.apiAccess} label="API Access" />
          <FeatureBadge enabled={plan.features.advancedAnalytics} label="Advanced Analytics" />
          <FeatureBadge enabled={plan.features.customReports} label="Custom Reports" />
          <FeatureBadge enabled={plan.features.interactiveMaps} label="Interactive Maps" />
          <FeatureBadge enabled={plan.features.bulkOperations} label="Bulk Operations" />
          <FeatureBadge enabled={plan.features.whiteLabel} label="White Label" />
        </div>
      </NeumorphicCard>

      {/* Upgrade Suggestion */}
      {!isPremium && (
        <NeumorphicCard>
          <div 
            className="p-5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
              border: '2px solid rgba(102,126,234,0.3)',
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  boxShadow: '3px 3px 6px rgba(250, 112, 154, 0.4)',
                }}
              >
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold mb-1" style={{ color: '#1e293b' }}>
                  Unlock Premium Features
                </h4>
                <p className="text-sm mb-3" style={{ color: '#64748b' }}>
                  Upgrade to Business or Enterprise for unlimited clients, advanced analytics, and priority support.
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard?page=billingPlans'}
                  className="px-5 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  View Plans
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
};

export default PlanUsageWidget;