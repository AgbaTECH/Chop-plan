import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Store, Users, UserPlus, Receipt, Landmark, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, role, name } = useAuth();

  // Redirect anyone who isn't a signed-in admin away from admin-only pages.
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth/admin");
    } else if (role === "vendor") {
      setLocation("/vendor/dashboard");
    } else if (role === "user") {
      setLocation("/vendors");
    }
  }, [isAuthenticated, role, setLocation]);

  if (!isAuthenticated || role !== "admin") {
    return null;
  }

  const links = [
    { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/vendors", label: "Vendors", icon: Store },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/transactions", label: "Transactions", icon: Receipt },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: Landmark },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/leads", label: "Leads", icon: UserPlus },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-muted/20">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="font-serif font-bold text-xl text-sidebar-foreground truncate" title={name || "Admin"}>
            {name || "Admin"}
          </h2>
          <p className="text-sidebar-foreground/60 text-sm font-mono mt-1">Admin Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => {
            const active = location === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:hidden bg-sidebar w-full overflow-x-auto border-b border-sidebar-border hide-scrollbar flex p-2 shrink-0">
        {links.map(link => {
          const active = location === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70"
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-10 max-w-6xl mx-auto">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-8">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
