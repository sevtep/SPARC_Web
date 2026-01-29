import { useState, useRef, useEffect } from 'react'
import { sendAgentMessage, getModelName } from '../lib/ollama'
import { parseAgentResponse, AgentResponse } from './actions'
import { runActions, LogFn } from './runner'
import { clearAllOverlays } from './overlay'
import './CompanionAgent.css'

interface CompanionAgentProps {
  addLog: LogFn
}

// List of all agent IDs available on the page
const AVAILABLE_AGENT_IDS = ['btn_start', 'btn_reset', 'input_name', 'select_level']

export function CompanionAgent({ addLog }: CompanionAgentProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawError, setRawError] = useState<string | null>(null)
  const [rawOutput, setRawOutput] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)
    setRawError(null)
    setRawOutput(null)
    setLastResponse(null)
    clearAllOverlays()

    addLog(`Agent received: "${userMessage}"`, 'info')

    try {
      addLog(`Calling Ollama (${getModelName()})...`, 'info')
      const rawResponse = await sendAgentMessage(userMessage, AVAILABLE_AGENT_IDS)
      
      // 保存原始输出用于调试
      setRawOutput(rawResponse)
      addLog(`Raw model output: ${rawResponse.substring(0, 200)}...`, 'info')
      addLog('Parsing response...', 'info')
      const result = parseAgentResponse(rawResponse)

      if (!result.valid) {
        setError(result.error)
        setRawError(result.raw)
        addLog(`Parse error: ${result.error}`, 'error')
        return
      }

      setLastResponse(result.response)
      addLog(`Agent says: "${result.response.say}"`, 'success')
      addLog(`Executing ${result.response.actions.length} actions...`, 'info')

      await runActions(result.response.actions, addLog)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addLog(`Error: ${errorMessage}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`companion-agent ${isOpen ? 'open' : 'closed'}`}>
      {/* Toggle Button */}
      <button 
        className="agent-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Minimize Agent' : 'Open Agent'}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div className="agent-panel">
          <div className="agent-header">
            <span className="agent-icon">🤖</span>
            <span className="agent-title">Peer Agent</span>
            <span className="agent-model">{getModelName()}</span>
          </div>

          {/* Response Area */}
          <div className="agent-response">
            {isLoading && (
              <div className="agent-loading">
                <span className="loading-spinner"></span>
                Thinking...
              </div>
            )}

            {error && (
              <div className="agent-error">
                <strong>❌ Error:</strong> {error}
                {rawError && (
                  <details className="raw-output">
                    <summary>Raw Output</summary>
                    <pre>{rawError}</pre>
                  </details>
                )}
              </div>
            )}

            {lastResponse && !isLoading && (
              <div className="agent-result">
                <div className="agent-say">
                  💬 {lastResponse.say}
                </div>
                {rawOutput && (
                  <details className="raw-output" style={{ marginBottom: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#888', fontSize: 12 }}>🔍 Raw Model Output</summary>
                    <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 8, borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{rawOutput}</pre>
                  </details>
                )}
                <button 
                  className="actions-toggle"
                  onClick={() => setShowActions(!showActions)}
                >
                  {showActions ? '▼' : '▶'} Actions ({lastResponse.actions.length})
                </button>
                {showActions && (
                  <div className="actions-list">
                    {lastResponse.actions.map((action, i) => (
                      <div key={i} className="action-item">
                        <span className="action-type">{action.type}</span>
                        {'target' in action && action.target && (
                          <span className="action-target">→ {action.target.agentId}</span>
                        )}
                        {'text' in action && (
                          <span className="action-value">"{action.text}"</span>
                        )}
                        {'value' in action && (
                          <span className="action-value">= {action.value}</span>
                        )}
                        {'ms' in action && (
                          <span className="action-value">{action.ms}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isLoading && !error && !lastResponse && (
              <div className="agent-empty">
                Type a command like:<br/>
                "Click Start" or "Set name to Jacob"
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="agent-input-area">
            <input
              ref={inputRef}
              type="text"
              className="agent-input"
              placeholder="Enter command..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="agent-send"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
