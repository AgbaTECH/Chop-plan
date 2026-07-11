import { VendorLayout } from "@/components/VendorLayout";
import { useListVendorCustomers } from "@workspace/api-client-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function VendorCustomersPage() {
  const { data: customers, isLoading } = useListVendorCustomers();

  return (
    <VendorLayout title="Customer Subscriptions">
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active Plan</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : customers && customers.length > 0 ? (
                  customers.map((customer, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="font-serif">{customer.planName}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.startDate ? format(new Date(customer.startDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.status === 'active' ? 'default' : 'secondary'}
                          className="font-mono uppercase text-[10px]"
                        >
                          {customer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No customers found. Wait for users to subscribe to your plans.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </VendorLayout>
  );
}
