import { useGetBlogPost } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Clock, User } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:id");
  const postId = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: post, isLoading } = useGetBlogPost(postId, {
    query: { enabled: !!postId }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Skeleton className="h-8 w-24 mb-8" />
        <Skeleton className="w-full aspect-[21/9] rounded-2xl mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4 mb-8" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button asChild variant="outline">
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="pb-24">
      {/* Header */}
      <header className="container mx-auto px-4 pt-12 pb-8 max-w-3xl">
        <Link href="/blog" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to all posts
        </Link>
        
        {post.category && (
          <div className="text-primary font-bold text-sm tracking-wider uppercase mb-4">
            {post.category}
          </div>
        )}
        
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-secondary mb-6 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-mono pb-8 border-b">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{post.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <time dateTime={post.publishedAt}>
              {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
            </time>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      <div className="container mx-auto px-4 max-w-5xl mb-12">
        <div className="w-full aspect-[21/9] md:aspect-[2.5/1] rounded-3xl overflow-hidden bg-muted">
          <img 
            src={post.coverImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="prose prose-lg dark:prose-invert prose-headings:font-serif prose-headings:text-secondary prose-a:text-primary max-w-none">
          {/* We're simulating HTML rendering. In a real app we might use a markdown renderer or dangerouslySetInnerHTML if it's safe HTML */}
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
        
        <div className="mt-16 pt-8 border-t flex justify-center">
          <Button size="lg" asChild className="rounded-full">
            <Link href="/vendors">Browse Restaurants</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
