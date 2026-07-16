import { Link, useParams } from "wouter";
import { useGetBlogPost, getGetBlogPostQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FallbackImage } from "@/components/FallbackImage";

export default function BlogPostPage() {
  const params = useParams();
  const postId = Number(params.slug);
  const { data: post, isLoading, error } = useGetBlogPost(postId, {
    query: { enabled: !isNaN(postId), queryKey: getGetBlogPostQueryKey(postId) }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <Skeleton className="h-10 w-24 mb-12" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-12 w-3/4 mb-8" />
        <div className="flex gap-4 mb-12">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="w-full h-80 mb-12" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-6" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-40 max-w-3xl text-center">
        <h1 className="text-4xl font-serif font-bold mb-4">Post not found</h1>
        <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Button asChild variant="ghost" className="mb-10 -ml-4 text-muted-foreground hover:text-foreground">
        <Link href="/blog" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog</span>
        </Link>
      </Button>

      <div className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <Badge className="font-mono">{post.category}</Badge>
          <time className="text-sm text-muted-foreground font-mono">
            {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </time>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-6">{post.title}</h1>
        <p className="text-xl text-muted-foreground">{post.excerpt}</p>
      </div>

      <div className="mb-12 rounded-xl overflow-hidden bg-muted">
        <FallbackImage src={post.coverImage ?? undefined} alt={post.title} fallback="photo" className="w-full h-full object-cover max-h-[500px]" loading="lazy" decoding="async" />
      </div>

      {/* Since we don't have a real markdown parser here, we'll just render the content as paragraphs */}
      <div className="prose prose-lg prose-green max-w-none pb-20 border-b">
        {post.content.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
