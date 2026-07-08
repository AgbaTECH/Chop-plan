import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Utensils, X, LayoutDashboard, LogOut, ChevronRight, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}

function Navbar() {
  const { isAuthenticated, role, name, logoutLocally } = useAuth();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        logoutLocally();
        setLocation("/");
        setMobileMenuOpen(false);
      }
    });
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/vendors", label: "Vendors" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-secondary">Chop Plan</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Button variant="ghost" asChild className="hover:bg-accent/10 hover:text-accent font-medium">
                <Link href="/auth/vendor">For Restaurants</Link>
              </Button>
              <Button asChild className="font-medium rounded-full px-6">
                <Link href="/auth/user">Sign In / Sign Up</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href={role === "vendor" ? "/vendor/dashboard" : "/user/dashboard"}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out" data-testid="button-logout-desktop">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Nav Toggle */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
              <Menu className="w-5 h-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs flex flex-col p-0 border-l-0">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-foreground p-1 rounded">
                  <Utensils className="w-4 h-4" />
                </div>
                <span className="font-serif text-lg font-bold">Chop Plan</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto py-4 px-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-md text-base font-medium hover:bg-muted transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="h-px bg-border my-2 mx-4" />
              <Link 
                href="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-md text-base font-medium hover:bg-muted transition-colors"
              >
                Support & FAQ
              </Link>
              <Link 
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-md text-base font-medium hover:bg-muted transition-colors"
              >
                Contact Us
              </Link>
            </div>

            <div className="p-4 border-t bg-muted/30 flex flex-col gap-3">
              {!isAuthenticated ? (
                <>
                  <Button variant="outline" asChild className="w-full justify-center">
                    <Link href="/auth/vendor" onClick={() => setMobileMenuOpen(false)}>For Restaurants</Link>
                  </Button>
                  <Button asChild className="w-full justify-center">
                    <Link href="/auth/user" onClick={() => setMobileMenuOpen(false)}>Sign In / Sign Up</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href={role === "vendor" ? "/vendor/dashboard" : "/user/dashboard"} onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Utensils className="w-5 h-5" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white">Chop Plan</span>
            </Link>
            <p className="text-sm text-secondary-foreground/70 mb-4">
              Premium prepaid lunch subscriptions for busy professionals across Lagos, Nigeria.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Discover</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/80">
              <li><Link href="/vendors" className="hover:text-primary transition-colors">Browse Vendors</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/80">
              <li><Link href="/support" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">For Partners</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/80">
              <li><Link href="/auth/vendor" className="hover:text-primary transition-colors">Restaurant Signup</Link></li>
              <li><Link href="/auth/vendor" className="hover:text-primary transition-colors">Partner Login</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-secondary-foreground/10 text-center text-sm text-secondary-foreground/50">
          <p>© {new Date().getFullYear()} Chop Plan Nigeria. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
