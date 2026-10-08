import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { api, clearTokens, getApiErrorMessage, getApiList, getCurrentUser, hasAccessToken } from "@/lib/api";

type ModuleAction = { label: string; endpoint: string; body?: Record<string, unknown>; reasonPrompt?: string };
type ModuleDefinition = {
  title: string;
  endpoint: string;
  columns: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  actions?: ModuleAction[];
  params?: Record<string, string | number | boolean>;
};
type ApiField = {
  label: string;
  type: string;
  required?: boolean;
  read_only?: boolean;
  choices?: Array<{ value: string | number; display_name: string }>;
  default?: unknown;
  help_text?: string;
  max_length?: number;
};
type DirectoryPage = { count: number; results: Array<Record<string, unknown>> };

const MODULES: Record<string, ModuleDefinition> = {
  users: { title: "Users", endpoint: "/users/", columns: ["username", "email", "first_name", "last_name", "is_active"], canCreate: true, canEdit: true },
  roles: { title: "Roles and Permissions", endpoint: "/roles/", columns: ["code", "name", "scope", "level", "is_active"], canCreate: true, canEdit: true },
  members: { title: "Members", endpoint: "/members/", columns: ["member_id", "full_name", "branch_name", "phone", "status_display"], canCreate: true, canEdit: true, actions: [
    { label: "Approve", endpoint: "approve/" },
    { label: "Activate", endpoint: "activate/" },
    { label: "Suspend", endpoint: "suspend/", body: { reason: "Suspended by administrator" } },
  ] },
  applications: { title: "Membership Applications", endpoint: "/applications/", columns: ["application_number", "full_name", "branch_name", "status_display", "created_at"], canCreate: true, canEdit: false, actions: [
    { label: "Approve", endpoint: "approve/" },
    { label: "Under Review", endpoint: "under_review/" },
    { label: "Reject", endpoint: "reject/", reasonPrompt: "Reason for rejecting this application" },
  ] },
  transfers: { title: "Member Transfers", endpoint: "/transfers/", columns: ["member_id", "member_name", "from_branch_name", "to_branch_name", "status_display"], canCreate: true, canEdit: false, actions: [
    { label: "Approve", endpoint: "approve/" },
    { label: "Complete", endpoint: "complete/" },
  ] },
  branches: { title: "Branches", endpoint: "/branches/", columns: ["code", "name", "district_detail", "active_member_count", "status"], canCreate: true, canEdit: true, actions: [
    { label: "Activate", endpoint: "activate/" },
    { label: "Deactivate", endpoint: "deactivate/", reasonPrompt: "Reason for deactivating this branch" },
  ] },
  leadership: { title: "Leadership Terms", endpoint: "/leaders/terms/", columns: ["position_title", "user_name", "branch_name", "start_date", "end_date"], canCreate: true, canEdit: true },
  positions: { title: "Leadership Positions", endpoint: "/leaders/positions/", columns: ["title", "scope", "is_active"], canCreate: true, canEdit: true },
  ministries: { title: "Ministries", endpoint: "/ministries/", columns: ["name", "description", "is_active"], canCreate: true, canEdit: true },
  events: { title: "Events", endpoint: "/events/", columns: ["title", "start_date", "branch_name", "registration_count", "status_display"], canCreate: true, canEdit: true, actions: [
    { label: "Publish", endpoint: "publish/", body: { status: "PUBLISHED" } },
  ] },
  categories: { title: "Event Categories", endpoint: "/event-categories/", columns: ["name", "description", "is_active"], canCreate: true, canEdit: true },
  attendance: { title: "Attendance Records", endpoint: "/attendance/records/", columns: ["member_name", "event_title", "status_display", "recorded_at"], canCreate: false, canEdit: false },
  sessions: { title: "Attendance Sessions", endpoint: "/attendance/sessions/", columns: ["event_title", "branch_name", "date", "status"], canCreate: true, canEdit: true },
  finance: { title: "Financial Transactions", endpoint: "/finance/transactions/", columns: ["transaction_id", "transaction_type_display", "category_name", "branch_name", "amount", "status_display", "transaction_date"], canCreate: true, canEdit: true, actions: [
    { label: "Approve", endpoint: "approve/" },
    { label: "Reject", endpoint: "reject/", reasonPrompt: "Reason for rejecting this transaction" },
    { label: "Request Reversal", endpoint: "reverse/", reasonPrompt: "Reason for requesting this reversal" },
  ] },
  income: { title: "Income", endpoint: "/finance/income/", columns: ["transaction_id", "category_name", "branch_name", "amount", "status_display", "transaction_date"], canCreate: true, canEdit: true },
  expenses: { title: "Expenses", endpoint: "/finance/expenses/", columns: ["transaction_id", "category_name", "branch_name", "amount", "status_display", "transaction_date"], canCreate: true, canEdit: true },
  categoriesFinance: { title: "Finance Categories", endpoint: "/finance/categories/", columns: ["name", "category_type", "subject_to_jimbo_10", "is_active"], canCreate: true, canEdit: true },
  remittances: { title: "Remittances", endpoint: "/finance/remittances/", columns: ["remittance_number", "branch_name", "amount", "status_display", "payment_date"], canCreate: true, canEdit: true, actions: [
    { label: "Verify", endpoint: "verify/" },
    { label: "Confirm Receipt", endpoint: "confirm/" },
  ] },
  reports: { title: "Branch Reports", endpoint: "/reports/", columns: ["report_number", "report_type_name", "branch_name", "period_label", "status_display"], canCreate: true, canEdit: true, actions: [
    { label: "Submit", endpoint: "submit/" },
    { label: "Approve", endpoint: "review/", body: { approved: true } },
    { label: "Reject", endpoint: "review/", body: { approved: false } },
  ] },
  reportTypes: { title: "Report Types", endpoint: "/reports/types/", columns: ["code", "name", "frequency", "deadline_day", "is_active"], canCreate: true, canEdit: true },
  announcements: { title: "Announcements", endpoint: "/announcements/", columns: ["title", "audience_display", "status_display", "publish_at", "is_live"], canCreate: true, canEdit: true, actions: [
    { label: "Publish", endpoint: "publish/" },
    { label: "Archive", endpoint: "archive/" },
  ] },
  resources: { title: "Resources", endpoint: "/resources/", columns: ["title", "resource_type", "category_name", "access_level", "status_display"], canCreate: true, canEdit: true },
  academic: { title: "Academic Resources", endpoint: "/resources/", columns: ["title", "resource_type", "organisation", "deadline", "location"], params: { status: "PUBLISHED", page_size: 50 } },
  documents: { title: "Documents", endpoint: "/resources/", columns: ["title", "resource_type", "category_name", "access_level", "status_display"], canCreate: true, canEdit: true },
  news: { title: "News and Publications", endpoint: "/news/", columns: ["title", "excerpt", "status_display", "published_at", "views_count"], canCreate: true, canEdit: true },
  certificates: { title: "Certificates", endpoint: "/certificates/", columns: ["certificate_id", "recipient_name", "programme", "certificate_type", "status"], canCreate: true, canEdit: true, actions: [
    { label: "Revoke", endpoint: "revoke/", reasonPrompt: "Reason for revoking this certificate" },
  ] },
  templates: { title: "Certificate Templates", endpoint: "/certificate-templates/", columns: ["name", "title", "issuer_name", "is_active"], canCreate: true, canEdit: true },
  audit: { title: "Audit Logs", endpoint: "/audit-logs/", columns: ["created_at", "username", "action", "entity", "description"], canCreate: false, canEdit: false },
  notifications: { title: "Notifications", endpoint: "/notifications/", columns: ["title", "category_display", "priority_display", "is_read", "created_at"], canCreate: false, canEdit: false, actions: [
    { label: "Mark Read", endpoint: "mark_read/" },
  ] },
  prayer: { title: "My Prayer Requests", endpoint: "/prayer-requests/mine/", columns: ["reference", "subject", "category", "status", "created_at"], canCreate: true, canEdit: false },
  testimonies: { title: "Testimonies", endpoint: "/testimonies/", columns: ["title", "category", "status", "created_at"], canCreate: true, canEdit: true },
};

