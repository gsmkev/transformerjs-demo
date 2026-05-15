import type { ChatMessage as ChatMsg } from '@/hooks/useRag'
import { renderMarkdown } from '@/lib/renderMarkdown'

interface Props { message: ChatMsg; streaming?: boolean }

export default function ChatMessage({ message, streaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      <div
        aria-hidden="true"
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 border ${
          isUser
            ? 'bg-gradient-to-br from-accent to-violet-500 text-white border-accent/40 shadow-accent-glow-sm'
            : 'bg-white/5 text-dim border-white/10'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`max-w-[88%] sm:max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? 'bg-gradient-to-br from-accent/25 to-violet-500/15 border border-accent/25 text-ink'
            : 'bg-white/4 border border-white/8 text-ink/90 backdrop-blur-sm'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">
              {message.content || (streaming ? '' : '…')}
            </p>
          ) : (
            <div className="space-y-1">
              {renderMarkdown(message.content || (streaming ? '' : '…'))}
              {streaming && (
                <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 align-middle animate-badge-pulse" aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-[88%] sm:max-w-[72%]">
            {message.sources.map((s, i) => (
              <span key={s.id} title={s.title} className="text-xs bg-white/5 border border-white/9 text-dim/80 px-2.5 py-0.5 rounded-full truncate max-w-[180px] font-mono">
                [{i + 1}] {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
