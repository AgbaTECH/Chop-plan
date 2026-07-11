import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from './lib/auth-context';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import ContactPage from './pages/ContactPage';
import SupportPage from './pages/SupportPage';
import AuthUserPage from './pages/AuthUserPage';
import AuthVendorPage from './pages/AuthVendorPage';
import AuthAdminPage from './pages/AuthAdminPage';
import VendorsPage from './pages/VendorsPage';
import VendorDetailPage from './pages/VendorDetailPage';
import UserDashboardPage from './pages/UserDashboardPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import VendorCustomersPage from './pages/VendorCustomersPage';
import VendorEarningsPage from './pages/VendorEarningsPage';
import VendorMealsPage from './pages/VendorMealsPage';
import VendorWalletPage from './pages/VendorWalletPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminVendorsPage from './pages/AdminVendorsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';

const queryClient = new QueryClient();

// Configure the API client to use our token
setAuthTokenGetter(() => {
  return localStorage.getItem('chop_plan_token');
});

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/blog" component={BlogPage} />
          <Route path="/blog/:slug" component={BlogPostPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/support" component={SupportPage} />
          
          <Route path="/auth/user" component={AuthUserPage} />
          <Route path="/auth/vendor" component={AuthVendorPage} />
          <Route path="/auth/admin" component={AuthAdminPage} />
          
          <Route path="/vendors" component={VendorsPage} />
          <Route path="/vendors/:id" component={VendorDetailPage} />
          
          <Route path="/dashboard" component={UserDashboardPage} />
          
          <Route path="/vendor/dashboard" component={VendorDashboardPage} />
          <Route path="/vendor/customers" component={VendorCustomersPage} />
          <Route path="/vendor/earnings" component={VendorEarningsPage} />
          <Route path="/vendor/wallet" component={VendorWalletPage} />
          <Route path="/vendor/meals" component={VendorMealsPage} />

          <Route path="/admin/dashboard" component={AdminDashboardPage} />
          <Route path="/admin/vendors" component={AdminVendorsPage} />
          <Route path="/admin/customers" component={AdminCustomersPage} />
          
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