export const Route = createFileRoute("/modules/$module")({ component: ModulePage });

function ModulePage() {
  const { module } = Route.useParams();
  const navigate = useNavigate();
  const hasToken = hasAccessToken();
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser, enabled: hasToken, retry: false });

  useEffect(() => {
    if (!hasToken || userQuery.isError) {
      clearTokens();
      navigate({ to: "/" });
    }
  }, [hasToken, navigate, userQuery.isError]);

  if (!userQuery.data) return <main className="module-loading">Loading workspace...</main>;
  if (module === "profile") return <ProfileModule />;
  if (module === "membership") return <MembershipModule />;
  if (module === "settings") return <SettingsModule />;
  if (module === "search") return <SearchModule />;

  const definition = MODULES[module];
  if (!definition) {
    return (
      <ModuleFrame title="Module not found">
        <p>This workspace module is not available.</p>
      </ModuleFrame>
    );
  }
  return <ModuleExplorer key={module} module={module} definition={definition} />;
}

function ModuleFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p>CASFETA ZANZIBAR</p>
          <h1>{title}</h1>
        </div>
        <a className="button button-back" href="/member">Dashboard</a>
      </header>
      <nav className="module-nav" aria-label="Platform modules">
        {Object.entries(MODULES).map(([key, definition]) => (
          <a key={key} href={`/modules/${key}`}>{definition.title}</a>
        ))}
        <a href="/modules/profile">My Profile</a>
        <a href="/modules/membership">Membership Card</a>
        <a href="/modules/settings">Settings</a>
      </nav>
      {children}
    </main>
  );
}

