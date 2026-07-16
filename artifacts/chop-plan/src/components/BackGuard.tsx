/**
 * BackGuard — intercepts the browser back button while the user is signed in
 * and shows a "Sign out?" confirmation dialog.
 *
 * After login we push an extra history entry so the first "back" always hits
 * our popstate handler instead of navigating away silently. If the user
 * confirms logout we clear their session and redirect to the appropriate
 * login page.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BackGuard() {
  const { isAuthenticated, logout, role } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Push a barrier entry so "back" triggers popstate rather than leaving.
    window.history.pushState({ chopPlanBarrier: true }, "");

    const onPop = () => {
      // Re-push to re-block further back navigation while dialog is open.
      window.history.pushState({ chopPlanBarrier: true }, "");
      setOpen(true);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    const dest =
      role === "vendor" ? "/auth/vendor" : role === "admin" ? "/auth/admin" : "/auth/user";
    setLocation(dest);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl">Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            Going back will sign you out of your account. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay signed in</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
