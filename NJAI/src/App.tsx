import { useState, useCallback } from 'react'
import { CompanionAgent } from './agent/CompanionAgent'
import { VirtualPointer } from './agent/pointer'
import { OverlayManager } from './agent/overlay'
import './App.css'

export interface LogEntry {
  id: number
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error'
}

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [nameValue, setNameValue] = useState('')
  const [levelValue, setLevelValue] = useState('easy')

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp,
      message,
      type
    }])
  }, [])

  const handleStart = () => {
    addLog(`Start clicked! Name: "${nameValue}", Level: "${levelValue}"`, 'success')
  }

  const handleReset = () => {
    setNameValue('')
    setLevelValue('easy')
    addLog('Reset clicked! Form cleared.', 'info')
  }

  return (
    <div className="app">
      {/* Virtual Pointer */}
      <VirtualPointer />
      
      {/* Overlay Manager for highlight/label */}
      <OverlayManager />

      {/* Main Content */}
      <div className="main-content">
        <h1>🤖 Peer Agent Demo</h1>
        <p className="subtitle">Use the Agent panel (bottom-right) to control the page with natural language!</p>

        {/* Interactive Controls */}
        <div className="controls-section">
          <h2>Interactive Controls</h2>
          <div className="controls-grid">
            <div className="control-item">
              <label>Name:</label>
              <input
                type="text"
                data-agent-id="input_name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Enter your name..."
              />
            </div>
            
            <div className="control-item">
              <label>Level:</label>
              <select
                data-agent-id="select_level"
                value={levelValue}
                onChange={(e) => setLevelValue(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="control-item buttons">
              <button
                data-agent-id="btn_start"
                className="btn btn-primary"
                onClick={handleStart}
              >
                ▶ Start
              </button>
              <button
                data-agent-id="btn_reset"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </div>

        {/* Log Area */}
        <div className="log-section">
          <h2>📋 Action Log</h2>
          <div className="log-container">
            {logs.length === 0 ? (
              <div className="log-empty">No actions yet. Try using the Agent!</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Companion Agent Panel */}
      <CompanionAgent addLog={addLog} />
    </div>
  )
}

export default App
