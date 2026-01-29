import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendAgentMessage, getModelName } from './ollama'
import { parseAgentResponse } from './actions'
import { runActions } from './runner'
import { clearAllOverlays } from './overlay'
import { VirtualPointer } from './pointer'
import { OverlayManager } from './overlay'
import './CompanionAgent.css'

// Collect all agent IDs from the page
function getAvailableAgentIds() {
  const elements = document.querySelectorAll('[data-agent-id]')
  return Array.from(elements).map(el => el.getAttribute('data-agent-id'))
}

export default function CompanionAgent() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addLog = (message, type = 'info') => {
    console.log(`[Agent ${type}]: ${message}`)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)
    clearAllOverlays()

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const availableIds = getAvailableAgentIds()
      addLog(`Available IDs: ${availableIds.join(', ')}`, 'info')
      
      const rawResponse = await sendAgentMessage(userMessage, availableIds)
      addLog(`Raw response: ${rawResponse.substring(0, 200)}...`, 'info')
      
      const result = parseAgentResponse(rawResponse)

      if (!result.valid) {
        setError(result.error)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an issue. Please try again.',
          error: true 
        }])
        return
      }

      // Add assistant message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.response.say,
        actions: result.response.actions
      }])

      // Execute actions
      await runActions(result.response.actions, addLog, navigate)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Connection error. Please check your network connection.',
        error: true 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <VirtualPointer />
      <OverlayManager />
      
      <div className={`companion-agent ${isOpen ? 'open' : 'closed'}`}>
        {/* Toggle Button */}
        <button 
          className="agent-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Close Assistant' : 'Open Assistant'}
        >
          {isOpen ? (
            <span className="close-icon">✕</span>
          ) : (
            <img src="/Cap.png" alt="Cap" className="agent-avatar" />
          )}
        </button>

        {isOpen && (
          <div className="agent-panel">
            <div className="agent-header">
              <img src="/Cap.png" alt="Cap" className="header-avatar" />
              <div className="header-info">
                <span className="agent-title">Cap Assistant</span>
                <span className="agent-model">{getModelName()}</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="agent-messages">
              {messages.length === 0 && (
                <div className="welcome-message">
                  <p>👋 Hi! I'm Cap, your learning companion.</p>
                  <p>I can help you:</p>
                  <ul>
                    <li>Navigate to different pages</li>
                    <li>Click buttons or links</li>
                    <li>Fill out forms</li>
                    <li>Answer questions</li>
                  </ul>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                  {msg.role === 'assistant' && (
                    <img src="/Cap.png" alt="Cap" className="message-avatar" />
                  )}
                  <div className="message-content">
                    {msg.content}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="action-badges">
                        {msg.actions.map((action, j) => (
                          <span key={j} className="action-badge">
                            {action.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="message assistant loading">
                  <img src="/Cap.png" alt="Cap" className="message-avatar" />
                  <div className="message-content">
                    <span className="loading-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="agent-input-area">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command, e.g.: Take me to the games page"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="send-btn"
              >
                Send
              </button>
            </div>

            {error && (
              <div className="agent-error">
                <small>{error}</small>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
