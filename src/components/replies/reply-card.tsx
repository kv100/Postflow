'use client'

import { useState } from 'react'
import type { Reply } from '@/lib/types/database'
import { format } from 'date-fns'
import {
  Clock,
  CheckCircle,
  Send,
  XCircle,
  Sparkles,
  MessageSquare,
  Edit,
  MoreVertical,
  Rocket,
  X,
} from 'lucide-react'
import { updateReply, sendReply } from '@/lib/api/replies'

interface ReplyCardProps {
  reply: Reply
  onUpdate: () => void
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950', label: 'Pending' },
  auto_sent: { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950', label: 'Auto-sent' },
  approved: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', label: 'Approved' },
  sent: { icon: Send, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950', label: 'Sent' },
  skipped: { icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Skipped' },
}

export function ReplyCard({ reply, onUpdate }: ReplyCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(reply.final_reply || reply.suggested_reply || '')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)

  const status = statusConfig[reply.status]
  const StatusIcon = status.icon

  const canSend = reply.status === 'pending' || reply.status === 'approved'
  const canEdit = reply.status === 'pending'
  const canSkip = reply.status === 'pending'

  const confidencePercent = reply.confidence_score ? Math.round(reply.confidence_score * 100) : null
  const confidenceColor = reply.confidence_score
    ? reply.confidence_score >= 0.85
      ? 'text-green-500'
      : reply.confidence_score >= 0.6
        ? 'text-yellow-500'
        : 'text-red-500'
    : 'text-zinc-400'

  async function handleSend() {
    if (!confirm('Send this reply to Threads?')) return

    setSending(true)
    setShowMenu(false)

    try {
      // If edited, save the final reply first
      if (editText !== (reply.suggested_reply || '')) {
        await updateReply(reply.id, { final_reply: editText })
      }

      await sendReply(reply.id)
      onUpdate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to send')
      onUpdate()
    } finally {
      setSending(false)
    }
  }

  async function handleSkip() {
    if (!confirm('Skip this mention?')) return

    try {
      await updateReply(reply.id, { status: 'skipped' })
      onUpdate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to skip')
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await updateReply(reply.id, { final_reply: editText })
      setEditing(false)
      onUpdate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${sending ? 'opacity-70' : ''}`}>
      {/* Mention section */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {reply.mention_author?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                @{reply.mention_author || 'unknown'}
              </span>
              <span className="text-zinc-400 text-sm">
                {format(new Date(reply.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300 text-sm">
              {reply.mention_content || 'No content'}
            </p>
          </div>
        </div>
      </div>

      {/* Reply section */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                You
              </span>
              {confidencePercent !== null && (
                <span className={`text-xs ${confidenceColor}`}>
                  {confidencePercent}% confidence
                </span>
              )}
              <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${status.bg}`}>
                <StatusIcon className={`w-3 h-3 ${status.color}`} />
                <span className={status.color}>{status.label}</span>
              </div>
            </div>

            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  maxLength={280}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    {editText.length}/280
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditText(reply.final_reply || reply.suggested_reply || '')
                        setEditing(false)
                      }}
                      className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-zinc-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">
                {reply.final_reply || reply.suggested_reply || 'No reply generated yet'}
              </p>
            )}

            {/* Sent info */}
            {reply.sent_at && (
              <p className="mt-2 text-xs text-green-500">
                Sent {format(new Date(reply.sent_at), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {canSend && !editing && (
          <div className="mt-4 flex items-center justify-end gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            {canSkip && (
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Skip
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
