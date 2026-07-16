import { useState } from "react";
import { Link } from "wouter";
import { useListVendors, useListAreas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Utensils, Star, Search } from "lucide-react";
import { FallbackImage } from "@/components/FallbackImage";

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<string>("all");

  // Fetch data
  const { data: areas, isLoading: areasLoading } = useListAreas();
  const { data: vendors, isLoading: vendorsLoading } = useListVendors(
    area !== "all" ? { area } : {}
  );

  // Client-side search filtering
  const filteredVendors = vendors?.filter(vendor => 
    vendor.businessName.toLowerCase().includes(search.toLowerCase()) ||
    vendor.cuisineType.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Find a Restaurant</h1>
          <p className="text-muted-foreground text-lg">Browse curated lunch plans in your area.</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search restaurants..." 
              className="pl-9 bg-card border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-vendors"
            />
          </div>
          
          <Select value={area} onValueChange={setArea} disabled={areasLoading}>
            <SelectTrigger className="w-full sm:w-48 bg-card border-border" data-testid="select-area-filter">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {areas?.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {vendorsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="overflow-hidden border-border bg-card">
              <Skeleton className="w-full h-48 rounded-none" />
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVendors.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`} data-testid={`link-vendor-${vendor.id}`}>
              <Card className="h-full overflow-hidden border border-border hover-elevate cursor-pointer bg-card flex flex-col group transition-all">
                <div className="w-full h-48 bg-muted relative overflow-hidden">
                   <FallbackImage
                    src={vendor.coverImage ?? undefined}
                    alt={vendor.businessName}
                    fallback="vendor"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  {vendor.rating && (
                    <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      {vendor.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-xl leading-tight group-hover:text-primary transition-colors">
                    {vendor.businessName}
                  </CardTitle>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {vendor.area}
                    </span>
                    <span className="flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5" />
                      {vendor.cuisineType}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="mt-auto pt-0 pb-4">
                  <div className="flex justify-between items-end border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">Plans start at</span>
                    <span className="font-mono font-bold text-lg text-primary">
                      ₦{(vendor.lowestPlanPrice || 0).toLocaleString('en-NG')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-card rounded-xl border border-dashed border-border">
          <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-2xl font-serif font-bold mb-2">No restaurants found</h3>
          <p className="text-muted-foreground">We couldn't find any restaurants matching your filters.</p>
          <Button 
            variant="outline" 
            className="mt-6 font-mono" 
            onClick={() => { setSearch(""); setArea("all"); }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