function ModuleExplorer({ module, definition }: { module: string; definition: ModuleDefinition }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const directoryQuery = useQuery({
    queryKey: ["module-directory", module, search, page],
    queryFn: async () => {
      const { data } = await api.get<unknown>(definition.endpoint, {
        params: { ...definition.params, ...(search ? { search } : {}), page, page_size: 25 },
      });
      return toDirectoryPage(data);
    },
    retry: false,
  });
  const fieldsQuery = useQuery({
    queryKey: ["module-fields", module, editing ? "edit" : "create"],
    queryFn: async () => {
      const url = editing ? `${definition.endpoint}${editing["id"]}/` : definition.endpoint;
      const { data } = await api.options<{ actions?: Record<string, Record<string, ApiField>> }>(url);
      return data.actions?.[editing ? "PUT" : "POST"] ?? data.actions?.["PATCH"] ?? {};
    },
    enabled: formOpen && Boolean(definition.canCreate || (editing && definition.canEdit)),
    retry: false,
  });
  const directory = directoryQuery.data;
  const canOpenForm = Boolean(definition.canCreate || (editing && definition.canEdit));
  const fields = Object.entries(fieldsQuery.data ?? {}).filter(([, field]) => !field.read_only && field.type !== "nested object");
  const columns = definition.columns.length
    ? definition.columns
    : Object.keys(directory?.results[0] ?? {}).filter((key) => !key.endsWith("_detail"));

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const [name, field] of fields) {
      if (field.type === "boolean") {
        payload[name] = formData.has(name);
        continue;
      }
      const value = formData.get(name);
      if (value === null || value === "") continue;
      if (field.type === "integer" || field.type === "decimal") payload[name] = Number(value);
      else if (field.type === "multiple choice") payload[name] = formData.getAll(name);
      else payload[name] = value;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editing) await api.patch(`${definition.endpoint}${editing["id"]}/`, payload);
      else await api.post(definition.endpoint, payload);
      setFormOpen(false);
      setEditing(null);
      setMessage(editing ? "Changes saved." : "Record created.");
      await queryClient.invalidateQueries({ queryKey: ["module-directory", module] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(row: Record<string, unknown>, action: ModuleAction) {
    const id = row["id"];
    if (id === undefined) return;
    const reason = action.reasonPrompt ? window.prompt(action.reasonPrompt) : null;
    if (action.reasonPrompt && !reason) return;
    setError("");
    setMessage("");
    try {
      const body = action.reasonPrompt ? { reason } : action.body ?? {};
      await api.post(`${definition.endpoint}${id}/${action.endpoint}`, body);
      setMessage(`${action.label} completed.`);
      await queryClient.invalidateQueries({ queryKey: ["module-directory", module] });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <ModuleFrame title={definition.title}>
      <section className="module-toolbar">
        <label className="module-search">Search {definition.title.toLowerCase()}<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search records..." /></label>
        {definition.canCreate && (
          <button className="button button-primary" onClick={() => { setEditing(null); setFormOpen(true); setError(""); }}>New Record</button>
        )}
      </section>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {formOpen && canOpenForm && (
        <form className="module-form" onSubmit={saveRecord}>
          <div className="module-form-heading"><h2>{editing ? "Edit Record" : "Create Record"}</h2><button className="text-button" type="button" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button></div>
          {fieldsQuery.isLoading ? <p>Loading form fields...</p> : null}
          {fieldsQuery.isError ? <p className="error-message">The backend form definition could not be loaded.</p> : null}
          <div className="module-form-grid">
            {fields.map(([name, field]) => (
              <label key={name} className={field.type === "boolean" ? "module-checkbox" : undefined}>
                {field.label}
                {field.type === "boolean" ? (
                  <input type="checkbox" name={name} defaultChecked={Boolean(editing?.[name] ?? field.default)} />
                ) : field.choices?.length ? (
                  <select name={name} required={field.required} defaultValue={String(editing?.[name] ?? field.default ?? "")}>
                    {!field.required && <option value="">Select...</option>}
                    {field.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.display_name}</option>)}
                  </select>
                ) : field.type === "text" || field.type === "string" && (field.max_length ?? 0) > 500 ? (
                  <textarea name={name} required={field.required} defaultValue={String(editing?.[name] ?? field.default ?? "")} rows={3} />
                ) : (
                  <input
                    name={name}
                    required={field.required}
                    type={inputType(field.type)}
                    maxLength={field.max_length}
                    defaultValue={String(editing?.[name] ?? field.default ?? "")}
                  />
                )}
                {field.help_text && <small>{field.help_text}</small>}
              </label>
            ))}
          </div>
          {fieldsQuery.isSuccess && fields.length === 0 && <p>This endpoint does not accept new records.</p>}
          <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving || fieldsQuery.isLoading}>{saving ? "Saving..." : "Save"}</button></div>
        </form>
      )}
      <div className="module-table-wrap">
        {directoryQuery.isLoading ? <p className="module-empty">Loading records...</p> : null}
        {directoryQuery.isError ? <p className="module-empty">Records could not be loaded. Your account may not have permission to view this module.</p> : null}
        {directoryQuery.isSuccess && directory?.results.length === 0 ? <p className="module-empty">No records found.</p> : null}
        {directoryQuery.isSuccess && Boolean(directory?.results.length) && (
          <table className="module-table">
            <thead><tr>{columns.map((column) => <th key={column}>{humanize(column)}</th>)}{(definition.actions?.length || definition.canEdit) ? <th>Actions</th> : null}</tr></thead>
            <tbody>
              {directory?.results.map((row, index) => (
                <tr key={String(row["id"] ?? index)}>
                  {columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}
                  {(definition.actions?.length || definition.canEdit) ? (
                    <td className="module-row-actions">
                      {definition.canEdit && <button className="text-button" onClick={() => { setEditing(row); setFormOpen(true); setError(""); }}>Edit</button>}
                      {definition.actions?.map((action) => <button className="text-button" key={action.endpoint + action.label} onClick={() => void runAction(row, action)}>{action.label}</button>)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {directory && directory.count > 25 && (
        <div className="module-pagination">
          <button className="button button-back" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>Page {page} · {directory.count} records</span>
          <button className="button button-back" disabled={page * 25 >= directory.count} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      )}
    </ModuleFrame>
  );
}

function toDirectoryPage(data: unknown): DirectoryPage {
  if (Array.isArray(data)) return { count: data.length, results: data as Array<Record<string, unknown>> };
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record["results"])) return { count: Number(record["count"] ?? record["results"].length), results: record["results"] as Array<Record<string, unknown>> };
    const rows = Object.values(record).find(Array.isArray);
    if (Array.isArray(rows)) return { count: Number(record["count"] ?? rows.length), results: rows as Array<Record<string, unknown>> };
    return { count: 1, results: [record] };
  }
  return { count: 0, results: [] };
}

function inputType(fieldType: string) {
  if (fieldType.includes("email")) return "email";
  if (fieldType.includes("url")) return "url";
  if (fieldType.includes("date")) return fieldType.includes("time") ? "datetime-local" : "date";
  if (fieldType.includes("integer") || fieldType.includes("decimal")) return "number";
  if (fieldType.includes("password")) return "password";
  return "text";
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ProfileModule() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["current-user"], queryFn: getCurrentUser });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.patch("/auth/me/", { first_name: form.get("first_name"), last_name: form.get("last_name") });
      setMessage("Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }
  const user = profileQuery.data;
  return (
    <ModuleFrame title="My Profile">
      {user && <form className="module-form" onSubmit={saveProfile}>
        <label>Username<input value={user.username} readOnly /></label>
        <label>Email<input value={user.email} readOnly /></label>
        <label>First name<input name="first_name" defaultValue={user.first_name} /></label>
        <label>Last name<input name="last_name" defaultValue={user.last_name} /></label>
        {message && <p className="success-message">{message}</p>}{error && <p className="error-message">{error}</p>}
        <button className="button button-primary" type="submit">Save Profile</button>
      </form>}
    </ModuleFrame>
  );
}

function MembershipModule() {
  const membershipQuery = useQuery({ queryKey: ["my-membership"], queryFn: async () => (await api.get("/members/me/")).data });
  const membership = membershipQuery.data?.member;
  return (
    <ModuleFrame title="Membership Card">
      {membershipQuery.isLoading && <p>Loading membership...</p>}
      {membershipQuery.isError && <p>You do not have an approved membership record yet.</p>}
      {membership && <dl className="membership-details">
        <div><dt>Member ID</dt><dd>{membership.member_id}</dd></div>
        <div><dt>Name</dt><dd>{membership.full_name}</dd></div>
        <div><dt>Branch</dt><dd>{membership.branch_name}</dd></div>
        <div><dt>Status</dt><dd>{membership.status_display}</dd></div>
        <div><dt>Valid</dt><dd>{membership.is_card_valid ? "Yes" : "No"}</dd></div>
      </dl>}
    </ModuleFrame>
  );
}

function SettingsModule() {
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({ queryKey: ["notification-preferences"], queryFn: async () => (await api.get("/notifications/preferences/")).data });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const keys = ["in_system", "email", "sms", "whatsapp", "event_reminders", "finance_alerts", "report_reminders", "announcements"];
    const payload = Object.fromEntries(keys.map((key) => [key, form.has(key)]));
    try {
      await api.put("/notifications/preferences/", payload);
      setMessage("Notification preferences saved.");
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
  }
  return (
    <ModuleFrame title="Settings">
      {preferencesQuery.data && <form className="module-form module-preferences" onSubmit={savePreferences}>
        {Object.entries(preferencesQuery.data).filter(([key, value]) => key !== "id" && typeof value === "boolean").map(([key, value]) => (
          <label key={key} className="module-checkbox">{humanize(key)}<input type="checkbox" name={key} defaultChecked={Boolean(value)} /></label>
        ))}
        {message && <p className="success-message">{message}</p>}{error && <p className="error-message">{error}</p>}
        <button className="button button-primary" type="submit">Save Preferences</button>
      </form>}
    </ModuleFrame>
  );
}

function SearchModule() {
  const [search, setSearch] = useState("");
  const resultsQuery = useQuery({
    queryKey: ["global-search", search],
    queryFn: async () => {
      const sources = [
        ["Members", "/members/"],
        ["Events", "/events/"],
        ["Resources", "/resources/"],
      ] as const;
      return Promise.all(sources.map(async ([title, endpoint]) => {
        try {
          return { title, rows: await getApiList<Record<string, unknown>>(endpoint, { search, page_size: 10 }) };
        } catch {
          return { title, rows: [] };
        }
      }));
    },
    enabled: search.trim().length >= 2,
    retry: false,
  });
  return (
    <ModuleFrame title="Search">
      <label className="module-search">Search members, events, and resources<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Enter at least two characters" /></label>
      {resultsQuery.isLoading && <p>Searching...</p>}
      {resultsQuery.data?.map((group) => <section className="module-search-results" key={group.title}><h2>{group.title}</h2>{group.rows.length ? group.rows.map((row, index) => <article key={String(row["id"] ?? index)}><strong>{String(row["title"] ?? row["full_name"] ?? row["member_id"] ?? "Result")}</strong><p>{String(row["description"] ?? row["branch_name"] ?? row["status_display"] ?? "")}</p></article>) : <p>No results.</p>}</section>)}
    </ModuleFrame>
  );
}
