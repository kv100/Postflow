import { RepliesList } from '@/components/replies/replies-list'

export default function RepliesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Reply Queue
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Review and send AI-generated replies to mentions
      </p>

      <RepliesList />
    </div>
  )
}
