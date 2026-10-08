import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Mail, Menu, Search, X } from "lucide-react";
import { ComponentType, ReactNode, useState } from "react";

import { logout } from "@/lib/api";
import casfetaLogo from "@/assets/casfetaLogo.png";

type NavItem = { icon: ComponentType<{ size?: number | string }>; label: string; active?: boolean; to?: string };

type DashboardShellProps = {
  navItems: NavItem[];
  userName: string;
  userRole: string;
  children: ReactNode;
};

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <img
      src={casfetaLogo}
      alt="CASFETA Zanzibar logo"
      width={size}
      height={size}
      className="logo-image"
      style={{ width: size, height: size }}
    />
  );
}

export function DashboardShell({ navItems, userName, userRole, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <LogoMark size={46} />
        <div>
          <p className="dash-brand-name">CASFETA ZANZIBAR</p>
          <p className="dash-brand-tag">Building Faith · Advancing Education · Serving the Community</p>
        </div>
      </div>
      <nav className="dash-nav">
        {navItems.map((item) => (
          <a key={item.label} href={item.to ?? "#"} className={`dash-nav-item${item.active ? " dash-nav-active" : ""}`}>
            <item.icon size={17} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="dash-user">
        <div className="dash-avatar" aria-hidden="true">{userName.charAt(0)}</div>
        <div>
          <p className="dash-user-name">{userName}</p>
          <p className="dash-user-role">{userRole}</p>
        </div>
      </div>
      <Link to="/" className="dash-logout" onClick={() => void logout().catch(() => undefined)}>
        <LogOut size={16} /> Sign out
      </Link>
    </aside>
  );

  return (
    <div className="dash-layout">
      <div className="dash-sidebar-desktop">{sidebar}</div>
      {open && (
        <div className="dash-sidebar-mobile">
          <button className="dash-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
          {sidebar}
        </div>
      )}
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="dash-search">
            <Search size={15} />
            <input placeholder="Search..." aria-label="Search" />
          </div>
          <div className="dash-top-actions">
            <button className="dash-icon-btn" aria-label="Notifications">
              <Bell size={17} />
              <span className="dash-badge">3</span>
            </button>
            <button className="dash-icon-btn" aria-label="Messages">
              <Mail size={17} />
            </button>
            <div className="dash-top-user">
              <div className="dash-avatar" aria-hidden="true">{userName.charAt(0)}</div>
              <div>
                <p className="dash-user-name">{userName}</p>
                <p className="dash-user-role">{userRole}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  );
}
