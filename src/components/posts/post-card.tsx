'use client'

import { useState } from 'react'
import type { Post } from '@/lib/types/database'
import { format } from 'date-fns'
import { Clock, CheckCircle, AlertCircle, FileEdit, Send, Trash2, Edit, MoreVertical, Rocket, ImageIcon, Film } from 'lucide-react'
import { EditPostModal } from './edit-post-modal'
import { publishToThreads } from '@/lib/api/threads'
import { updatePost } from '@/lib/api/posts'

interface PostCardProps {
  post: Post
  onDelete: () => void
  onUpdate: () => void
}

const statusConfig = {
  draft: { icon: FileEdit, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Draft' },
  scheduled: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: 'Scheduled' },
  publishing: { icon: Send, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950', label: 'Publishing' },
  published: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950', label: 'Published' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950', label: 'Failed' },
}

const platformConfig = {
  threads: { label: 'Threads', color: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' },
  instagram: { label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
}

export function PostCard({ post, onDelete, onUpdate }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const status = statusConfig[post.status]
  const StatusIcon = status.icon
  const platform = platformConfig[post.platform] || platformConfig.threads

  const canPublish = post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed'

  async function handlePublishNow() {
    const platformLabel = post.platform === 'instagram' ? 'Instagram' : 'Threads'
    if (!confirm(`Publish this post to ${platformLabel} now?`)) return

    setPublishing(true)
    setShowMenu(false)

    try {
      // Update status to publishing
      await updatePost(post.id, { status: 'publishing' })
      onUpdate()

      if (post.platform === 'instagram') {
        // For Instagram, trigger via cron endpoint with single post
        const res = await fetch(`/api/cron/publish?platform=instagram`, {
          method: 'GET',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to publish to Instagram')
        }
      } else {
        // Publish to Threads
        await publishToThreads(post.content, post.id)
      }
      onUpdate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to publish')
      onUpdate()
    } finally {
      setPublishing(false)
    }
  }

  const mediaTypeIcon = post.media_type === 'reels' || post.media_type === 'video'
    ? Film
    : post.media_type === 'image'
    ? ImageIcon
    : null
  const MediaTypeIcon = mediaTypeIcon

  return (
    <>
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors ${publishing ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Content Preview */}
            <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Media indicator */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mt-2 flex gap-1">
                {post.media_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-500">
                    {MediaTypeIcon && <MediaTypeIcon className="w-3 h-3" />}
                    <span className="truncate max-w-[120px]">{url.split('/').pop() || 'media'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="mt-3 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 flex-wrap">
              {/* Platform badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platform.color}`}>
                {platform.label}
              </span>

              {/* Media type badge */}
              {post.media_type && post.media_type !== 'text' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  {MediaTypeIcon && <MediaTypeIcon className="w-3 h-3" />}
                  {post.media_type}
                </span>
              )}

              <span>
                Created {format(new Date(post.created_at), 'MMM d, yyyy')}
              </span>
              {post.scheduled_at && (
                <span className="text-blue-500">
                  Scheduled for {format(new Date(post.scheduled_at), 'MMM d, h:mm a')}
                </span>
              )}
              {post.published_at && (
                <span className="text-green-500">
                  Published {format(new Date(post.published_at), 'MMM d, h:mm a')}
                </span>
              )}
            </div>

            {/* Error message */}
            {post.error_message && (
              <p className="mt-2 text-sm text-red-500">
                Error: {post.error_message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Publish Now Button */}
            {canPublish && (
              <button
                onClick={handlePublishNow}
                disabled={publishing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            )}

            {/* Status Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-zinc-500" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 min-w-[120px]">
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowEditModal(true)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    {post.status !== 'published' && (
                      <button
                        onClick={() => {
                          setShowMenu(false)
                          onDelete()
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditPostModal
        post={post}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={onUpdate}
      />
    </>
  )
}
