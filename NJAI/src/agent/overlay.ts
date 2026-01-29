// Overlay Manager - handles highlight boxes and labels
import { useEffect } from 'react'

interface OverlayItem {
  id: string
  element: HTMLDivElement
}

let overlays: OverlayItem[] = []
let overlayContainer: HTMLDivElement | null = null

function ensureContainer(): HTMLDivElement {
  if (overlayContainer && document.body.contains(overlayContainer)) {
    return overlayContainer
  }

  overlayContainer = document.createElement('div')
  overlayContainer.id = 'overlay-container'
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999998;
  `
  document.body.appendChild(overlayContainer)
  return overlayContainer
}

export function addHighlight(targetEl: HTMLElement): string {
  const container = ensureContainer()
  const rect = targetEl.getBoundingClientRect()
  const id = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const highlight = document.createElement('div')
  highlight.id = id
  highlight.style.cssText = `
    position: fixed;
    left: ${rect.left - 4}px;
    top: ${rect.top - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 3px solid #ff6b35;
    border-radius: 8px;
    background: rgba(255, 107, 53, 0.15);
    box-shadow: 0 0 12px rgba(255, 107, 53, 0.5);
    pointer-events: none;
    animation: pulse-highlight 1s ease-in-out infinite;
  `

  // Add animation keyframes if not exists
  if (!document.getElementById('overlay-styles')) {
    const style = document.createElement('style')
    style.id = 'overlay-styles'
    style.textContent = `
      @keyframes pulse-highlight {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.02); }
      }
    `
    document.head.appendChild(style)
  }

  container.appendChild(highlight)
  overlays.push({ id, element: highlight })

  return id
}

export function addLabel(targetEl: HTMLElement, text: string): string {
  const container = ensureContainer()
  const rect = targetEl.getBoundingClientRect()
  const id = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const label = document.createElement('div')
  label.id = id
  label.textContent = text
  label.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top - 32}px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    animation: fade-in 0.3s ease-out;
  `

  // Add animation keyframes if not exists
  if (!document.getElementById('label-styles')) {
    const style = document.createElement('style')
    style.id = 'label-styles'
    style.textContent = `
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
    document.head.appendChild(style)
  }

  // Add arrow pointing down
  const arrow = document.createElement('div')
  arrow.style.cssText = `
    position: absolute;
    bottom: -6px;
    left: 12px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid #764ba2;
  `
  label.appendChild(arrow)

  container.appendChild(label)
  overlays.push({ id, element: label })

  return id
}

export function removeOverlay(id: string): void {
  const index = overlays.findIndex(o => o.id === id)
  if (index !== -1) {
    const overlay = overlays[index]
    overlay.element.remove()
    overlays.splice(index, 1)
  }
}

export function clearAllOverlays(): void {
  overlays.forEach(o => o.element.remove())
  overlays = []
}

// React component
export function OverlayManager() {
  useEffect(() => {
    // Ensure container is created on mount
    ensureContainer()
    
    // Cleanup on unmount
    return () => {
      clearAllOverlays()
      if (overlayContainer) {
        overlayContainer.remove()
        overlayContainer = null
      }
    }
  }, [])
  
  return null
}
