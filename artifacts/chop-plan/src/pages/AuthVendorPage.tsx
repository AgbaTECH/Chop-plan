import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useVendorLogin,
  useVendorSignup,
  useVendorVerify,
  useVendorResendOtp,
  useVendorForgotPassword,
  useVendorResetPassword,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = loginSchema.extend({
  ownerName: z.string().min(2),
  businessName: z.string().min(2),
  description: z.string().min(10),
  area: z.string().min(2),
  cuisineType: z.string().min(2),
  phone: z.string().min(7),
});

const codeSchema = z.object({
  code: z.string().min(6).max(6),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  code: z.string().min(6).max(6),
  newPassword: z.string().min(6),
});

type Step = "form" | "verify" | "forgot" | "reset";

export default function AuthVendorPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");
  const [pendingEmail, setPendingEmail] = useState("");

  const loginMutation = useVendorLogin();
  const signupMutation = useVendorSignup();
  const verifyMutation = useVendorVerify();
  const resendMutation = useVendorResendOtp();
  const forgotMutation = useVendorForgotPassword();
  const resetMutation = useVendorResetPassword();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      ownerName: "", 
      email: "", 
      password: "",
      businessName: "",
      description: "",
      area: "",
      cuisineType: "",
      phone: "",
    },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", newPassword: "" },
  });

  function onLogin(data: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, 'vendor', res.name);
        toast({ title: "Welcome back to your dashboard" });
        setLocation("/vendor/dashboard");
      },
      onError: (err) => {
        if (err.status === 403 && err.data && "requiresVerification" in err.data && err.data.requiresVerification) {
          setPendingEmail(err.data.email);
          setStep("verify");
          toast({ title: "Please verify your account", description: "We sent you a verification code earlier. Enter it below, or resend a new one." });
          return;
        }
        toast({ 
          title: "Login failed", 
          description: err.data?.error || "Invalid credentials",
          variant: "destructive" 
        });
      }
    });
  }

  function onSignup(data: z.infer<typeof signupSchema>) {
    signupMutation.mutate({ data }, {
      onSuccess: (res) => {
        setPendingEmail(res.email);
        setStep("verify");
        toast({ title: "Verification code sent", description: res.message });
      },
      onError: (err) => {
        toast({ 
          title: "Signup failed", 
          description: err.data?.error || "Could not create account",
          variant: "destructive" 
        });
      }
    });
  }

  function onVerify(data: z.infer<typeof codeSchema>) {
    verifyMutation.mutate({ data: { email: pendingEmail, code: data.code } }, {
      onSuccess: (res) => {
        login(res.token, 'vendor', res.name);
        toast({ title: "Account verified!" });
        setLocation("/vendor/dashboard");
      },
      onError: (err) => {
        if (err.data?.error?.includes("already verified")) {
          toast({ title: "Already verified", description: "Please log in with your password." });
          loginForm.reset({ email: pendingEmail, password: "" });
          setStep("form");
          return;
        }
        toast({
          title: "Verification failed",
          description: err.data?.error || "Invalid code",
          variant: "destructive"
        });
      }
    });
  }

  function onResend() {
    resendMutation.mutate({ data: { email: pendingEmail } }, {
      onSuccess: (res) => {
        toast({ title: "Code resent", description: res.message });
      },
      onError: (err) => {
        toast({
          title: "Could not resend code",
          description: err.data?.error || "Please try again later",
          variant: "destructive"
        });
      }
    });
  }

  function onForgot(data: z.infer<typeof forgotSchema>) {
    forgotMutation.mutate({ data }, {
      onSuccess: (res) => {
        setPendingEmail(data.email);
        setStep("reset");
        toast({ title: "Reset code sent", description: res.message });
      },
      onError: (err) => {
        toast({
          title: "Request failed",
          description: err.data?.error || "Could not send reset code",
          variant: "destructive"
        });
      }
    });
  }

  function onReset(data: z.infer<typeof resetSchema>) {
    resetMutation.mutate({ data: { email: pendingEmail, code: data.code, newPassword: data.newPassword } }, {
      onSuccess: () => {
        toast({ title: "Password reset", description: "You can now log in with your new password" });
        setStep("form");
        resetForm.reset();
        loginForm.reset({ email: pendingEmail, password: "" });
      },
      onError: (err) => {
        toast({
          title: "Reset failed",
          description: err.data?.error || "Invalid or expired code",
          variant: "destructive"
        });
      }
    });
  }

  if (step === "verify") {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md shadow-lg border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-3xl text-primary">Verify your account</CardTitle>
            <CardDescription>Enter the code sent to {pendingEmail}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onVerify)} className="space-y-4">
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full font-mono" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full font-mono"
                  disabled={resendMutation.isPending}
                  onClick={onResend}
                >
                  {resendMutation.isPending ? "Resending..." : "Resend code"}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setStep("form")}>
                  Back to login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "forgot") {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md shadow-lg border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-3xl text-primary">Forgot password</CardTitle>
            <CardDescription>We'll email you a reset code</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hello@restaurant.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full font-mono" disabled={forgotMutation.isPending}>
                  {forgotMutation.isPending ? "Sending..." : "Send reset code"}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setStep("form")}>
                  Back to login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md shadow-lg border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-3xl text-primary">Reset password</CardTitle>
            <CardDescription>Enter the code sent to {pendingEmail} and a new password</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full font-mono" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? "Resetting..." : "Reset password"}
                </Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setStep("form")}>
                  Back to login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md shadow-lg border-border bg-card">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-serif text-3xl text-primary">Restaurant Portal</CardTitle>
          <CardDescription>Manage your meal subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-mono">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="font-mono">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@restaurant.com" {...field} />
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
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-mono mt-4" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Logging in..." : "Log In"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full font-mono"
                    onClick={() => {
                      forgotForm.reset({ email: loginForm.getValues("email") });
                      setStep("forgot");
                    }}
                  >
                    Forgot password?
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 pb-2">
                  <FormField
                    control={signupForm.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="hello@restaurant.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="0801 234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restaurant Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Amala Central" {...field} />
                        </FormControl>
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
                          <Input placeholder="e.g. Local, Continental, Vegan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area (Lagos)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Yaba, Lekki, Ikeja" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Tell customers about your food..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-mono mt-4" disabled={signupMutation.isPending}>
                    {signupMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
