import { Router } from "express";
import { db } from "@workspace/db";
import { blogPostsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /blog/posts
router.get("/blog/posts", async (_req, res) => {
  const posts = await db.select().from(blogPostsTable).orderBy(blogPostsTable.publishedAt);
  res.json(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      author: p.author,
      publishedAt: p.publishedAt.toISOString(),
      coverImage: p.coverImage,
      category: p.category ?? null,
    }))
  );
});

// GET /blog/posts/:postId
router.get("/blog/posts/:postId", async (req, res) => {
  const id = Number(req.params.postId);
  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    author: post.author,
    publishedAt: post.publishedAt.toISOString(),
    coverImage: post.coverImage,
    category: post.category ?? null,
  });
});

export default router;
