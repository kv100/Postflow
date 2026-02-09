import { PostsList } from '@/components/posts/posts-list'
import { CreatePostButton } from '@/components/posts/create-post-button'

export default function PostsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Posts
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your Threads posts
          </p>
        </div>
        <CreatePostButton />
      </div>

      <PostsList />
    </div>
  )
}
