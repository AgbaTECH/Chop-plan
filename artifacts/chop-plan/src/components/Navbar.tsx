import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useLogout } from "@workspace/api-client-react";
import logo from "@/assets/logo.png";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, role, name, logout: clearLocalAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        clearLocalAuth();
        setLocation("/");
        setIsOpen(false);
      }
    });
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/vendors", label: "Vendors" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/support", label: "Support" },
    { href: "/get-started", label: "Get Started" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 md:px-8 flex h-16 items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <img src={logo} alt="Chop Plan" className="h-9 w-9 object-contain" />
          <span className="font-serif text-2xl font-bold tracking-tight text-primary">Chop Plan</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`transition-colors hover:text-foreground/80 ${location === link.href ? "text-foreground font-semibold" : "text-foreground/60"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link 
                href={role === "vendor" ? "/vendor/dashboard" : role === "admin" ? "/admin/dashboard" : "/dashboard"}
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span>{name || "Dashboard"}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Link href="/auth/vendor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                For Restaurants
              </Link>
              <Button asChild size="sm" className="font-mono">
                <Link href="/auth/user">Sign In</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col border-l-0">
              <div className="mt-8 flex flex-col gap-6">
                {links.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-xl font-medium tracking-tight ${location === link.href ? "text-primary" : "text-foreground/70"}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-4 pb-8">
                {isAuthenticated ? (
                  <>
                    <Button asChild variant="outline" className="w-full justify-start text-lg h-12">
                      <Link href={role === "vendor" ? "/vendor/dashboard" : role === "admin" ? "/admin/dashboard" : "/dashboard"} onClick={() => setIsOpen(false)}>
                        <User className="h-5 w-5 mr-3" />
                        {name || "Dashboard"}
                      </Link>
                    </Button>
                    <Button variant="destructive" className="w-full justify-start text-lg h-12" onClick={handleLogout}>
                      <LogOut className="h-5 w-5 mr-3" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full text-lg h-12">
                      <Link href="/auth/vendor" onClick={() => setIsOpen(false)}>For Restaurants</Link>
                    </Button>
                    <Button asChild className="w-full text-lg h-12 font-mono">
                      <Link href="/auth/user" onClick={() => setIsOpen(false)}>Sign In</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
