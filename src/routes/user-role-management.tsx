import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

import { api, getApiErrorMessage, getApiList } from "@/lib/api";

export const Route = createFileRoute("/user-role-management")({
  component: UserRoleManagementPage,
});

type RoleRecord = {
  id: number;
  code: string;
  name: string;
  description?: string;
  scope: string;
  level: number;
  permission_codes?: string[];
  is_active?: boolean;
};

type UserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
  role_codes: string[];
  roles?: Array<{ code: string; name: string; branch?: number | null; branch_name?: string | null }>;
  profile?: {
    phone?: string;
    district?: number | null;
    primary_branch_name?: string | null;
  };
};

type DistrictRecord = { id: number; name: string; region?: string; parent?: number | null };
type BranchRecord = { id: number; name: string; district?: number | null; district_name?: string | null; status?: string };

type AssignmentFormState = {
  roleId: string;
  orgLevel: "JIMBO" | "WILAYA" | "TAWI";
  districtId: string;
  branchId: string;
  startDate: string;
  expiryDate: string;
  reason: string;
  permissions: string[];
};

const defaultAssignmentForm: AssignmentFormState = {
  roleId: "",
  orgLevel: "TAWI",
  districtId: "",
  branchId: "",
  startDate: "",
  expiryDate: "",
  reason: "",
  permissions: [],
};

const permissionCatalog = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "SUBMIT",
  "REVIEW",
  "APPROVE",
  "PUBLISH",
  "GENERATE_REPORT",
  "EXPORT",
  "MANAGE_USERS",
  "MANAGE_MEMBERS",
  "MANAGE_FINANCE",
  "MANAGE_DOCUMENTS",
  "MANAGE_EVENTS",
  "MANAGE_ANNOUNCEMENTS",
];

function UserRoleManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(defaultAssignmentForm);
  const [assigning, setAssigning] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["user-role-management-users"],
    queryFn: () => getApiList<UserRecord>("/users/"),
    retry: false,
  });

  const rolesQuery = useQuery({
    queryKey: ["user-role-management-roles"],
    queryFn: () => getApiList<RoleRecord>("/roles/"),
    retry: false,
  });

  const districtsQuery = useQuery({
    queryKey: ["user-role-management-districts"],
    queryFn: () => getApiList<DistrictRecord>("/districts/"),
    retry: false,
  });

  const branchesQuery = useQuery({
    queryKey: ["user-role-management-branches"],
    queryFn: () => getApiList<BranchRecord>("/branches/"),
    retry: false,
  });

  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const districts = districtsQuery.data ?? [];
  const branches = branchesQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !searchText ||
        [user.username, user.email, user.first_name, user.last_name, user.profile?.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus = statusFilter === "all" || (statusFilter === "approved" ? user.is_active : !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, users]);

  const selectedRole = roles.find((role) => String(role.id) === assignmentForm.roleId) ?? null;
  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id));
  const activeRoles = roles.filter((role) => role.is_active !== false);
  const districtOptions = districts.filter((district) => district.parent === null || district.region === "Zanzibar");
  const selectedDistrictBranches = branches.filter(
    (branch) => !assignmentForm.districtId || String(branch.district ?? "") === assignmentForm.districtId,
  );

  async function refreshUsers() {
    await queryClient.invalidateQueries({ queryKey: ["user-role-management-users"] });
  }

  async function handleApprove(userId: number) {
    try {
      await api.post(`/users/${userId}/approve/`);
      setMessage("User approval completed.");
      setError("");
      await refreshUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function handleReject(userId: number) {
    const reason = window.prompt("Reason for rejecting this registration:", "Registration rejected by the Regional Officer.");
    if (reason === null) return;

    try {
      await api.post(`/users/${userId}/reject/`, { reason });
      setMessage("Registration rejected.");
      setError("");
      await refreshUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function handleAssignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const roleId = Number(assignmentForm.roleId);
    if (!selectedUserIds.length || !roleId) {
      setError("Select at least one user and one leadership position.");
      return;
    }

    const chosenRole = roles.find((role) => role.id === roleId);
    if (!chosenRole) {
      setError("Selected role could not be found.");
      return;
    }

    const isBranchScoped = ["BRANCH", "MINISTRY", "SELF"].includes(chosenRole.scope);
    const targetBranch = isBranchScoped && assignmentForm.orgLevel !== "JIMBO" ? assignmentForm.branchId : "";

    if (isBranchScoped && !targetBranch) {
      setError("Choose the relevant Tawi before assigning a scoped role.");
      return;
    }

    const duplicateUserIds = selectedUsers
      .filter((user) =>
        user.roles?.some(
          (role) =>
            role.code === chosenRole.code &&
            (isBranchScoped ? Number(role.branch) === Number(targetBranch) : role.branch == null),
        ) || (!isBranchScoped && user.role_codes.includes(chosenRole.code)),
      )
      .map((user) => user.id);
    const duplicateSet = new Set(duplicateUserIds);
    const usersToAssign = selectedUsers.filter((user) => !duplicateSet.has(user.id));

    if (!usersToAssign.length) {
      setError("Every selected user already has this role at the chosen scope.");
      return;
    }

    setAssigning(true);
    setError("");
    setMessage("");
    const assignedUserIds: number[] = [];
    const failures: string[] = [];

    for (const user of usersToAssign) {
      const payload: Record<string, unknown> = {
        user: user.id,
        role: roleId,
        notes: assignmentForm.reason || "Assigned by the Regional Officer",
        start_date: assignmentForm.startDate || undefined,
        end_date: assignmentForm.expiryDate || undefined,
      };

      if (isBranchScoped) payload["branch"] = Number(targetBranch);
      if (assignmentForm.permissions.length) payload["permission_codes"] = assignmentForm.permissions;

      try {
        await api.post("/role-assignments/", payload);
        assignedUserIds.push(user.id);
      } catch (requestError) {
        failures.push(`${user.first_name || user.username}: ${getApiErrorMessage(requestError)}`);
      }
    }

    const completedUserIds = [...assignedUserIds, ...duplicateUserIds];
    if (completedUserIds.length) {
      setSelectedUserIds((current) => current.filter((userId) => !completedUserIds.includes(userId)));
      setMessage(
        `${assignedUserIds.length} role assignment${assignedUserIds.length === 1 ? "" : "s"} completed.` +
          (duplicateUserIds.length ? ` ${duplicateUserIds.length} user${duplicateUserIds.length === 1 ? " already had" : "s already had"} this role and were skipped.` : ""),
      );
    }

    if (failures.length) setError(failures.join(" "));
    if (!failures.length) {
      setAssignmentOpen(false);
      setAssignmentForm(defaultAssignmentForm);
    }
    setAssigning(false);
    if (assignedUserIds.length) {
      await refreshUsers();
      await queryClient.invalidateQueries({ queryKey: ["user-role-management-roles"] });
    }
  }

  const openAssignmentForUser = (user: UserRecord) => {
    setSelectedUserIds([user.id]);
    setAssignmentOpen(true);
    setError("");
    setMessage("");
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  return (
    <main className="module-page">
      <header className="module-header">
        <div>
          <p>CASFETA ZANZIBAR</p>
          <h1>User &amp; Role Management</h1>
        </div>
        <Link to="/admin" className="button button-back">
          Back to dashboard
        </Link>
      </header>

      <section className="module-toolbar role-management-toolbar">
        <label className="module-search">
          Search users
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, username, or phone"
          />
        </label>
        <label className="module-search">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <button
          className="button button-primary"
          onClick={() => {
            setAssignmentOpen(true);
            setError("");
            setMessage("");
          }}
        >
          Assign Role
        </button>
      </section>

      <section className="role-feedback" aria-live="polite" aria-atomic="true">
        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {usersQuery.isError && <p className="error-message" role="alert">Could not load users: {getApiErrorMessage(usersQuery.error)}</p>}
        {rolesQuery.isError && <p className="error-message" role="alert">Could not load roles: {getApiErrorMessage(rolesQuery.error)}</p>}
      </section>

      <section className="module-table-wrap">
        {usersQuery.isLoading ? (
          <p className="module-empty">Loading user records...</p>
        ) : usersQuery.isError ? (
          <p className="module-empty">User records are unavailable.</p>
        ) : (
          <table className="module-table">
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered users"
                    checked={filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.includes(user.id))}
                    onChange={(event) => {
                      const visibleIds = filteredUsers.map((user) => user.id);
                      setSelectedUserIds((current) =>
                        event.target.checked
                          ? [...new Set([...current, ...visibleIds])]
                          : current.filter((userId) => !visibleIds.includes(userId)),
                      );
                    }}
                  />
                </th>
                <th scope="col">Full name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Registration date</th>
                <th scope="col">Account status</th>
                <th scope="col">Assigned level</th>
                <th scope="col">Assigned Jimbo</th>
                <th scope="col">Assigned Wilaya</th>
                <th scope="col">Assigned Tawi</th>
                <th scope="col">Current leadership position</th>
                <th scope="col">Permissions summary</th>
                <th scope="col">Last login</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
                const currentRoleNames = user.roles?.map((role) => role.name).join(", ") || "Unassigned";
                const userPermissions = user.role_codes.length ? user.role_codes.join(", ") : "None";
                const assignedBranch = user.roles?.find((role) => role.branch_name)?.branch_name ?? "Unassigned";
                const assignedDistrict = user.profile?.district ? districts.find((district) => district.id === user.profile?.district)?.name : "Unassigned";

                return (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${fullName} (${user.email})`}
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </td>
                    <td>{fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.profile?.phone || "—"}</td>
                    <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}</td>
                    <td>{user.is_active ? "Approved" : "Pending Approval"}</td>
                    <td>{user.roles?.length ? "Assigned" : "Unassigned"}</td>
                    <td>CASFETA Zanzibar</td>
                    <td>{assignedDistrict}</td>
                    <td>{assignedBranch}</td>
                    <td>{currentRoleNames}</td>
                    <td>{userPermissions}</td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : "Not available"}</td>
                    <td className="module-row-actions" style={{ minWidth: 220 }}>
                      <button className="text-button" onClick={() => window.alert(`${fullName}\nEmail: ${user.email}\nPhone: ${user.profile?.phone || "—"}\nStatus: ${user.is_active ? "Approved" : "Pending Approval"}\nRoles: ${currentRoleNames}`)}>
                        View details
                      </button>
                      <button className="text-button" onClick={() => void handleApprove(user.id)} disabled={user.is_active}>
                        Approve
                      </button>
                      <button className="text-button" onClick={() => void handleReject(user.id)} disabled={!user.is_active && !user.email}>
                        Reject
                      </button>
                      <button className="text-button" onClick={() => openAssignmentForUser(user)}>
                        Assign role
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredUsers.length && (
                <tr><td colSpan={14} className="module-empty">No users match this search and status filter.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {assignmentOpen && (
        <form className="module-form role-assignment-form" onSubmit={(event) => void handleAssignRole(event)}>
          <div className="module-form-heading">
            <h2>Assign leadership role</h2>
            <button className="text-button" type="button" onClick={() => setAssignmentOpen(false)} disabled={assigning}>
              Cancel
            </button>
          </div>

          <div className="module-form-grid">
            <section className="role-selected-users" aria-labelledby="role-selected-users-title">
              <h3 id="role-selected-users-title">Selected users <span>({selectedUserIds.length})</span></h3>
              {selectedUsers.length ? (
                <ul>
                  {selectedUsers.map((user) => (
                    <li key={user.id}>
                      <span>{`${user.first_name} ${user.last_name}`.trim() || user.username}<small>{user.email}</small></span>
                      <button className="text-button" type="button" aria-label={`Remove ${user.username}`} onClick={() => toggleUserSelection(user.id)} disabled={assigning}>Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <p>Select users with the checkboxes in the user list.</p>}
            </section>

            <label>
              Select leadership position
              <select
                value={assignmentForm.roleId}
                required
                aria-describedby="role-selection-help"
                disabled={rolesQuery.isLoading || rolesQuery.isError || assigning}
                onChange={(event) => {
                  const roleId = event.target.value;
                  const chosenRole = roles.find((role) => String(role.id) === roleId) || null;
                  setAssignmentForm((current) => ({
                    ...current,
                    roleId,
                    permissions: chosenRole?.permission_codes?.length ? chosenRole.permission_codes : current.permissions,
                  }));
                }}
              >
                <option value="">Select role</option>
                {activeRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <small id="role-selection-help">
                {rolesQuery.isLoading ? "Loading available roles..." : "Inactive roles cannot be assigned."}
              </small>
            </label>

            <label>
              Select organizational level
              <select
                value={assignmentForm.orgLevel}
                disabled={assigning}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    orgLevel: event.target.value as AssignmentFormState["orgLevel"],
                    districtId: event.target.value === "JIMBO" ? "" : current.districtId,
                    branchId: event.target.value === "JIMBO" ? "" : current.branchId,
                  }))
                }
              >
                <option value="JIMBO">Jimbo</option>
                <option value="WILAYA">Wilaya</option>
                <option value="TAWI">Tawi</option>
              </select>
            </label>

            {assignmentForm.orgLevel !== "JIMBO" && (
              <label>
                Select Wilaya
                <select
                  value={assignmentForm.districtId}
                  disabled={assigning}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, districtId: event.target.value, branchId: "" }))}
                >
                  <option value="">Select district</option>
                  {districtOptions.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {(assignmentForm.orgLevel === "TAWI" || assignmentForm.orgLevel === "WILAYA") && (
              <label>
                Select Tawi
                <select
                  value={assignmentForm.branchId}
                  disabled={assigning}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, branchId: event.target.value }))}
                >
                  <option value="">Select branch</option>
                  {selectedDistrictBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Assignment start date
              <input
                type="date"
                value={assignmentForm.startDate}
                disabled={assigning}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>

            <label>
              Expiry date (optional)
              <input
                type="date"
                value={assignmentForm.expiryDate}
                min={assignmentForm.startDate || undefined}
                disabled={assigning}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, expiryDate: event.target.value }))}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Reason for assignment
              <textarea
                rows={3}
                value={assignmentForm.reason}
                disabled={assigning}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, reason: event.target.value }))}
              />
            </label>

            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Permission matrix</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {permissionCatalog.map((permissionCode) => (
                  <label key={permissionCode} className="module-checkbox" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={assignmentForm.permissions.includes(permissionCode)}
                      disabled={assigning}
                      onChange={(event) => {
                        setAssignmentForm((current) => ({
                          ...current,
                          permissions: event.target.checked
                            ? [...current.permissions, permissionCode]
                            : current.permissions.filter((item) => item !== permissionCode),
                        }));
                      }}
                    />
                    {permissionCode}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="button button-outline"
              type="button"
              onClick={() => {
                setSelectedUserIds([]);
                setAssignmentForm(defaultAssignmentForm);
                setError("");
                setMessage("");
              }}
              disabled={assigning}
            >
              Clear form
            </button>
            <button className="button button-primary" type="submit" disabled={assigning || !selectedUserIds.length || !assignmentForm.roleId || rolesQuery.isLoading || rolesQuery.isError}>
              {assigning ? "Assigning..." : `Assign to ${selectedUserIds.length || "selected"} user${selectedUserIds.length === 1 ? "" : "s"}`}
            </button>
          </div>

          {selectedRole && (
            <p className="muted-note">
              Selected role: {selectedRole.name}. Scope: {selectedRole.scope}. {selectedRole.description || "No description is provided for this role."} {selectedRole.permission_codes?.length ? `Permissions: ${selectedRole.permission_codes.join(", ")}` : "No permissions are listed for this role."}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
