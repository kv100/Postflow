'use client'

import { useState } from 'react'
import { X, ImageIcon, Film } from 'lucide-react'
import { createPost } from '@/lib/api/posts'
import type { Platform, MediaType } from '@/lib/types/database'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

const platformOptions: { value: Platform; label: string; icon: string }[] = [
  { value: 'threads', label: 'Threads', icon: '@' },
  { value: 'instagram', label: 'Instagram', icon: 'IG' },
]

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [platform, setPlatform] = useState<Platform>('threads')
  const [mediaType, setMediaType] = useState<MediaType>('text')
  const [mediaUrl, setMediaUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const maxLength = platform === 'instagram' ? 2200 : 500
  const needsMedia = platform === 'instagram' && mediaType !== 'text'

  async function handleSave(asDraft: boolean) {
    if (!content.trim()) return
    if (needsMedia && !mediaUrl.trim()) {
      setError('Instagram image/video posts require a media URL')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await createPost({
        content: content.trim(),
        media_urls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
        status: asDraft ? 'draft' : 'scheduled',
        scheduled_at: asDraft ? null : scheduledAt || null,
        platform,
        media_type: mediaType,
      })
      setContent('')
      setScheduledAt('')
      setMediaUrl('')
      setMediaType('text')
      setPlatform('threads')
      onClose()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Create Post
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Platform selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              {platformOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPlatform(opt.value)
                    if (opt.value === 'threads') {
                      setMediaType('text')
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                    ${platform === opt.value
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  <span className="text-xs font-bold">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media type (Instagram only) */}
          {platform === 'instagram' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Media Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMediaType('image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    mediaType === 'image'
                      ? 'bg-purple-500 text-white border-transparent'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Image
                </button>
                <button
                  onClick={() => setMediaType('reels')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    mediaType === 'reels'
                      ? 'bg-purple-500 text-white border-transparent'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  Reels
                </button>
              </div>
            </div>
          )}

          {/* Media URL */}
          {(mediaType !== 'text') && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Media URL {needsMedia && <span className="text-red-500">*</span>}
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={mediaType === 'reels' ? 'https://... (video URL)' : 'https://... (image URL)'}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {mediaType === 'reels' ? 'Public URL to MP4 video' : 'Public URL to JPEG/PNG image'}
              </p>
            </div>
          )}

          {/* Threads with image */}
          {platform === 'threads' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://... (image URL)"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              maxLength={maxLength}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-zinc-500">
              {content.length}/{maxLength} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !content.trim()}
            className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {scheduledAt ? 'Schedule' : 'Save & Schedule Later'}
          </button>
        </div>
      </div>
    </div>
  )
}
