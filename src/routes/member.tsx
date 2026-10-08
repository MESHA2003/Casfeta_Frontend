import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  Home,
  Link2,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  User,
  Users,
  Video,
} from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import zanzibarCoast from "@/assets/casfeta.jpg";
import {
  api,
  clearTokens,
  getApiErrorMessage,
  getApiList,
  getCurrentUser,
  hasAccessToken,
} from "@/lib/api";

export const Route = createFileRoute("/member")({
  head: () => ({
    meta: [
      { title: "Member Dashboard — CASFETA Zanzibar" },
      { name: "description", content: "Member dashboard for your profile, events, resources, and ministry services." },
      { property: "og:title", content: "Member Dashboard — CASFETA Zanzibar" },
      { property: "og:description", content: "Your events, attendance, certificates, and learning resources at CASFETA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemberDashboard,
});

const navItems = [
  { icon: Home, label: "Dashboard", active: true, to: "/member" },
  { icon: User, label: "My Profile", to: "/modules/profile" },
  { icon: Users, label: "Membership", to: "/modules/membership" },
  { icon: CalendarDays, label: "Events", to: "/modules/events" },
  { icon: ClipboardCheck, label: "Attendance", to: "/modules/attendance" },
  { icon: BookOpen, label: "Resources", to: "/modules/resources" },
  { icon: GraduationCap, label: "Academic Learning", to: "/modules/academic" },
  { icon: HeartHandshake, label: "Prayer Requests", to: "/modules/prayer" },
  { icon: MessageSquare, label: "Testimonies", to: "/modules/testimonies" },
  { icon: Megaphone, label: "Announcements", to: "/modules/announcements" },
  { icon: MessageSquare, label: "Messages", to: "/modules/messages" },
  { icon: Award, label: "Certificates", to: "/modules/certificates" },
  { icon: User, label: "Leader Profile", to: "/modules/leaders" },
  { icon: Search, label: "Search", to: "/modules/search" },
  { icon: Settings, label: "Settings", to: "/modules/settings" },
];

type MemberEvent = {
  id: number;
  title: string;
  start_date: string;
  start_time: string | null;
  venue: string;
  branch_name: string | null;
  registration_count: number;
  is_full: boolean;
  requires_registration: boolean;
  fee: string;
  currency: string;
  my_registration: { id: number; status: string; qr_token: string } | null;
};

type Announcement = { id: number; title: string; summary: string; body: string; created_at: string };
type MemberResource = {
  id: number;
  title: string;
  resource_type: string;
  external_url: string;
  file_url: string | null;
};
type MemberRegistration = { id: number; event: number; event_title: string; status: string };
type PrayerRequest = { id: number; reference: string; subject: string; status: string; created_at: string };
type Membership = {
  id: number;
  member_id: string;
  status_display: string;
  is_card_valid: boolean;
  event_count: number;
  attendance_count: number;
};
type MembershipResponse = { has_membership: boolean; member?: Membership };
type NotificationItem = { id: number; title: string; body: string; created_at: string; is_read: boolean };
type NotificationSummary = { unread_count: number; latest: NotificationItem[] };

const prayerCategories = [
  ["ACADEMIC", "Academic"],
  ["SPIRITUAL", "Spiritual"],
  ["FAMILY", "Family"],
  ["FINANCIAL", "Financial"],
  ["PERSONAL", "Personal"],
  ["CAREER", "Career"],
  ["HEALTH", "Health"],
  ["OTHER", "Other"],
];

function MemberDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasToken = hasAccessToken();
  const { data: user, isError } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: hasToken,
    retry: false,
  });
  const membershipQuery = useQuery({
    queryKey: ["my-membership"],
    queryFn: async () => (await api.get<MembershipResponse>("/members/me/")).data,
    enabled: hasToken,
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ["member-events"],
    queryFn: () => getApiList<MemberEvent>("/events/", { upcoming: true, is_public: true, page_size: 5 }),
    enabled: hasToken,
    retry: false,
  });
  const registrationsQuery = useQuery({
    queryKey: ["my-event-registrations"],
    queryFn: () => getApiList<MemberRegistration>("/event-registrations/mine/"),
    enabled: hasToken,
    retry: false,
  });
  const announcementsQuery = useQuery({
    queryKey: ["member-announcements"],
    queryFn: () => getApiList<Announcement>("/announcements/", { status: "PUBLISHED", page_size: 5 }),
    enabled: hasToken,
    retry: false,
  });
  const resourcesQuery = useQuery({
    queryKey: ["member-resources"],
    queryFn: () => getApiList<MemberResource>("/resources/", { status: "PUBLISHED", page_size: 8 }),
    enabled: hasToken,
    retry: false,
  });
  const prayersQuery = useQuery({
    queryKey: ["my-prayer-requests"],
    queryFn: () => getApiList<PrayerRequest>("/prayer-requests/mine/"),
    enabled: hasToken,
    retry: false,
  });
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications"],
    queryFn: async () => (await api.get<NotificationSummary>("/notifications/unread/")).data,
    enabled: hasToken,
    retry: false,
  });
  const certificatesQuery = useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => getApiList<{ id: number }>("/certificates/mine/"),
    enabled: hasToken,
    retry: false,
  });
  const member = membershipQuery.data?.member;
  const qrQuery = useQuery({
    queryKey: ["membership-card-qr", member?.id],
    queryFn: async () => {
      const { data } = await api.get<Blob>(`/members/${member?.id}/card-qr/`, {
        responseType: "blob",
      });
      return URL.createObjectURL(data);
    },
    enabled: Boolean(member?.id),
    retry: false,
  });
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [prayerFormOpen, setPrayerFormOpen] = useState(false);
  const [prayerSubject, setPrayerSubject] = useState("");
  const [prayerCategory, setPrayerCategory] = useState("PERSONAL");
  const [prayerDetails, setPrayerDetails] = useState("");
  const [allowPublic, setAllowPublic] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isSubmittingPrayer, setIsSubmittingPrayer] = useState(false);

  useEffect(() => {
    if (!hasToken || isError) {
      clearTokens();
      navigate({ to: "/" });
    }
  }, [hasToken, isError, navigate]);

  useEffect(() => {
    const imageUrl = qrQuery.data;
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [qrQuery.data]);

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</main>;
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const userRole = user.role_codes[0]?.replaceAll("_", " ").toLowerCase() ?? "Member";
  const events = eventsQuery.data ?? [];
  const registrations = registrationsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];
  const prayerRequests = prayersQuery.data ?? [];
  const notifications = notificationsQuery.data?.latest ?? [];
  const tiles = [
    { icon: CalendarDays, label: "My Events", value: String(registrations.length), tone: "tile-blue" },
    { icon: ClipboardCheck, label: "Attendance", value: String(member?.attendance_count ?? 0), tone: "tile-green" },
    { icon: Award, label: "My Certificates", value: String(certificatesQuery.data?.length ?? 0), tone: "tile-violet" },
    { icon: BookOpen, label: "Resources", value: String(resources.length), tone: "tile-orange" },
  ];

  async function registerForEvent(event: MemberEvent) {
    setActionError("");
    setActionMessage("");
    setActiveEventId(event.id);
    try {
      const { data } = await api.post<{ confirmation?: string }>(`/events/${event.id}/register/`, {});
      setActionMessage(data.confirmation ?? `You are registered for ${event.title}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["member-events"] }),
        queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] }),
      ]);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setActiveEventId(null);
    }
  }

  async function submitPrayerRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setActionMessage("");
    setIsSubmittingPrayer(true);
    try {
      await api.post("/prayer-requests/", {
        category: prayerCategory,
        subject: prayerSubject,
        details: prayerDetails,
        allow_public: allowPublic,
      });
      setActionMessage("Your private prayer request has been submitted.");
      setPrayerSubject("");
      setPrayerDetails("");
      setAllowPublic(false);
      setPrayerFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["my-prayer-requests"] });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setIsSubmittingPrayer(false);
    }
  }

  async function downloadResource(resource: MemberResource) {
    setActionError("");
    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const { data } = await api.get<Blob>(`/resources/${resource.id}/download/`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = resource.title;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  }

  return (
    <DashboardShell navItems={navItems} userName={userName} userRole={userRole}>
      <section className="member-hero" style={{ backgroundImage: `url(${zanzibarCoast})` }}>
        <div className="member-hero-shade">
          <div>
            <p className="member-hello">Welcome back,</p>
            <h1>{userName}</h1>
            <p className="member-sub">You are part of CASFETA. Together, we can do more!</p>
          </div>
          <div className="member-id-card">
            <div>
              <span>Member ID</span>
              <strong>{member?.member_id ?? "Pending approval"}</strong>
              <em className={`status-pill ${member?.is_card_valid ? "st-green" : "st-orange"}`}>
                {member?.status_display ?? "Not yet approved"}
              </em>
            </div>
            <div className="qr-box">
              {qrQuery.data ? <img src={qrQuery.data} alt="Membership card QR code" /> : <span>QR unavailable</span>}
            </div>
          </div>
        </div>
      </section>

      {(actionError || actionMessage) && (
        <div className={actionError ? "error-message" : "success-message"} role="status">
          {actionError || actionMessage}
        </div>
      )}

      <div className="stat-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`stat-tile ${t.tone}`}>
            <t.icon size={22} />
            <p>{t.label}</p>
            <strong>{t.value}</strong>
            <span>Updated from your account</span>
          </div>
        ))}
      </div>

      <div className="panel-grid two">
        <section className="panel">
          <h2>Upcoming Events</h2>
          {eventsQuery.isLoading ? <p className="muted-note">Loading events...</p> : null}
          {eventsQuery.isError ? <p className="muted-note">Events could not be loaded.</p> : null}
          {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 ? (
            <p className="muted-note">There are no upcoming events right now.</p>
          ) : null}
          <div className="event-list">
            {events.map((event) => {
              const registration = event.my_registration ?? registrations.find((item) => item.event === event.id);
              return (
                <article className="event-card" key={event.id}>
                  <div className="event-thumb"><GraduationCap size={30} /></div>
                  <div>
                    <h3>{event.title}</h3>
                    <p><CalendarDays size={13} /> {new Date(`${event.start_date}T00:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                    {event.start_time && <p><ClipboardCheck size={13} /> {event.start_time.slice(0, 5)}</p>}
                    <p><Users size={13} /> {event.venue || event.branch_name || "Venue to be announced"}</p>
                    {registration ? (
                      <span className="status-pill st-green">{registration.status.replaceAll("_", " ")}</span>
                    ) : (
                      <button
                        className="button button-primary"
                        disabled={event.is_full || activeEventId === event.id}
                        onClick={() => void registerForEvent(event)}
                      >
                        {event.is_full ? "Event Full" : activeEventId === event.id ? "Registering..." : "Register Now"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2><Megaphone size={17} /> Announcements</h2>
          {announcementsQuery.isLoading ? <p className="muted-note">Loading announcements...</p> : null}
          {announcementsQuery.isError ? <p className="muted-note">Announcements could not be loaded.</p> : null}
          <ul className="reminder-list">
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <span className="ann-initial rem-blue">{announcement.title.charAt(0)}</span>
                <p>{announcement.title}: {announcement.summary || announcement.body}</p>
                <time>{new Date(announcement.created_at).toLocaleDateString("en-US")}</time>
              </li>
            ))}
          </ul>
          {!announcementsQuery.isLoading && !announcementsQuery.isError && announcements.length === 0 ? (
            <p className="muted-note">There are no announcements yet.</p>
          ) : null}
        </section>
      </div>

      <section className="panel">
        <h2>Resources</h2>
        {resourcesQuery.isLoading ? <p className="muted-note">Loading resources...</p> : null}
        {resourcesQuery.isError ? <p className="muted-note">Resources could not be loaded.</p> : null}
        <div className="resource-grid">
          {resources.map((resource) => (
            <article key={resource.id} className="resource-card">
              <span className="res-icon res-blue"><FileText size={20} /></span>
              <p>{resource.title}</p>
              <button className="text-button" onClick={() => void downloadResource(resource)}>
                {resource.external_url ? "Open resource" : "Download"}
              </button>
            </article>
          ))}
        </div>
        {!resourcesQuery.isLoading && !resourcesQuery.isError && resources.length === 0 ? (
          <p className="muted-note">No resources are available to your account yet.</p>
        ) : null}
      </section>

      <div className="panel-grid two">
        <section className="panel prayer-panel">
          <h2>Private Prayer Requests <a className="panel-link">View All →</a></h2>
          <div className="prayer-box">
            <HeartHandshake size={34} />
            <h3>Your prayer requests are private.</h3>
            <p>They will not be shared publicly without your permission.</p>
            {!prayerFormOpen ? (
              <button className="button button-primary" onClick={() => setPrayerFormOpen(true)}>
                Submit a Prayer Request
              </button>
            ) : (
              <form className="prayer-request-form" onSubmit={submitPrayerRequest}>
                <label>
                  Category
                  <select value={prayerCategory} onChange={(event) => setPrayerCategory(event.target.value)}>
                    {prayerCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  Subject
                  <input required maxLength={200} value={prayerSubject} onChange={(event) => setPrayerSubject(event.target.value)} />
                </label>
                <label>
                  Prayer request
                  <textarea required minLength={10} value={prayerDetails} onChange={(event) => setPrayerDetails(event.target.value)} />
                </label>
                <label className="prayer-public-option">
                  <input type="checkbox" checked={allowPublic} onChange={(event) => setAllowPublic(event.target.checked)} />
                  Allow this request to be shared if it is answered
                </label>
                <div className="form-actions">
                  <button className="button button-back" type="button" onClick={() => setPrayerFormOpen(false)}>Cancel</button>
                  <button className="button button-primary" type="submit" disabled={isSubmittingPrayer}>
                    {isSubmittingPrayer ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
          <ul className="reminder-list">
            {prayerRequests.slice(0, 3).map((request) => (
              <li key={request.id}>
                <span className="rem-dot rem-blue" />
                <p>{request.subject}</p>
                <time>{request.status.replaceAll("_", " ")}</time>
              </li>
            ))}
          </ul>
          {prayersQuery.isError && <p className="muted-note">Your prayer requests could not be loaded.</p>}
        </section>
        <section className="panel">
          <h2>Recent Notifications</h2>
          <ul className="reminder-list">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <span className="rem-dot rem-blue" />
                <p>{notification.title}</p>
                <time>{new Date(notification.created_at).toLocaleDateString("en-US")}</time>
              </li>
            ))}
          </ul>
          {notificationsQuery.isError && <p className="muted-note">Notifications could not be loaded.</p>}
          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? (
            <p className="muted-note">You have no new notifications.</p>
          ) : null}
        </section>
      </div>

      <section className="verse-banner" style={{ backgroundImage: `url(${zanzibarCoast})` }}>
        <div>
          <p>"Let all that you do be done in love."</p>
          <span>1 Corinthians 16:14</span>
        </div>
      </section>

      <section className="panel">
        <h2><Briefcase size={17} /> Opportunities</h2>
        <p className="muted-note">Job, scholarship, and academic opportunities are listed with your resources.</p>
      </section>
    </DashboardShell>
  );
}
