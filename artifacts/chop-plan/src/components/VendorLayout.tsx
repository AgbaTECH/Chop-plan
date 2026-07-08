import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, CreditCard, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface VendorLayoutProps {
  children: ReactNode;
  title: string;
}

export function VendorLayout({ children, title }: VendorLayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, role, name } = useAuth();

  // Basic guard, real guard should be at page level or router
  if (!isAuthenticated || role !== "vendor") {
    return null;
  }

  const links = [
    { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendor/customers", label: "Customers", icon: Users },
    { href: "/vendor/earnings", label: "Earnings", icon: CreditCard },
    { href: "/vendor/meals", label: "Menu & Plans", icon: UtensilsCrossed },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-muted/20">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-sidebar-border">
          <h2 className="font-serif font-bold text-xl text-sidebar-foreground truncate" title={name || "Restaurant"}>
            {name || "Restaurant"}
          </h2>
          <p className="text-sidebar-foreground/60 text-sm font-mono mt-1">Vendor Portal</p>
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

      {/* Mobile nav (simple horizontal scroll) */}
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-10 max-w-6xl mx-auto">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-8">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
