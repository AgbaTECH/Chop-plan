import { useState } from "react";
import { VendorLayout } from "@/components/VendorLayout";
import {
  useListMyMeals,
  useCreateMeal,
  useUpdateMeal,
  useDeleteMeal,
  useListMyPlans,
  useSetPlanMeals,
  getListMyPlansQueryKey,
  Meal,
  VendorPlanWithMeals,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, UtensilsCrossed, ClipboardList } from "lucide-react";

type MealForm = {
  name: string;
  description: string;
  priceNaira: string;
  imageUrl: string;
  category: string;
  available: boolean;
};

const emptyForm: MealForm = {
  name: "",
  description: "",
  priceNaira: "",
  imageUrl: "",
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
      imageUrl: meal.imageUrl,
      category: meal.category || "",
      available: meal.available,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
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
              <div className="space-y-2">
                <Label htmlFor="meal-image">Image URL</Label>
                <Input id="meal-image" placeholder="/images/meal.jpg" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} data-testid="input-meal-image" />
              </div>
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
                  <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
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

function PlanMealsManager({ meals }: { meals: Meal[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useListMyPlans();
  const setPlanMeals = useSetPlanMeals();

  const [editingPlan, setEditingPlan] = useState<VendorPlanWithMeals | null>(null);
  const [selectedMealIds, setSelectedMealIds] = useState<number[]>([]);

  const openEdit = (plan: VendorPlanWithMeals) => {
    setEditingPlan(plan);
    setSelectedMealIds(plan.mealIds);
  };

  const toggleMeal = (mealId: number) => {
    setSelectedMealIds((prev) =>
      prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId]
    );
  };

  const handleSave = () => {
    if (!editingPlan) return;
    setPlanMeals.mutate(
      { planId: editingPlan.id, data: { mealIds: selectedMealIds } },
      {
        onSuccess: () => {
          toast({ title: `${editingPlan.name} menu updated` });
          queryClient.invalidateQueries({ queryKey: getListMyPlansQueryKey() });
          setEditingPlan(null);
        },
        onError: () => toast({ title: "Failed to update plan menu", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
        <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">You don't have any plan tiers set up yet.</p>
      </div>
    );
  }

  const mealsById = new Map(meals.map((m) => [m.id, m]));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg font-serif">{plan.name}</CardTitle>
                <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                  {plan.mealIds.length} item{plan.mealIds.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              {plan.mealIds.length > 0 ? (
                <ul className="text-sm text-muted-foreground space-y-1 mb-2">
                  {plan.mealIds.slice(0, 3).map((id) => (
                    <li key={id} className="truncate">• {mealsById.get(id)?.name ?? "Deleted meal"}</li>
                  ))}
                  {plan.mealIds.length > 3 && (
                    <li className="text-xs italic">+{plan.mealIds.length - 3} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-2">No meals assigned yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full font-mono"
                onClick={() => openEdit(plan)}
                data-testid={`button-edit-plan-menu-${plan.id}`}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Menu
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={editingPlan !== null} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingPlan?.name} — Included Meals
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {meals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Add meals to your menu first, then come back to assign them to this plan.
              </p>
            ) : (
              meals.map((meal) => (
                <label
                  key={meal.id}
                  className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedMealIds.includes(meal.id)}
                    onCheckedChange={() => toggleMeal(meal.id)}
                    data-testid={`checkbox-plan-meal-${meal.id}`}
                  />
                  <span className="text-sm">{meal.name}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="font-mono" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button
              className="font-mono"
              onClick={handleSave}
              disabled={setPlanMeals.isPending}
              data-testid="button-save-plan-menu"
            >
              {setPlanMeals.isPending ? "Saving..." : "Save Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
