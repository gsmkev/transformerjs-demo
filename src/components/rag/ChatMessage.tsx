import type { ChatMessage as ChatMsg } from '@/hooks/useRag'

interface Props {
  message: ChatMsg
  streaming?: boolean
}

export default function ChatMessage({ message, streaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        aria-hidden="true"
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
          isUser ? 'bg-accent text-white' : 'bg-surface2 text-dim'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Bubble + sources */}
      <div className={`flex-1 min-w-0 flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
            isUser
              ? 'bg-accent/20 border border-accent/30 text-ink'
              : 'bg-surface border border-rim text-ink'
          } ${streaming && !isUser ? 'after:inline-block after:w-0.5 after:h-4 after:bg-accent after:ml-0.5 after:align-middle after:animate-badge-pulse' : ''}`}
        >
          <p className="whitespace-pre-wrap">{message.content || (streaming ? '' : '…')}</p>
        </div>

        {/* Source chips */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 max-w-[85%]">
            {message.sources.map((s, i) => (
              <span
                key={s.id}
                title={s.title}
                className="text-xs bg-surface2 text-dim px-2 py-0.5 rounded-full truncate max-w-[180px]"
              >
                [{i + 1}] {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
