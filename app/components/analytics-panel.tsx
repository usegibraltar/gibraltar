export type DraftAnalytics = {
  enabled: boolean;
  message?: string;
  summary: {
    windowDays: number;
    total: number;
    created: number;
    sent: number;
    responded: number;
    failed: number;
    handled: number;
    followUpsScheduled: number;
    followUpsCompleted: number;
    junkRemoved: number;
    successRate: number;
    sendRate: number;
    conversionRate: number;
    inquiryTypes: Array<{ category: string; label: string; count: number }>;
    urgencyMix: Array<{ urgency: string; count: number }>;
    variants: Array<{
      label: string;
      created: number;
      sent: number;
      responded: number;
      conversionRate: number;
      failed: number;
      total: number;
    }>;
    daily: Array<{ date: string; count: number }>;
    recentSubjects: string[];
  };
};

export function AnalyticsPanel({ analytics }: { analytics: DraftAnalytics | null }) {
  if (!analytics) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="font-black">No analytics yet</p>
        <p className="mt-2 leading-7 text-slate-600">
          Connect Gmail, generate a reply, and use Send now. Conversion rates appear after customers reply in those Gmail threads.
        </p>
      </div>
    );
  }

  if (!analytics.enabled) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
        {analytics.message ?? "Run the latest Supabase SQL to enable analytics."}
      </div>
    );
  }

  const { summary } = analytics;
  const maxDaily = Math.max(...summary.daily.map((day) => day.count), 1);

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <MetricCard label="Handled" value={String(summary.handled)} detail={`Last ${summary.windowDays} days`} />
        <MetricCard label="Drafts" value={String(summary.created)} detail={`Last ${summary.windowDays} days`} />
        <MetricCard label="Sent now" value={String(summary.sent)} detail={`${summary.sendRate}% of created drafts`} />
        <MetricCard label="Follow-ups" value={String(summary.followUpsScheduled)} detail={`${summary.followUpsCompleted} completed`} />
        <MetricCard label="Junk removed" value={String(summary.junkRemoved)} detail="Removed from Gibraltar review" />
        <MetricCard
          label="Response rate"
          value={`${summary.conversionRate}%`}
          detail={`${summary.responded} customer replies`}
          tooltip="Only emails sent with Gibraltar's Send now button can be tracked for customer replies."
        />
      </div>
      <div className="grid gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black uppercase text-slate-500">Most common inquiry types</p>
          <div className="mt-3 grid gap-2">
            {summary.inquiryTypes.length ? summary.inquiryTypes.slice(0, 6).map((item) => (
              <div key={item.category} className="flex items-center justify-between rounded-lg bg-white p-3">
                <p className="font-black">{item.label}</p>
                <p className="text-sm font-semibold text-slate-500">{item.count}</p>
              </div>
            )) : (
              <p className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-600">No categorized messages yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black uppercase text-slate-500">Variant conversion</p>
          <div className="mt-3 grid gap-2">
            {summary.variants.length ? summary.variants.map((variant) => (
              <div key={variant.label} className="rounded-lg bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{variant.label}</p>
                  <p className="text-sm font-semibold text-slate-500">
                    {variant.conversionRate}% · {variant.responded} replies / {variant.sent} sent
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${variant.sent ? Math.max(8, variant.conversionRate) : 0}%` }} />
                </div>
              </div>
            )) : (
              <div className="rounded-lg bg-white p-4">
                <p className="font-black">No sent variants yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use Send now from the reply review panel. When a customer replies in that thread, Gibraltar will count it here.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black uppercase text-slate-500">Drafts by day</p>
          <div className="mt-3 flex h-28 items-end gap-2">
            {summary.daily.length ? summary.daily.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-teal-500" style={{ height: `${Math.max(8, (day.count / maxDaily) * 100)}%` }} />
                <span className="text-[10px] font-bold text-slate-400">{day.date.slice(5)}</span>
              </div>
            )) : <p className="self-center text-sm leading-6 text-slate-600">No draft activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, tooltip }: { label: string; value: string; detail: string; tooltip?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-black uppercase text-slate-500">{label}</p>
        {tooltip ? (
          <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-black text-slate-500">
            ?
            <span className="pointer-events-none absolute left-1/2 top-7 z-10 hidden w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold normal-case leading-5 text-slate-600 shadow-xl shadow-slate-200/70 group-hover:block">
              {tooltip}
            </span>
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </div>
  );
}
