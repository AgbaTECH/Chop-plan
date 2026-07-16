import { Link } from "wouter";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BlogPage() {
  const { data: posts, isLoading } = useListBlogPosts();

  return (
    <div className="container mx-auto px-4 py-20 max-w-6xl">
      <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Blog</h1>
      <p className="text-xl text-muted-foreground mb-12">Stories about food, business, and tech.</p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-none shadow-sm">
              <Skeleton className="w-full h-48 rounded-none" />
              <CardHeader>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card className="h-full overflow-hidden border border-border hover-elevate transition-all cursor-pointer flex flex-col group">
                {post.coverImage && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-center mb-3">
                    <Badge variant="secondary" className="font-mono text-xs">{post.category}</Badge>
                    <time className="text-xs text-muted-foreground font-mono">
                      {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>
                  <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <h3 className="text-2xl font-serif mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Check back soon for updates.</p>
        </div>
      )}
    </div>
  );
}
