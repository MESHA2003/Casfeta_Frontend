import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  HandCoins,
  Home,
  Landmark,
  Megaphone,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import {
  api,
  clearTokens,
  getApiErrorMessage,
  getApiList,
  getCurrentUser,
  hasAccessToken,
} from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Regional Dashboard — CASFETA Zanzibar" },
      { name: "description", content: "CASFETA Zanzibar regional administration, statistics, and platform management." },
      { property: "og:title", content: "Regional Dashboard — CASFETA Zanzibar" },
      { property: "og:description", content: "CASFETA Zanzibar membership, branch, event, and finance statistics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

const navItems = [
  { icon: Home, label: "Dashboard", active: true, to: "/admin" },
  { icon: Users, label: "User & Role Management", to: "/user-role-management" },
  { icon: Users, label: "Users", to: "/modules/users" },
  { icon: Users, label: "Members", to: "/modules/members" },
  { icon: UserPlus, label: "Leadership", to: "/modules/leadership" },
  { icon: Building2, label: "Branches", to: "/modules/branches" },
  { icon: Landmark, label: "Ministries", to: "/modules/ministries" },
  { icon: CalendarDays, label: "Events", to: "/modules/events" },
  { icon: Wallet, label: "Finance", to: "/modules/finance" },
  { icon: FileText, label: "Reports", to: "/modules/reports" },
  { icon: Megaphone, label: "Announcements", to: "/modules/announcements" },
  { icon: ClipboardList, label: "Resources", to: "/modules/resources" },
  { icon: FileText, label: "Documents", to: "/modules/documents" },
  { icon: Settings, label: "Settings", to: "/modules/settings" },
  { icon: ClipboardList, label: "Audit Logs", to: "/modules/audit" },
];

type BranchPerformance = {
  branch: number;
  branch_name: string;
  total_members: number;
  active_members: number;
};
type BranchStatistic = { period_month: number; total_members: number };
type ConsolidatedReport = { branches: number; members: number; events: number; new_members: number };
type FinanceSummary = {
  total_branch_income: string;
  total_contributions: string;
  expected_contributions: string;
  received: string;
  pending: string;
  overdue: string;
  collection_rate: string;
  pending_remittances?: Array<{
    branch_name: string;
    due_date: string;
    balance: string;
    is_overdue: boolean;
  }>;
};
type FinancialTransaction = {
  id: number;
  transaction_id: string;
  transaction_type_display: string;
  category_name: string;
  branch_name: string | null;
  amount: string;
  status_display: string;
  transaction_date: string;
};
type BranchReport = { id: number; branch_name: string; period_label: string; status_display: string };
type DashboardEvent = { id: number; title: string; start_date: string };
type FinanceCategory = { id: number; name: string; category_type: "INCOME" | "EXPENSE" };
type QuickAction = "member" | "event" | "income" | "announcement" | "reports";
type GrowthPoint = { label: string; members: number };

function GrowthChart({ points }: { points: GrowthPoint[] }) {
  if (!points.length) return <p className="muted-note">No membership trend data is available.</p>;
  const w = 560;
  const h = 190;
  const maxMembers = Math.max(...points.map((point) => point.members), 1);
  const chartPoints = points.map((point, index) =>
    `${(index / Math.max(points.length - 1, 1)) * w},${h - (point.members / maxMembers) * h}`,
  ).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} className="chart" role="img" aria-label="Member growth">
      {[0, 1, 2, 3].map((tick) => (
        <g key={tick}>
          <line x1="0" x2={w} y1={h - (tick / 3) * h} y2={h - (tick / 3) * h} className="chart-grid" />
          <text x="-6" y={h - (tick / 3) * h + 3} className="chart-label" textAnchor="end">
            {Math.round((maxMembers * tick) / 3).toLocaleString()}
          </text>
        </g>
      ))}
      <polyline points={chartPoints} className="chart-line" />
      {points.map((point, index) => (
        <circle key={point.label} cx={(index / Math.max(points.length - 1, 1)) * w} cy={h - (point.members / maxMembers) * h} r="3.5" className="chart-dot" />
      ))}
      {points.map((point, index) => (
        <text key={point.label} x={(index / Math.max(points.length - 1, 1)) * w} y={h + 16} className="chart-label" textAnchor="middle">
          {point.label}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ branches }: { branches: BranchPerformance[] }) {
  const colors = ["#2563eb", "#7c3aed", "#06b6d4", "#f97316", "#eab308", "#64748b", "#94a3b8"];
  const r = 60;
  const c = 2 * Math.PI * r;
  const totalMembers = branches.reduce((total, branch) => total + branch.total_members, 0);
  const sortedBranches = [...branches].sort((left, right) => right.total_members - left.total_members);
  const displayedBranches = sortedBranches.slice(0, 6).map((branch) => ({
    name: branch.branch_name,
    pct: totalMembers ? (branch.total_members / totalMembers) * 100 : 0,
  }));
  const otherMembers = sortedBranches.slice(6).reduce((total, branch) => total + branch.total_members, 0);
  if (otherMembers) displayedBranches.push({ name: "Other", pct: (otherMembers / Math.max(totalMembers, 1)) * 100 });
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut" role="img" aria-label="Branch distribution">
        {displayedBranches.map((branch, index) => {
          const dash = (branch.pct / 100) * c;
          const el = (
            <circle
              key={branch.name}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="26"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" className="donut-num">25</text>
        <text x="80" y="94" textAnchor="middle" className="donut-cap">Branches</text>
      </svg>
      <ul className="donut-legend">
        {displayedBranches.map((branch, index) => (
          <li key={branch.name}>
            <span style={{ background: colors[index % colors.length] }} />
            {branch.name}
            <b>{Math.round(branch.pct)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasToken = hasAccessToken();
  const currentYear = new Date().getFullYear();
  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: hasToken,
    retry: false,
  });
  const reportQuery = useQuery({
    queryKey: ["admin-consolidated-report", currentYear],
    queryFn: async () =>
      (await api.get<ConsolidatedReport>("/reports/consolidated/", { params: { year: currentYear } })).data,
    enabled: hasToken,
    retry: false,
  });
  const financeQuery = useQuery({
    queryKey: ["admin-finance-summary", currentYear],
    queryFn: async () =>
      (await api.get<FinanceSummary>("/finance/jimbo-dashboard/", { params: { year: currentYear } })).data,
    enabled: hasToken,
    retry: false,
  });
  const branchPerformanceQuery = useQuery({
    queryKey: ["admin-branch-performance", currentYear],
    queryFn: () => getApiList<BranchPerformance>("/branches/performance-summary/", { year: currentYear }),
    enabled: hasToken,
    retry: false,
  });
  const branchStatisticsQuery = useQuery({
    queryKey: ["admin-branch-statistics", currentYear],
    queryFn: () => getApiList<BranchStatistic>("/branch-statistics/", { period_year: currentYear, page_size: 200 }),
    enabled: hasToken,
    retry: false,
  });
  const transactionsQuery = useQuery({
    queryKey: ["admin-recent-transactions"],
    queryFn: () => getApiList<FinancialTransaction>("/finance/transactions/", { ordering: "-transaction_date", page_size: 8 }),
    enabled: hasToken,
    retry: false,
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-draft-reports"],
    queryFn: () => getApiList<BranchReport>("/reports/", { status: "DRAFT", page_size: 5 }),
    enabled: hasToken,
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["admin-upcoming-events"],
    queryFn: () => getApiList<DashboardEvent>("/events/", { upcoming: true, page_size: 4 }),
    enabled: hasToken,
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["finance-categories"],
    queryFn: () => getApiList<FinanceCategory>("/finance/categories/", { is_active: true }),
    enabled: hasToken,
    retry: false,
  });
  const [quickAction, setQuickAction] = useState<QuickAction | null>(null);
  const [eventLevel, setEventLevel] = useState("JIMBO");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!hasToken || currentUserQuery.isError) {
      clearTokens();
      navigate({ to: "/" });
    }
  }, [currentUserQuery.isError, hasToken, navigate]);

  if (!currentUserQuery.data) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</main>;
  }

  const report = reportQuery.data;
  const finance = financeQuery.data;
  const branches = branchPerformanceQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const pendingReports = reportsQuery.data ?? [];
  const pendingRemittances = finance?.pending_remittances ?? [];
  const activeMembers = branches.reduce((total, branch) => total + branch.active_members, 0);
  const stats = [
    { icon: Users, label: "Total Members", value: report?.members.toLocaleString() ?? "—", change: `${report?.new_members ?? 0} new this year`, tone: "tile-blue" },
    { icon: Users, label: "Active Members", value: activeMembers.toLocaleString(), change: "Live branch totals", tone: "tile-green" },
    { icon: Landmark, label: "Branches", value: report?.branches.toLocaleString() ?? "—", change: "Current active branches", tone: "tile-violet" },
    { icon: CalendarDays, label: "Events", value: report?.events.toLocaleString() ?? "—", change: "This year", tone: "tile-orange" },
  ];
  const monthlyTotals = new Map<number, number>();
  for (const statistic of branchStatisticsQuery.data ?? []) {
    monthlyTotals.set(statistic.period_month, (monthlyTotals.get(statistic.period_month) ?? 0) + statistic.total_members);
  }
  const growthPoints = [...monthlyTotals.entries()]
    .sort(([leftMonth], [rightMonth]) => leftMonth - rightMonth)
    .map(([month, members]) => ({ label: new Date(currentYear, month - 1).toLocaleString("en-US", { month: "short" }), members }));
  const reminders = [
    ...pendingReports.map((item) => ({ tone: "rem-blue", text: `${item.branch_name} has a draft report for ${item.period_label}`, date: item.status_display })),
    ...pendingRemittances.map((item) => ({ tone: item.is_overdue ? "rem-orange" : "rem-green", text: `${item.branch_name} remittance pending`, date: item.due_date })),
    ...(eventsQuery.data ?? []).map((item) => ({ tone: "rem-blue", text: item.title, date: item.start_date })),
  ].slice(0, 5);
  const displayName = currentUserQuery.data.first_name || currentUserQuery.data.last_name
    ? `${currentUserQuery.data.first_name} ${currentUserQuery.data.last_name}`.trim()
    : currentUserQuery.data.username;
  const collectionRate = Math.max(0, Math.min(100, Number(finance?.collection_rate ?? 0)));
  const formatCurrency = (value: string | number | undefined) =>
    `TZS ${Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  async function submitQuickAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickAction || quickAction === "reports") return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setActionError("");
    setActionMessage("");
    setIsSubmittingAction(true);

    try {
      if (quickAction === "member") {
        await api.post("/members/", {
          first_name: value("first_name"),
          last_name: value("last_name"),
          email: value("email"),
          phone: value("phone"),
          gender: value("gender"),
          branch: Number(value("branch")),
          status: "PENDING",
        });
      } else if (quickAction === "event") {
        const level = value("level");
        await api.post("/events/", {
          title: value("title"),
          description: value("description"),
          start_date: value("start_date"),
          start_time: value("start_time") || null,
          end_date: value("end_date") || null,
          end_time: value("end_time") || null,
          venue: value("venue"),
          level,
          branch: level === "BRANCH" ? Number(value("branch")) : null,
          status: value("status"),
          is_public: true,
        });
      } else if (quickAction === "income") {
        await api.post("/finance/transactions/", {
          category: Number(value("category")),
          transaction_type: value("transaction_type"),
          amount: value("amount"),
          description: value("description"),
          transaction_date: value("transaction_date"),
          payment_method: value("payment_method"),
          branch: value("branch") ? Number(value("branch")) : null,
        });
      } else if (quickAction === "announcement") {
        const { data } = await api.post<{ id: number }>("/announcements/", {
          title: value("title"),
          summary: value("summary"),
          body: value("body"),
          audience: value("audience"),
          is_public: form.get("is_public") === "on",
          status: "DRAFT",
        });
        if (form.get("publish_now") === "on") {
          await api.post(`/announcements/${data.id}/publish/`, {});
        }
      }

      setActionMessage("The record was created successfully.");
      setQuickAction(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-consolidated-report"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-finance-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-recent-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-branch-performance"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-draft-reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-upcoming-events"] }),
      ]);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function downloadConsolidatedReport() {
    if (!report) return;
    const reportFile = new Blob([JSON.stringify({ ...report, finance }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(reportFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = `casfeta-zanzibar-report-${currentYear}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell navItems={navItems} userName={displayName} userRole={currentUserQuery.data.role_codes[0]?.replaceAll("_", " ").toLowerCase() ?? "Administrator"}>
      <div className="dash-title-row">
        <div>
          <h1>Regional Dashboard</h1>
          <p>CASFETA Zanzibar Region</p>
        </div>
        <span className="dash-date">{new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</span>
      </div>

      {(reportQuery.isError || financeQuery.isError) && (
        <div className="error-message" role="alert">
          Some dashboard data could not be loaded. Your role may not have access to every report.
        </div>
      )}
      {actionError && <div className="error-message" role="alert">{actionError}</div>}
      {actionMessage && <div className="success-message" role="status">{actionMessage}</div>}

      <div className="stat-tiles">
        {stats.map((s) => (
          <div key={s.label} className={`stat-tile ${s.tone}`}>
            <s.icon size={22} />
            <p>{s.label}</p>
            <strong>{s.value}</strong>
            <span>{s.change}</span>
          </div>
        ))}
      </div>

      <div className="panel-grid two">
        <section className="panel">
          <h2>Member Growth</h2>
          {branchStatisticsQuery.isError ? <p className="muted-note">Membership trends could not be loaded.</p> : <GrowthChart points={growthPoints} />}
        </section>
        <section className="panel">
          <h2>Branch Distribution</h2>
          {branchPerformanceQuery.isError ? <p className="muted-note">Branch statistics could not be loaded.</p> : <DonutChart branches={branches} />}
        </section>
      </div>

      <div className="panel-grid two">
        <section className="panel">
          <h2>
            <HandCoins size={17} /> Regional Finance Summary
          </h2>
          <div className="finance-row">
            <div>
              <span>Total Branch Income</span>
              <strong>{formatCurrency(finance?.total_branch_income)}</strong>
            </div>
            <b>{formatCurrency(finance?.expected_contributions)}</b>
          </div>
          <div className="finance-row">
            <div>
              <span>Regional 10% Contribution</span>
              <strong>{formatCurrency(finance?.received)}</strong>
            </div>
            <b>{formatCurrency(finance?.total_contributions)}</b>
          </div>
          <div className="finance-row">
            <div>
              <span className="text-success">Remaining</span>
              <strong className="text-success">{formatCurrency(finance?.pending)}</strong>
            </div>
            <b>{formatCurrency(finance?.overdue)}</b>
          </div>
          <div className="progress"><span style={{ width: `${collectionRate}%` }} /></div>
          <p className="progress-label">{collectionRate.toFixed(1)}% collected</p>
        </section>
        <section className="panel">
          <h2>
            <Bell size={17} /> Reminders <a className="panel-link">View All →</a>
          </h2>
          <ul className="reminder-list">
            {reminders.map((r) => (
              <li key={r.text}>
                <span className={`rem-dot ${r.tone}`} />
                <p>{r.text}</p>
                <time>{new Date(`${r.date}T00:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" })}</time>
              </li>
            ))}
          </ul>
          {!reminders.length && <p className="muted-note">There are no pending reports or upcoming events.</p>}
        </section>
      </div>

      <section className="panel">
        <h2>
          Recent Activity <a className="panel-link">View All →</a>
        </h2>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Details</th>
                <th>Branch</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transaction_type_display}</td>
                  <td>{transaction.category_name} · {transaction.transaction_id}</td>
                  <td>{transaction.branch_name ?? "Regional"}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>
                    <span className={`status-pill ${transaction.status_display.toLowerCase() === "posted" ? "st-green" : "st-orange"}`}>{transaction.status_display}</span>
                  </td>
                  <td>{new Date(`${transaction.transaction_date}T00:00:00`).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
              {!transactions.length && <tr><td colSpan={6}>No financial transactions are available.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button className="qa qa-blue" onClick={() => { setActionError(""); setQuickAction("member"); }}><UserPlus size={16} /> Add Member</button>
          <button className="qa qa-green" onClick={() => { setActionError(""); setEventLevel("JIMBO"); setQuickAction("event"); }}><CalendarDays size={16} /> Create Event</button>
          <button className="qa qa-orange" onClick={() => { setActionError(""); setQuickAction("income"); }}><Wallet size={16} /> Record Income</button>
          <button className="qa qa-violet" onClick={() => { setActionError(""); setQuickAction("announcement"); }}><Megaphone size={16} /> Post Announcement</button>
          <button className="qa qa-teal" onClick={() => { setActionError(""); setQuickAction("reports"); }}><FileText size={16} /> View Reports</button>
        </div>
      </section>
      {quickAction && (
        <div className="quick-dialog-backdrop" onMouseDown={() => setQuickAction(null)}>
          <section
            className="quick-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="quick-dialog-heading">
              <h2 id="quick-dialog-title">
                {quickAction === "member" ? "Add a Member" :
                  quickAction === "event" ? "Create an Event" :
                    quickAction === "income" ? "Record a Transaction" :
                      quickAction === "announcement" ? "Post an Announcement" : "Consolidated Report"}
              </h2>
              <button className="dash-icon-btn" aria-label="Close dialog" onClick={() => setQuickAction(null)}>
                <X size={18} />
              </button>
            </div>
            {quickAction === "reports" ? (
              <div className="report-dialog-content">
                {reportQuery.isLoading ? <p>Loading report...</p> : null}
                {reportQuery.isError ? <p className="error-message">The consolidated report could not be loaded.</p> : null}
                {report && (
                  <>
                    <dl>
                      <div><dt>Members</dt><dd>{report.members.toLocaleString()}</dd></div>
                      <div><dt>Branches</dt><dd>{report.branches.toLocaleString()}</dd></div>
                      <div><dt>Events this year</dt><dd>{report.events.toLocaleString()}</dd></div>
                      <div><dt>New members this year</dt><dd>{report.new_members.toLocaleString()}</dd></div>
                      <div><dt>Contributions received</dt><dd>{formatCurrency(finance?.received)}</dd></div>
                      <div><dt>Contributions pending</dt><dd>{formatCurrency(finance?.pending)}</dd></div>
                    </dl>
                    <button className="button button-primary" onClick={downloadConsolidatedReport}>Download JSON report</button>
                  </>
                )}
              </div>
            ) : (
              <form className="quick-action-form" onSubmit={submitQuickAction}>
                {quickAction === "member" && (
                  <>
                    <label>First name<input name="first_name" required autoComplete="given-name" /></label>
                    <label>Last name<input name="last_name" required autoComplete="family-name" /></label>
                    <label>Email<input name="email" type="email" autoComplete="email" /></label>
                    <label>Phone<input name="phone" required type="tel" /></label>
                    <label>Gender<select name="gender" required defaultValue=""><option value="" disabled>Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></label>
                    <label>Branch<select name="branch" required defaultValue=""><option value="" disabled>Select branch</option>{branches.map((branch) => <option key={branch.branch} value={branch.branch}>{branch.branch_name}</option>)}</select></label>
                  </>
                )}
                {quickAction === "event" && (
                  <>
                    <label>Event title<input name="title" required maxLength={200} /></label>
                    <label>Level<select name="level" value={eventLevel} onChange={(event) => setEventLevel(event.target.value)}><option value="JIMBO">Regional</option><option value="BRANCH">Branch</option></select></label>
                    {eventLevel === "BRANCH" && <label>Branch<select name="branch" required defaultValue=""><option value="" disabled>Select branch</option>{branches.map((branch) => <option key={branch.branch} value={branch.branch}>{branch.branch_name}</option>)}</select></label>}
                    <label>Start date<input name="start_date" type="date" required /></label>
                    <label>Start time<input name="start_time" type="time" /></label>
                    <label>End date<input name="end_date" type="date" /></label>
                    <label>End time<input name="end_time" type="time" /></label>
                    <label>Venue<input name="venue" maxLength={200} /></label>
                    <label>Description<textarea name="description" rows={3} /></label>
                    <label>Status<select name="status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
                  </>
                )}
                {quickAction === "income" && (
                  <>
                    <label>Transaction type<select name="transaction_type"><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></label>
                    <label>Category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name} ({category.category_type.toLowerCase()})</option>)}</select></label>
                    <label>Amount (TZS)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                    <label>Description<input name="description" required maxLength={255} /></label>
                    <label>Transaction date<input name="transaction_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                    <label>Payment method<select name="payment_method"><option value="CASH">Cash</option><option value="BANK">Bank transfer</option><option value="MOBILE_MONEY">Mobile money</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option></select></label>
                  </>
                )}
                {quickAction === "announcement" && (
                  <>
                    <label>Title<input name="title" required maxLength={200} /></label>
                    <label>Summary<input name="summary" maxLength={300} /></label>
                    <label>Message<textarea name="body" rows={5} required /></label>
                    <label>Audience<select name="audience"><option value="ALL_MEMBERS">All members</option><option value="LEADERS">Leaders</option><option value="CASHIERS">Cashiers</option><option value="FINANCE">Finance officers</option><option value="PUBLIC">Public</option></select></label>
                    <label className="quick-checkbox"><input type="checkbox" name="is_public" /> Also show on the public website</label>
                    <label className="quick-checkbox"><input type="checkbox" name="publish_now" /> Publish immediately</label>
                  </>
                )}
                {actionError && <p className="error-message" role="alert">{actionError}</p>}
                <div className="form-actions">
                  <button className="button button-back" type="button" onClick={() => setQuickAction(null)}>Cancel</button>
                  <button className="button button-primary" type="submit" disabled={isSubmittingAction}>
                    {isSubmittingAction ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
