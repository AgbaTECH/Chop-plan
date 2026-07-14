import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { useGetAdminVendorDetail } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, ShieldOff, Landmark, ImageOff } from "lucide-react";

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = Number(params.id);
  const { data: vendor, isLoading, error } = useGetAdminVendorDetail(vendorId);

  return (
    <AdminLayout title="Vendor Detail">
      <Link href="/admin/vendors">
        <Button variant="ghost" className="mb-6 -ml-2 gap-2 font-mono" data-testid="button-back-vendors">
          <ArrowLeft className="w-4 h-4" /> Back to Vendors
        </Button>
      </Link>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !vendor ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">Vendor not found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="font-serif text-2xl">{vendor.businessName}</CardTitle>
                <p className="text-muted-foreground mt-1">{vendor.ownerName} · {vendor.email} · {vendor.phone}</p>
                <p className="text-sm text-muted-foreground mt-1">{vendor.area} · {vendor.cuisineType} · ★ {vendor.rating.toFixed(1)}</p>
              </div>
              <Badge variant="secondary" className={vendor.verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                {vendor.verified ? <ShieldCheck className="w-3.5 h-3.5 mr-1" /> : <ShieldOff className="w-3.5 h-3.5 mr-1" />}
                {vendor.verified ? "Verified" : "Unverified"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.description ? (
                <p className="text-sm text-foreground">{vendor.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No kitchen description on file.</p>
              )}
              <div className="flex flex-wrap gap-3">
                {vendor.coverImage && (
                  <img src={vendor.coverImage} alt="Cover" className="w-28 h-28 object-cover rounded-md border border-border" />
                )}
                {vendor.kitchenPhotos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Kitchen photo ${i + 1}`} className="w-28 h-28 object-cover rounded-md border border-border" />
                ))}
                {!vendor.coverImage && vendor.kitchenPhotos.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                    <ImageOff className="w-4 h-4" /> No kitchen photos uploaded.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Active subscribers</p>
                  <p className="font-mono text-lg font-bold">{vendor.subscriberCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Off-schedule markup</p>
                  <p className="font-mono text-lg font-bold">
                    {vendor.offScheduleMarkupPercent !== null ? `${vendor.offScheduleMarkupPercent}%` : "Default"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Landmark className="w-5 h-5" /> Bank Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendor.bankAccount ? (
                <p className="text-sm">
                  <span className="font-medium">{vendor.bankAccount.bankName}</span> · {vendor.bankAccount.accountNumber} · {vendor.bankAccount.accountName}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bank account attached yet — vendor cannot withdraw.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="font-serif text-xl font-bold">Plan Tiers</h2>
            {vendor.plans.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">No plans set up yet.</CardContent></Card>
            ) : (
              vendor.plans.map((plan) => (
                <Card key={plan.id} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-serif text-lg capitalize">{plan.tier}</CardTitle>
                    <span className="font-mono font-bold">₦{plan.priceNaira.toLocaleString("en-NG")}/mo</span>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {plan.daysPerMonth} days/month · {plan.freeDays} free day{plan.freeDays === 1 ? "" : "s"} · {plan.mealCount} meal{plan.mealCount === 1 ? "" : "s"}
                    </p>
                    {plan.tier === "basic" ? (
                      <p className="text-sm">Fixed meal: <span className="font-medium">{plan.basicMealName ?? "Not set"}</span></p>
                    ) : plan.timetable && plan.timetable.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {plan.timetable.map((entry) => (
                          <div key={entry.dayOfWeek} className="border border-border rounded-md p-2 text-sm">
                            <p className="font-mono text-xs text-muted-foreground">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][entry.dayOfWeek]}
                              {entry.isFreeDay && <span className="ml-1 text-primary">(free)</span>}
                            </p>
                            <p className="font-medium truncate">{entry.mealName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No timetable set yet.</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
