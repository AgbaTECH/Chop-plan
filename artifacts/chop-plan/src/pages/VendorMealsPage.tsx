import { useState } from "react";
import { VendorLayout } from "@/components/VendorLayout";
import {
  useListMyMeals,
  useCreateMeal,
  useUpdateMeal,
  useDeleteMeal,
  useListMyPlans,
  useUpsertBasicPlan,
  useUpsertPremiumPlan,
  useDeleteVendorPlan,
  getListMyPlansQueryKey,
  Meal,
  VendorBasicPlan,
  VendorPremiumPlan,
  TimetableDayInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, UtensilsCrossed, ClipboardList, Crown, Star } from "lucide-react";
import { PhotoUploadField } from "@/components/PhotoUploadField";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type MealForm = {
  name: string;
  description: string;
  priceNaira: string;
  imageUrl: string | null;
  category: string;
  available: boolean;
};

const emptyForm: MealForm = {
  name: "",
  description: "",
  priceNaira: "",
  imageUrl: null,
  category: "",
  available: true,
};

export default function VendorMealsPage() {
  const { toast } = useToast();
  const { data: meals, isLoading } = useListMyMeals();
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [form, setForm] = useState<MealForm>(emptyForm);

  const openCreate = () => {
    setEditingMeal(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setForm({
      name: meal.name,
      description: meal.description,
      priceNaira: String(meal.priceNaira),
      imageUrl: meal.imageUrl || null,
      category: meal.category || "",
      available: meal.available,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.imageUrl) {
      toast({ title: "Add a photo of this meal", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      priceNaira: Number(form.priceNaira) || 0,
      imageUrl: form.imageUrl,
      category: form.category || undefined,
      available: form.available,
    };

    if (editingMeal) {
      updateMeal.mutate({ mealId: editingMeal.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Meal updated" });
          setDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to update meal", variant: "destructive" }),
      });
    } else {
      createMeal.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Meal added to menu" });
          setDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to add meal", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (mealId: number) => {
    deleteMeal.mutate({ mealId }, {
      onSuccess: () => toast({ title: "Meal removed" }),
      onError: () => toast({ title: "Failed to remove meal", variant: "destructive" }),
    });
  };

  const isSaving = createMeal.isPending || updateMeal.isPending;

  return (
    <VendorLayout title="Menu & Plans">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">Manage the meals customers see on your restaurant page.</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono" onClick={openCreate} data-testid="button-add-meal">
              <Plus className="w-4 h-4 mr-1" /> Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editingMeal ? "Edit Meal" : "Add New Meal"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="meal-name">Name</Label>
                <Input id="meal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-meal-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-desc">Description</Label>
                <Textarea id="meal-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-meal-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meal-price">Price (₦)</Label>
                  <Input id="meal-price" type="number" value={form.priceNaira} onChange={(e) => setForm({ ...form, priceNaira: e.target.value })} data-testid="input-meal-price" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meal-category">Category</Label>
                  <Input id="meal-category" placeholder="e.g. Rice, Soups" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="input-meal-category" />
                </div>
              </div>
              <PhotoUploadField
                label="Meal photo"
                testIdPrefix="meal-image"
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                emptyHint="Shown to customers on this meal's card"
              />
              <div className="flex items-center justify-between border rounded-md p-3">
                <Label htmlFor="meal-available">Available</Label>
                <Switch id="meal-available" checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} data-testid="switch-meal-available" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="font-mono" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="font-mono" onClick={handleSubmit} disabled={isSaving} data-testid="button-save-meal">
                {isSaving ? "Saving..." : "Save Meal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full" />)}
        </div>
      ) : meals && meals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <Card key={meal.id} className="overflow-hidden border-border">
              {meal.imageUrl && (
                <div className="w-full h-36 bg-muted overflow-hidden">
                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-serif">{meal.name}</CardTitle>
                  <Badge variant={meal.available ? "default" : "secondary"} className="font-mono text-[10px] shrink-0">
                    {meal.available ? "Available" : "Hidden"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{meal.description}</p>
                <p className="font-mono font-bold text-primary">₦{meal.priceNaira.toLocaleString('en-NG')}</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" className="flex-1 font-mono" onClick={() => openEdit(meal)} data-testid={`button-edit-meal-${meal.id}`}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1 font-mono" data-testid={`button-delete-meal-${meal.id}`}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif">Remove this meal?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove "{meal.name}" from your public menu.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-mono">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="font-mono" onClick={() => handleDelete(meal.id)}>
                        Yes, Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-2xl font-serif font-bold mb-2">No meals yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">Add your first meal so customers know what to expect.</p>
          <Button className="font-mono" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add Meal
          </Button>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Kitchen Profile Per Plan
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose which of your meals customers see included at each plan tier, so they know what to expect before subscribing.
          </p>
        </div>
        <PlanMealsManager meals={meals ?? []} />
      </div>
    </VendorLayout>
  );
}

// Every pickup plan is one of exactly two fixed tiers — Basic (one fixed
// meal) or Premium (a 4-day rotation plus one distinct free-day meal).
// Both are pickup-only.
function PlanMealsManager({ meals }: { meals: Meal[] }) {
  const { data: plans, isLoading } = useListMyPlans();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BasicPlanCard plan={plans?.basic ?? null} meals={meals} />
      <PremiumPlanCard plan={plans?.premium ?? null} meals={meals} />
    </div>
  );
}

function BasicPlanCard({ plan, meals }: { plan: VendorBasicPlan | null; meals: Meal[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertBasic = useUpsertBasicPlan();
  const deletePlan = useDeleteVendorPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceNaira, setPriceNaira] = useState(plan ? String(plan.priceNaira) : "");
  const [daysPerMonth, setDaysPerMonth] = useState(plan ? String(plan.daysPerMonth) : "12");
  const [freeDays, setFreeDays] = useState(plan ? String(plan.freeDays) : "3");
  const [mealId, setMealId] = useState<string>(plan?.mealId ? String(plan.mealId) : "");

  const mealsById = new Map(meals.map((m) => [m.id, m]));

  const openEdit = () => {
    setPriceNaira(plan ? String(plan.priceNaira) : "");
    setDaysPerMonth(plan ? String(plan.daysPerMonth) : "12");
    setFreeDays(plan ? String(plan.freeDays) : "3");
    setMealId(plan?.mealId ? String(plan.mealId) : (meals[0] ? String(meals[0].id) : ""));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!mealId) {
      toast({ title: "Choose the meal Basic customers will get", variant: "destructive" });
      return;
    }
    upsertBasic.mutate(
      { data: { priceNaira: Number(priceNaira) || 0, daysPerMonth: Number(daysPerMonth) || 0, freeDays: Number(freeDays) || 0, mealId: Number(mealId) } },
      {
        onSuccess: () => {
          toast({ title: "Basic plan saved" });
          queryClient.invalidateQueries({ queryKey: getListMyPlansQueryKey() });
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: err?.error ?? "Failed to save Basic plan", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deletePlan.mutate(
      { tier: "basic" },
      {
        onSuccess: () => {
          toast({ title: "Basic plan removed" });
          queryClient.invalidateQueries({ queryKey: getListMyPlansQueryKey() });
        },
        onError: (err: any) => toast({ title: err?.error ?? "Failed to remove Basic plan", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Basic
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px] shrink-0">Pickup only</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {plan ? (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>₦{plan.priceNaira.toLocaleString("en-NG")} · {plan.daysPerMonth} days + {plan.freeDays} free</p>
            <p>Meal: <span className="text-foreground">{mealsById.get(plan.mealId ?? -1)?.name ?? "Unknown"}</span></p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Not set up yet. Offer a simple single-meal plan any customer can subscribe to.</p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1 font-mono" onClick={openEdit} data-testid="button-edit-basic-plan">
          <Pencil className="w-3.5 h-3.5 mr-1" /> {plan ? "Edit" : "Set Up"}
        </Button>
        {plan && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-mono" data-testid="button-delete-basic-plan">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif">Remove your Basic plan?</AlertDialogTitle>
                <AlertDialogDescription>Blocked if any customer is actively subscribed to it.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono">Cancel</AlertDialogCancel>
                <AlertDialogAction className="font-mono" onClick={handleDelete}>Yes, Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Basic Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Price (₦)</Label>
                <Input type="number" value={priceNaira} onChange={(e) => setPriceNaira(e.target.value)} data-testid="input-basic-price" />
              </div>
              <div className="space-y-2">
                <Label>Days/month</Label>
                <Input type="number" value={daysPerMonth} onChange={(e) => setDaysPerMonth(e.target.value)} data-testid="input-basic-days" />
              </div>
              <div className="space-y-2">
                <Label>Free days</Label>
                <Input type="number" value={freeDays} onChange={(e) => setFreeDays(e.target.value)} data-testid="input-basic-free-days" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meal served every day</Label>
              {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Add a meal to your menu first.</p>
              ) : (
                <Select value={mealId} onValueChange={setMealId}>
                  <SelectTrigger data-testid="select-basic-meal"><SelectValue placeholder="Choose a meal" /></SelectTrigger>
                  <SelectContent>
                    {meals.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="font-mono" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="font-mono" onClick={handleSave} disabled={upsertBasic.isPending} data-testid="button-save-basic-plan">
              {upsertBasic.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type DaySlot = { type: "none" | "rotation" | "free"; mealId: string };

function buildInitialSlots(plan: VendorPremiumPlan | null): DaySlot[] {
  const slots: DaySlot[] = Array.from({ length: 7 }, () => ({ type: "none", mealId: "" }));
  if (plan) {
    for (const r of plan.rotation) slots[r.dayOfWeek] = { type: "rotation", mealId: String(r.mealId) };
    slots[plan.freeDay.dayOfWeek] = { type: "free", mealId: String(plan.freeDay.mealId) };
  }
  return slots;
}

function PremiumPlanCard({ plan, meals }: { plan: VendorPremiumPlan | null; meals: Meal[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertPremium = useUpsertPremiumPlan();
  const deletePlan = useDeleteVendorPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceNaira, setPriceNaira] = useState(plan ? String(plan.priceNaira) : "");
  const [slots, setSlots] = useState<DaySlot[]>(() => buildInitialSlots(plan));

  const eligible = meals.length >= 2;
  const mealsById = new Map(meals.map((m) => [m.id, m]));

  const openEdit = () => {
    setPriceNaira(plan ? String(plan.priceNaira) : "");
    setSlots(buildInitialSlots(plan));
    setDialogOpen(true);
  };

  const setSlotType = (day: number, type: DaySlot["type"]) => {
    setSlots((prev) => prev.map((s, i) => (i === day ? { type, mealId: type === "none" ? "" : (s.mealId || (meals[0] ? String(meals[0].id) : "")) } : s)));
  };
  const setSlotMeal = (day: number, mealId: string) => {
    setSlots((prev) => prev.map((s, i) => (i === day ? { ...s, mealId } : s)));
  };

  const rotationCount = slots.filter((s) => s.type === "rotation").length;
  const freeCount = slots.filter((s) => s.type === "free").length;

  const handleSave = () => {
    if (rotationCount !== 4 || freeCount !== 1) {
      toast({ title: "Pick exactly 4 rotation days and 1 free day", variant: "destructive" });
      return;
    }
    const rotation: TimetableDayInput[] = slots
      .map((s, dayOfWeek) => ({ s, dayOfWeek }))
      .filter(({ s }) => s.type === "rotation")
      .map(({ s, dayOfWeek }) => ({ dayOfWeek, mealId: Number(s.mealId) }));
    const freeDayIndex = slots.findIndex((s) => s.type === "free");
    const freeDay: TimetableDayInput = { dayOfWeek: freeDayIndex, mealId: Number(slots[freeDayIndex].mealId) };

    upsertPremium.mutate(
      { data: { priceNaira: Number(priceNaira) || 0, rotation, freeDay } },
      {
        onSuccess: () => {
          toast({ title: "Premium plan saved" });
          queryClient.invalidateQueries({ queryKey: getListMyPlansQueryKey() });
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: err?.error ?? "Failed to save Premium plan", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deletePlan.mutate(
      { tier: "premium" },
      {
        onSuccess: () => {
          toast({ title: "Premium plan removed" });
          queryClient.invalidateQueries({ queryKey: getListMyPlansQueryKey() });
        },
        onError: (err: any) => toast({ title: err?.error ?? "Failed to remove Premium plan", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" /> Premium
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px] shrink-0">Pickup only</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {!eligible ? (
          <p className="text-sm text-muted-foreground italic">Add at least 2 menu items to unlock Premium (4-day rotation + free day).</p>
        ) : plan ? (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>₦{plan.priceNaira.toLocaleString("en-NG")} · {plan.daysPerMonth} days + {plan.freeDays} free / month</p>
            <ul className="space-y-0.5">
              {plan.rotation.map((r) => (
                <li key={r.dayOfWeek}>{DAY_NAMES[r.dayOfWeek]}: <span className="text-foreground">{mealsById.get(r.mealId)?.name ?? "Unknown"}</span></li>
              ))}
              <li>{DAY_NAMES[plan.freeDay.dayOfWeek]} (free): <span className="text-foreground">{mealsById.get(plan.freeDay.mealId)?.name ?? "Unknown"}</span></li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Not set up yet. Offer a weekly rotation with a bonus free-day meal.</p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1 font-mono" onClick={openEdit} disabled={!eligible} data-testid="button-edit-premium-plan">
          <Pencil className="w-3.5 h-3.5 mr-1" /> {plan ? "Edit" : "Set Up"}
        </Button>
        {plan && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-mono" data-testid="button-delete-premium-plan">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif">Remove your Premium plan?</AlertDialogTitle>
                <AlertDialogDescription>Blocked if any customer is actively subscribed to it.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono">Cancel</AlertDialogCancel>
                <AlertDialogAction className="font-mono" onClick={handleDelete}>Yes, Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Premium Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Price (₦/month)</Label>
              <Input type="number" value={priceNaira} onChange={(e) => setPriceNaira(e.target.value)} data-testid="input-premium-price" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Choose exactly 4 rotation days and 1 free day ({rotationCount}/4 rotation, {freeCount}/1 free).</p>
              {DAY_NAMES.map((name, day) => (
                <div key={day} className="flex items-center gap-2 p-2 rounded-md border border-border">
                  <span className="w-24 text-sm shrink-0">{name}</span>
                  <Select value={slots[day].type} onValueChange={(v) => setSlotType(day, v as DaySlot["type"])}>
                    <SelectTrigger className="w-32 shrink-0" data-testid={`select-day-type-${day}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Off</SelectItem>
                      <SelectItem value="rotation">Rotation</SelectItem>
                      <SelectItem value="free">Free day</SelectItem>
                    </SelectContent>
                  </Select>
                  {slots[day].type !== "none" && (
                    <Select value={slots[day].mealId} onValueChange={(v) => setSlotMeal(day, v)}>
                      <SelectTrigger data-testid={`select-day-meal-${day}`}><SelectValue placeholder="Meal" /></SelectTrigger>
                      <SelectContent>
                        {meals.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="font-mono" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="font-mono" onClick={handleSave} disabled={upsertPremium.isPending} data-testid="button-save-premium-plan">
              {upsertPremium.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
