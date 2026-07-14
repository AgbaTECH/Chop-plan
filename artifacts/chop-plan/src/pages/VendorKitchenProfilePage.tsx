import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/VendorLayout";
import { useGetVendorProfile, useUpdateVendorProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoUploadField } from "@/components/PhotoUploadField";
import { PhotoGalleryUploadField } from "@/components/PhotoGalleryUploadField";

type ProfileForm = {
  businessName: string;
  description: string;
  cuisineType: string;
  coverImage: string | null;
  kitchenPhotos: string[];
};

const emptyForm: ProfileForm = {
  businessName: "",
  description: "",
  cuisineType: "",
  coverImage: null,
  kitchenPhotos: [],
};

export default function VendorKitchenProfilePage() {
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetVendorProfile();
  const updateProfile = useUpdateVendorProfile();
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName,
        description: profile.description ?? "",
        cuisineType: profile.cuisineType,
        coverImage: profile.coverImage ?? null,
        kitchenPhotos: profile.kitchenPhotos ?? [],
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate(
      {
        data: {
          businessName: form.businessName,
          description: form.description,
          cuisineType: form.cuisineType,
          coverImage: form.coverImage ?? "",
          kitchenPhotos: form.kitchenPhotos,
        },
      },
      {
        onSuccess: () => toast({ title: "Kitchen profile saved" }),
        onError: () => toast({ title: "Failed to save kitchen profile", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <VendorLayout title="Kitchen Profile">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout title="Kitchen Profile">
      <p className="text-muted-foreground mb-6 max-w-2xl">
        This is what customers see on your public restaurant page — your name, cuisine, description, and photos of your kitchen and cooking.
      </p>

      <div className="grid gap-6 max-w-3xl">
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kp-business-name">Business name</Label>
              <Input
                id="kp-business-name"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                data-testid="input-kp-business-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kp-cuisine">Cuisine type</Label>
              <Input
                id="kp-cuisine"
                placeholder="e.g. Nigerian, Continental, Grills"
                value={form.cuisineType}
                onChange={(e) => setForm({ ...form, cuisineType: e.target.value })}
                data-testid="input-kp-cuisine"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kp-description">Description</Label>
              <Textarea
                id="kp-description"
                placeholder="Tell customers what makes your kitchen special..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="input-kp-description"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            <PhotoUploadField
              label="Cover photo"
              testIdPrefix="kp-cover"
              value={form.coverImage}
              onChange={(url) => setForm({ ...form, coverImage: url })}
              emptyHint="Shown at the top of your public restaurant page"
            />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Kitchen photos</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add a few photos of your kitchen, cooking process, or dishes in progress. These show up on your public profile.
              </p>
            </div>
            <PhotoGalleryUploadField
              photos={form.kitchenPhotos}
              onChange={(kitchenPhotos) => setForm({ ...form, kitchenPhotos })}
              testIdPrefix="kp-gallery"
            />
          </CardContent>
        </Card>

        <div>
          <Button className="font-mono" onClick={handleSave} disabled={updateProfile.isPending} data-testid="button-save-kitchen-profile">
            {updateProfile.isPending ? "Saving..." : "Save Kitchen Profile"}
          </Button>
        </div>
      </div>
    </VendorLayout>
  );
}
