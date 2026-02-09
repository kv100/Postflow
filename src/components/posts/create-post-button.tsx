'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CreatePostModal } from './create-post-modal'

export function CreatePostButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
      >
        <Plus className="w-5 h-5" />
        New Post
      </button>

      <CreatePostModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
