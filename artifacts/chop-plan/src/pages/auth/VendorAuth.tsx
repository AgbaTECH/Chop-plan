import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useVendorLogin, useVendorSignup, useListAreas } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Store } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  businessName: z.string().min(2, "Business name required"),
  ownerName: z.string().min(2, "Owner name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  area: z.string().min(1, "Area is required"),
  cuisineType: z.string().min(2, "Cuisine type required"),
  description: z.string().optional(),
});

export default function VendorAuth() {
  const [activeTab, setActiveTab] = useState("login");
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useVendorLogin();
  const signupMutation = useVendorSignup();
  const { data: areas = [], isLoading: isLoadingAreas } = useListAreas();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      businessName: "", ownerName: "", email: "", password: "", 
      phone: "", area: "", cuisineType: "", description: "" 
    },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuthContext(res.token, res.role, res.name, res.email, res.id);
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/vendor/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err?.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    });
  };

  const onSignup = (data: z.infer<typeof signupSchema>) => {
    signupMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuthContext(res.token, res.role, res.name, res.email, res.id);
        toast({ title: "Partner Account created!", description: "Welcome to Chop Plan." });
        setLocation("/vendor/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Sign up failed",
          description: err?.message || "Something went wrong",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-secondary/5">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-secondary text-secondary-foreground p-2 rounded-md">
              <Store className="w-6 h-6" />
            </div>
            <span className="font-serif text-2xl font-bold text-secondary">Chop Plan Partners</span>
          </Link>
        </div>

        <div className="bg-card border-t-4 border-t-secondary rounded-b-3xl rounded-t-xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-secondary">Restaurant Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your subscriptions and meals</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 p-1 bg-secondary/10 text-secondary">
              <TabsTrigger value="login" className="rounded-xl font-medium data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl font-medium data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Partner Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@restaurant.com" {...field} data-testid="input-vendor-login-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-vendor-login-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 rounded-xl mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={loginMutation.isPending} data-testid="button-vendor-login-submit">
                    {loginMutation.isPending ? "Logging in..." : "Log In to Dashboard"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restaurant Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Tasty Bites" {...field} data-testid="input-vendor-signup-business" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner/Manager Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} data-testid="input-vendor-signup-owner" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="hello@tastybites.com" {...field} data-testid="input-vendor-signup-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="080..." {...field} data-testid="input-vendor-signup-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 6 characters" {...field} data-testid="input-vendor-signup-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Area</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingAreas}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vendor-signup-area">
                                <SelectValue placeholder="Select Area" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {areas.map((area) => (
                                <SelectItem key={area} value={area}>{area}</SelectItem>
                              ))}
                              {areas.length === 0 && <SelectItem value="Lekki">Lekki</SelectItem>}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="cuisineType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cuisine Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Nigerian, Continental..." {...field} data-testid="input-vendor-signup-cuisine" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signupForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell customers about your food..." className="resize-none" {...field} data-testid="input-vendor-signup-desc" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-12 rounded-xl mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={signupMutation.isPending} data-testid="button-vendor-signup-submit">
                    {signupMutation.isPending ? "Setting up..." : "Apply as Partner"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          Looking to subscribe for meals? <Link href="/auth/user" className="font-medium text-primary hover:underline">Go to User Portal</Link>
        </p>
      </div>
    </div>
  );
}
