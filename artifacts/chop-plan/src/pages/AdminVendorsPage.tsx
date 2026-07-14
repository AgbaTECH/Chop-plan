import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { useListAdminVendors, useCreateAdminVendor, useDeleteAdminVendor, getListAdminVendorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye } from "lucide-react";

const vendorSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(7),
  area: z.string().min(2),
  cuisineType: z.string().min(2),
});

export default function AdminVendorsPage() {
  const { data: vendors, isLoading } = useListAdminVendors();
  const createVendor = useCreateAdminVendor();
  const deleteVendor = useDeleteAdminVendor();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { businessName: "", ownerName: "", email: "", password: "", phone: "", area: "", cuisineType: "" },
  });

  const onSubmit = (data: z.infer<typeof vendorSchema>) => {
    createVendor.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Vendor added" });
        queryClient.invalidateQueries({ queryKey: getListAdminVendorsQueryKey() });
        form.reset();
        setOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to add vendor", description: err?.data?.error, variant: "destructive" });
      }
    });
  };

  const handleDelete = (vendorId: number) => {
    deleteVendor.mutate({ vendorId }, {
      onSuccess: () => {
        toast({ title: "Vendor removed" });
        queryClient.invalidateQueries({ queryKey: getListAdminVendorsQueryKey() });
      },
      onError: () => toast({ title: "Failed to remove vendor", variant: "destructive" }),
    });
  };

  return (
    <AdminLayout title="Manage Vendors">
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono gap-2" data-testid="button-add-vendor">
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">New Vendor</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="businessName" render={({ field }) => (
                  <FormItem><FormLabel>Restaurant Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ownerName" render={({ field }) => (
                  <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><PasswordInput {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="area" render={({ field }) => (
                  <FormItem><FormLabel>Area</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cuisineType" render={({ field }) => (
                  <FormItem><FormLabel>Cuisine Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createVendor.isPending} className="font-mono" data-testid="button-submit-vendor">
                    {createVendor.isPending ? "Adding..." : "Add Vendor"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : vendors && vendors.length > 0 ? (
                vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.businessName}</TableCell>
                    <TableCell>{v.ownerName}</TableCell>
                    <TableCell className="text-muted-foreground">{v.email}</TableCell>
                    <TableCell>{v.area}</TableCell>
                    <TableCell>{v.cuisineType}</TableCell>
                    <TableCell className="font-mono">{v.subscriberCount}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/vendors/${v.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-view-vendor-${v.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} data-testid={`button-delete-vendor-${v.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No vendors yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
