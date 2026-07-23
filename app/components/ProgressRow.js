'use client'
import { useState } from 'react'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
export default function ProgressRow({ log, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const hasCode = !!log.code_snippet
  return (
    <div className="group">
      <div className="flex items-center gap-3 px-4 py-2 opacity-60">
        <span className="text-gray-600 text-xs shrink-0">&bull;</span>
        <span className="text-xs uppercase tracking-widest text-gray-500 shrink-0">progress</span>
        <span className="text-sm text-gray-400 truncate flex-1">{log.content}</span>
        <button onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-2 py-0.5 transition-colors shrink-0"
        >
          {expanded ? 'hide' : 'view'}
        </button>
        <span className="text-xs text-gray-600 shrink-0">
          {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {onDelete && (
          <button onClick={() => onDelete(log.id)} title="Delete entry"
            className="text-gray-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
      {expanded && (
        <div className="mb-2 ml-8 mr-4">
          <p className="text-sm text-gray-400 leading-relaxed mb-2">{log.content}</p>
          {hasCode && (
            <div className="rounded-lg overflow-hidden border border-gray-800">
              <div className="px-3 py-1.5 bg-gray-900 border-b border-gray-800">
                <span className="text-xs text-gray-500 font-mono">{log.code_language || 'code'}</span>
              </div>
              <SyntaxHighlighter language={log.code_language || 'javascript'} style={atomOneDark}
                customStyle={{ margin: 0, padding: '12px', fontSize: '12px', background: '#0d0d0d', maxHeight: '300px', overflowY: 'auto' }}
              >
                {log.code_snippet}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
