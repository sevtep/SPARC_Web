// Action Runner - executes agent actions
import { movePointerTo, hidePointer, showPointer } from './pointer'
import { addHighlight, addLabel, clearAllOverlays } from './overlay'

// Callback for opening competition - will be set by App.js
let openCompetitionCallback = null

export function setOpenCompetitionCallback(callback) {
  openCompetitionCallback = callback
}

function getElementByAgentId(agentId) {
  return document.querySelector(`[data-agent-id="${agentId}"]`)
}

function getElementCenter(el) {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function executeClick(el, log) {
  // Scroll element into view first
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await wait(200)
  
  // Focus the element
  el.focus()
  
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // Create and dispatch mouse events
  const mouseenter = new MouseEvent('mouseenter', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    view: window
  })
  
  const mouseover = new MouseEvent('mouseover', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    view: window
  })

  const mousedown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    view: window,
    button: 0
  })
  
  const mouseup = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    view: window,
    button: 0
  })

  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    view: window,
    button: 0
  })

  el.dispatchEvent(mouseenter)
  el.dispatchEvent(mouseover)
  el.dispatchEvent(mousedown)
  await wait(50)
  el.dispatchEvent(mouseup)
  el.dispatchEvent(click)
  
  // Also call native click as fallback
  el.click()
  
  log(`Clicked element`, 'success')
}

async function executeType(el, text, log) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    throw new Error('Target is not an input/textarea element')
  }

  el.focus()
  
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set
  
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set

  const tracker = el._valueTracker
  if (tracker) {
    tracker.setValue(el.value)
  }

  if (el instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(el, text)
  } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(el, text)
  } else {
    el.value = text
  }

  const inputEvent = new Event('input', { bubbles: true, cancelable: true })
  el.dispatchEvent(inputEvent)

  const nativeInputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  })
  el.dispatchEvent(nativeInputEvent)

  const changeEvent = new Event('change', { bubbles: true, cancelable: true })
  el.dispatchEvent(changeEvent)

  log(`Typed: "${text}"`, 'success')
}

async function executeSelect(el, value, log) {
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error('Target is not a select element')
  }

  el.focus()
  el.value = value

  const changeEvent = new Event('change', { bubbles: true, cancelable: true })
  el.dispatchEvent(changeEvent)

  log(`Selected: "${value}"`, 'success')
}

export async function runActions(actions, log, navigate) {
  showPointer()
  
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'wait':
          log(`Waiting ${action.ms}ms...`, 'info')
          await wait(action.ms)
          break

        case 'navigate':
          log(`Navigating to ${action.path}...`, 'info')
          if (navigate) {
            navigate(action.path)
          }
          await wait(300)
          break

        case 'highlight': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          addHighlight(el)
          log(`Highlighted: ${action.target.agentId}`, 'info')
          await wait(200)
          break
        }

        case 'moveTo': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          log(`Moved to: ${action.target.agentId}`, 'info')
          break
        }

        case 'click': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y, 300)
          await wait(100)
          await executeClick(el, log)
          break
        }

        case 'type': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y, 300)
          await wait(100)
          await executeType(el, action.text, log)
          break
        }

        case 'select': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y, 300)
          await wait(100)
          await executeSelect(el, action.value, log)
          break
        }

        case 'label': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            log(`Element not found: ${action.target.agentId}`, 'error')
            continue
          }
          addLabel(el, action.text)
          log(`Added label: "${action.text}"`, 'info')
          await wait(200)
          break
        }

        case 'startCompetition': {
          log(`Starting Quiz Competition!`, 'success')
          if (openCompetitionCallback) {
            openCompetitionCallback()
          } else {
            log(`Competition callback not set`, 'error')
          }
          await wait(500)
          break
        }

        default:
          log(`Unknown action type: ${action.type}`, 'error')
      }
    } catch (err) {
      log(`Action error: ${err.message}`, 'error')
    }
  }

  // Hide pointer after all actions
  await wait(500)
  hidePointer()
  
  // Clear overlays after a delay
  setTimeout(() => {
    clearAllOverlays()
  }, 3000)
}
