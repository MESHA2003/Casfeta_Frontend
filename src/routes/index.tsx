import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  HandCoins,
  HeartHandshake,
  LockKeyhole,
  LogIn,
  Mail,
  Menu,
  Phone,
  School,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import zanzibarCoast from "@/assets/casfeta.jpg";
import casfetaLogo from "@/assets/casfetaLogo.png";
import { getApiErrorMessage, getApiList, login, register } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CASFETA Zanzibar — Sign In or Join" },
      {
        name: "description",
        content:
          "CASFETA Zanzibar's digital platform for members, events, finance, resources, and community services.",
      },
      { property: "og:title", content: "CASFETA Zanzibar — Sign In or Join" },
      {
        property: "og:description",
        content: "Build faith, advance education, and serve the community with CASFETA Zanzibar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Mode = "login" | "register";
type PublicBranch = { id: number; name: string; district_name: string | null };

const services = [
  {
    icon: Users,
    title: "Membership",
    text: "Member registration and management",
    tone: "service-green",
  },
  {
    icon: CalendarDays,
    title: "Events",
    text: "Event registration, attendance, and updates",
    tone: "service-blue",
  },
  {
    icon: HandCoins,
    title: "Finance",
    text: "Financial records and regional contributions",
    tone: "service-violet",
  },
  {
    icon: BookOpen,
    title: "Resources",
    text: "Books, articles, videos, and learning materials",
    tone: "service-orange",
  },
  {
    icon: HeartHandshake,
    title: "Prayer & Testimonies",
    text: "Share prayer requests privately",
    tone: "service-teal",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    text: "Track statistics and organizational progress",
    tone: "service-pink",
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={casfetaLogo}
        alt="CASFETA Zanzibar logo"
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        className={`${compact ? "size-10" : "size-12"} logo-image`}
      />
      <div>
        <p
          className={`${compact ? "text-sm" : "text-base"} font-extrabold leading-none text-primary`}
        >
          CASFETA ZANZIBAR
        </p>
        <p className="mt-1 text-[9px] font-semibold text-muted-foreground">
          Building Faith · Advancing Education · Serving the Community
        </p>
      </div>
    </div>
  );
}

function Index() {
  const [mode, setMode] = useState<Mode>("login");
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="site-header">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {["Home", "About", "Events", "Resources", "Contact"].map((item, index) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={`nav-link ${index === 0 ? "nav-link-active" : ""}`}
            >
              {item}
            </a>
          ))}
          <button className="button button-outline" onClick={() => setMode("login")}>
            Sign in
          </button>
          <button className="button button-light" onClick={() => setMode("register")}>
            Join
          </button>
        </nav>
        <button
          className="icon-button lg:hidden"
          aria-label="Open menu"
          onClick={() => setMobileMenu((open) => !open)}
        >
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
        {mobileMenu && (
          <div className="mobile-menu">
            <button
              className="mobile-menu-item"
              onClick={() => {
                setMode("login");
                setMobileMenu(false);
              }}
            >
              Sign in
            </button>
            <button
              className="mobile-menu-item"
              onClick={() => {
                setMode("register");
                setMobileMenu(false);
              }}
            >
              Join us
            </button>
          </div>
        )}
      </header>

      <section className={`auth-stage ${mode === "register" ? "register-stage" : ""}`}>
        <div className="hero-panel">
          <img
            src={zanzibarCoast}
            alt="Zanzibar coastline with blue water and the historic town"
            className="hero-image"
            width={1280}
            height={1024}
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow">Welcome</p>
            <h1>
              CASFETA
              <br />
              ZANZIBAR
            </h1>
            <p className="hero-script">
              Building Faith
              <br />
              Advancing Education
              <br />
              Serving the Community
            </p>
            <span className="yellow-stroke" aria-hidden="true" />
            <p className="hero-description">
              CASFETA is a Christian student fellowship supporting spiritual growth, education,
              leadership, testimony, and community service across Zanzibar.
            </p>
            <div className="stats-grid">
              <Stat icon={Users} value="1,450+" label="Members" />
              <Stat icon={Building2} value="25" label="Branches" />
              <Stat icon={HeartHandshake} value="10+" label="Ministries" />
              <Stat icon={CalendarDays} value="43+" label="Events" />
            </div>
          </div>
        </div>

        <div className="auth-panel">
          {mode === "login" ? (
            <LoginForm onRegister={() => setMode("register")} />
          ) : (
            <RegisterForm onBack={() => setMode("login")} />
          )}
        </div>
      </section>

      <section className="services-section" id="resources">
        <div className="section-inner">
          <h2>Our Services</h2>
          <div className="services-grid">
            {services.map(({ icon: Icon, title, text, tone }) => (
              <article className="service-card" key={title}>
                <span className={`service-icon ${tone}`}>
                  <Icon size={26} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <Logo compact />
        <p>© 2026 CASFETA. Zanzibar Region. All rights reserved.</p>
        <div className="footer-dots" aria-label="Social media">
          <span>f</span>
          <span>◎</span>
          <span>▶</span>
        </div>
      </footer>
    </main>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="stat">
      <Icon size={22} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const user = await login({
        username: String(formData.get("username")),
        password: String(formData.get("password")),
      });
      const adminRoles = ["SUPER_ADMIN", "JIMBO_ADMIN"];
      const isAdmin = user.role_codes?.some((role) => adminRoles.includes(role)) ?? false;
      navigate({ to: isAdmin ? "/admin" : "/member" });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-card login-card">
      <div className="auth-brand">
        <Logo />
      </div>
      <div className="auth-heading">
        <h2>Sign in to your account</h2>
        <p>Enter your details to access the platform.</p>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="form-stack">
        <label className="field">
          <span className="sr-only">Username or email</span>
          <User size={18} />
          <input name="username" autoComplete="username" required placeholder="Username or email" />
        </label>
        <label className="field">
          <span className="sr-only">Password</span>
          <LockKeyhole size={18} />
          <input
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
          />
          <button
            type="button"
            className="field-action"
            onClick={() => setShowPassword((show) => !show)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>
        <div className="form-options">
          <label>
            <input type="checkbox" /> <span>Remember me</span>
          </label>
          <a href="#reset">Forgot password?</a>
        </div>
        <button className="button button-primary button-wide" type="submit" disabled={isSubmitting}>
          <LogIn size={17} /> {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="divider">
        <span>or</span>
      </div>
      <button className="button button-google button-wide" type="button">
        <span className="google-mark">G</span> Continue with Google
      </button>
      <p className="switch-copy">
        Don't have an account? <button onClick={onRegister}>Join now</button>
      </p>
      <p className="switch-copy">
        View dashboards:{" "}
        <Link to="/admin">
          <strong>Admin</strong>
        </Link>{" "}
        ·{" "}
        <Link to="/member">
          <strong>Member</strong>
        </Link>
      </p>
    </div>
  );
}

const steps = ["Basic Details", "School & Branch", "Contact Details", "Finish"];

function RegisterForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const branchesQuery = useQuery({
    queryKey: ["public-branches"],
    queryFn: () => getApiList<PublicBranch>("/branches/public/"),
    retry: false,
  });

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    const nameParts = (formValues["full_name"] ?? "").trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setError("Enter both your first and last name.");
      return;
    }
    setIsSubmitting(true);
    try {
      await register({
        username: (formValues["username"] ?? "").trim(),
        email: (formValues["email"] ?? "").trim(),
        first_name: nameParts.shift() ?? "",
        last_name: nameParts.join(" "),
        password: formValues["password"] ?? "",
        confirm_password: formValues["confirm_password"] ?? "",
        phone: formValues["phone"] ?? "",
        preferred_language: "en",
        gender: (formValues["gender"] ?? "") as "MALE" | "FEMALE",
        date_of_birth: formValues["date_of_birth"] || null,
        branch: Number(formValues["branch"]),
        course_programme: formValues["course_programme"] ?? "",
        study_year: formValues["study_year"] ? Number(formValues["study_year"]) : null,
        address: formValues["address"] ?? "",
        emergency_contact_name: formValues["emergency_relationship"] ?? "",
        emergency_contact_phone: formValues["emergency_phone"] ?? "",
      });
      setComplete(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="register-wrap">
      <div className="register-intro">
        <div>
          <p className="welcome-script">Welcome to CASFETA</p>
          <h2>Join Us</h2>
          <p>Enter your details to create a CASFETA Zanzibar account.</p>
        </div>
        <button className="text-button" onClick={onBack}>
          Already have an account?<strong> Sign in</strong>
        </button>
      </div>
      <div className="register-card">
        <div className="stepper">
          {steps.map((label, index) => (
            <div className={`step ${step >= index + 1 ? "step-active" : ""}`} key={label}>
              <span>{step > index + 1 ? <Check size={14} /> : index + 1}</span>
              <p>{label}</p>
            </div>
          ))}
        </div>
        {complete ? (
          <div className="completion">
            <span>
              <ShieldCheck size={38} />
            </span>
            <h3>Registration complete!</h3>
            <p>Thank you for joining the CASFETA Zanzibar community.</p>
            <button className="button button-primary" onClick={() => navigate({ to: "/member" })}>
              Open dashboard
            </button>
          </div>
        ) : (
          <form
            onSubmit={next}
            onChange={(event) => {
              const field = event.target;
              if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
                setFormValues((values) => ({ ...values, [field.name]: field.value }));
              }
            }}
          >
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            {step === 1 && (
              <StepOne
                values={formValues}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
            )}
            {step === 2 && <StepTwo values={formValues} branches={branchesQuery.data ?? []} branchesLoading={branchesQuery.isLoading} />}
            {step === 3 && <StepThree values={formValues} />}
            {step === 4 && <Review />}
            <div className="form-nav">
              <button
                className="button button-back"
                type="button"
                onClick={() => (step > 1 ? setStep((current) => current - 1) : onBack())}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button className="button button-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : step === 4 ? "Complete" : "Continue"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
      <blockquote>
        “Welcome to the CASFETA Zanzibar community;
        <br />
        together, we build a generation of believers, students, and leaders.”
      </blockquote>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  icon: Icon,
  placeholder,
  type = "text",
  action,
  required = true,
}: {
  label: string;
  name: string;
  value: string | undefined;
  icon: typeof User;
  placeholder: string;
  type?: string;
  action?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="register-field">
      <span>
        {label} <b>*</b>
      </span>
      <div>
        <Icon size={16} />
        <input name={name} defaultValue={value} required={required} type={type} placeholder={placeholder} />
        {action}
      </div>
    </label>
  );
}

function StepOne({
  values,
  showPassword,
  setShowPassword,
}: {
  values: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div className="step-body">
      <h3>1. Basic Details</h3>
      <div className="field-grid">
        <FormField
          name="full_name"
          value={values["full_name"]}
          label="Full Name"
          icon={User}
          placeholder="Enter your full name"
        />
        <FormField
          name="username"
          value={values["username"]}
          label="Username or ID Number"
          icon={ShieldCheck}
          placeholder="Choose a username"
        />
        <label className="register-field">
          <span>
            Gender <b>*</b>
          </span>
          <div>
            <Users size={16} />
            <select name="gender" required defaultValue={values["gender"] ?? ""}>
              <option value="" disabled>
                Select gender
              </option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </label>
        <FormField
          name="email"
          value={values["email"]}
          label="Email address"
          icon={Mail}
          type="email"
          placeholder="name@example.com"
        />
        <FormField
          name="date_of_birth"
          value={values["date_of_birth"]}
          label="Date of Birth"
          icon={CalendarDays}
          type="date"
          placeholder="DD/MM/YYYY"
          required={false}
        />
        <FormField
          name="password"
          value={values["password"]}
          label="Password"
          icon={LockKeyhole}
          type={showPassword ? "text" : "password"}
          placeholder="Enter a password (at least 8 characters)"
          action={
            <button
              type="button"
              className="field-action"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Eye size={15} />
            </button>
          }
        />
        <FormField
          name="confirm_password"
          value={values["confirm_password"]}
          label="Confirm Password"
          icon={LockKeyhole}
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password again"
        />
      </div>
    </div>
  );
}

function StepTwo({ values, branches, branchesLoading }: { values: Record<string, string>; branches: PublicBranch[]; branchesLoading: boolean }) {
  return (
    <div className="step-body">
      <h3>2. School and Branch Details</h3>
      <div className="field-grid">
        <FormField
          name="course_programme"
          value={values["course_programme"]}
          label="Course / Programme"
          icon={School}
          placeholder="Enter your course or programme"
          required={false}
        />
        <label className="register-field">
          <span>Branch <b>*</b></span>
          <div>
            <Users size={16} />
            <select name="branch" required defaultValue={values["branch"] ?? ""}>
              <option value="" disabled>{branchesLoading ? "Loading branches..." : "Select a branch"}</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.district_name ? ` · ${branch.district_name}` : ""}</option>)}
            </select>
          </div>
        </label>
        <FormField
          name="study_year"
          value={values["study_year"]}
          label="Study Year"
          icon={CalendarDays}
          placeholder="Enter your year of study"
          type="number"
          required={false}
        />
      </div>
    </div>
  );
}

function StepThree({ values }: { values: Record<string, string> }) {
  return (
    <div className="step-body">
      <h3>3. Contact Details</h3>
      <div className="field-grid">
        <FormField
          name="phone"
          value={values["phone"]}
          label="Phone Number"
          icon={Phone}
          type="tel"
          placeholder="07xxxxxxxx"
        />
        <FormField
          name="emergency_phone"
          value={values["emergency_phone"]}
          label="Emergency Phone Number"
          icon={Phone}
          type="tel"
          placeholder="Enter an emergency phone number"
        />
        <FormField
          name="emergency_relationship"
          value={values["emergency_relationship"]}
          label="Relationship"
          icon={Users}
          placeholder="Example: Parent or guardian"
        />
        <FormField
          name="address"
          value={values["address"]}
          label="Home Address"
          icon={Building2}
          placeholder="Street / District"
        />
      </div>
    </div>
  );
}

function Review() {
  return (
    <div className="step-body review">
      <span>
        <ShieldCheck size={32} />
      </span>
      <h3>4. Review and Complete</h3>
      <p>
        Make sure your details are correct. By completing registration, you agree to the CASFETA
        Zanzibar terms and conditions.
      </p>
      <label className="terms">
        <input type="checkbox" required /> I agree to the terms and conditions
      </label>
    </div>
  );
}
