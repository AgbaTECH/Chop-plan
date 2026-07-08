import { useListBlogPosts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Blog() {
  const { data: posts, isLoading } = useListBlogPosts();

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-secondary mb-4">The Lunch Box</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Insights on Lagos food culture, restaurant highlights, and tips for taking back your workday.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts?.map((post) => (
            <Link 
              key={post.id} 
              href={`/blog/${post.id}`}
              className="group flex flex-col bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              data-testid={`card-blog-${post.id}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={post.coverImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                  alt={post.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                {post.category && (
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur text-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {post.category}
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <time dateTime={post.publishedAt}>
                    {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                  </time>
                </div>
                <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center text-sm font-bold text-primary mt-auto">
                  Read article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
          {(!posts || posts.length === 0) && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl text-muted-foreground">
              No blog posts published yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
