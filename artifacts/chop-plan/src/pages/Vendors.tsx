import { useState } from "react";
import { useListVendors, useListAreas } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, MapPin, Star, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "react-day-picker";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<string>("all");

  const { data: areas = [], isLoading: isLoadingAreas } = useListAreas();
  const { data: vendors, isLoading } = useListVendors({ 
    search: search || undefined, 
    area: area !== "all" ? area : undefined 
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-secondary mb-4">Browse Restaurants</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Find your new favorite lunch spot. Filter by location and subscribe to lock in your meals for the week or month.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search by restaurant name or cuisine..." 
            className="pl-10 h-12 rounded-xl text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-vendors"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={area} onValueChange={setArea} disabled={isLoadingAreas}>
            <SelectTrigger className="h-12 rounded-xl" data-testid="select-filter-area">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-4 border rounded-3xl p-4">
              <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : vendors && vendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vendors.map((vendor) => (
            <Link 
              key={vendor.id} 
              href={`/vendors/${vendor.id}`}
              className="group flex flex-col bg-card border rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              data-testid={`card-vendor-${vendor.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={vendor.coverImage || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1"} 
                  alt={vendor.businessName}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <Badge className="bg-background/90 text-foreground backdrop-blur border-none font-bold">
                    <Star className="w-3 h-3 text-primary mr-1 fill-primary" /> {vendor.rating.toFixed(1)}
                  </Badge>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold group-hover:text-primary transition-colors truncate">
                    {vendor.businessName}
                  </h2>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mb-4 font-medium">
                  <span className="truncate">{vendor.cuisineType}</span>
                  <span className="mx-2">•</span>
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  <span className="truncate">{vendor.area}</span>
                </div>
                
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                  {vendor.description || "A highly-rated local favorite offering prepaid meal plans."}
                </p>
                
                <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {vendor.subscriberCount} active subs
                    </span>
                    <span className="font-mono font-bold text-secondary">
                      From ₦{vendor.lowestPlanPrice.toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl flex flex-col items-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No restaurants found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Try adjusting your search terms or selecting a different area.
          </p>
          {(search || area !== "all") && (
            <Button variant="outline" className="mt-6 rounded-full" onClick={() => { setSearch(""); setArea("all"); }}>
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
