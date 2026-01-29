import { Action, SetStyleAction } from './actions'
import { movePointerTo, hidePointer, showPointer } from './pointer'
import { addHighlight, addLabel, clearAllOverlays } from './overlay'

export type LogFn = (message: string, type: 'info' | 'success' | 'error') => void

function getElementByAgentId(agentId: string): HTMLElement | null {
  return document.querySelector(`[data-agent-id="${agentId}"]`)
}

function getElementCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function executeClick(el: HTMLElement, log: LogFn): Promise<void> {
  // Primary click
  el.click()
  
  // Also dispatch mouse events for completeness
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const mousedown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY
  })
  
  const mouseup = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY
  })

  el.dispatchEvent(mousedown)
  el.dispatchEvent(mouseup)
  
  log(`Clicked element`, 'success')
}

async function executeType(el: HTMLElement, text: string, log: LogFn): Promise<void> {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    throw new Error('Target is not an input/textarea element')
  }

  el.focus()
  
  // For React controlled components, we need to use the native setter
  // to properly trigger React's onChange handler
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set
  
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set

  // React 18+ uses _valueTracker to track input value changes
  // We need to reset it so React detects the change
  const tracker = (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker
  if (tracker) {
    tracker.setValue(el.value) // Set to current value, so React sees the difference
  }

  if (el instanceof HTMLInputElement && nativeInputValueSetter) {
    nativeInputValueSetter.call(el, text)
  } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(el, text)
  } else {
    el.value = text
  }

  // Dispatch input event (React listens to this)
  const inputEvent = new Event('input', { bubbles: true, cancelable: true })
  el.dispatchEvent(inputEvent)

  // Also dispatch a native InputEvent for better compatibility
  const nativeInputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  })
  el.dispatchEvent(nativeInputEvent)

  // Dispatch change event
  const changeEvent = new Event('change', { bubbles: true, cancelable: true })
  el.dispatchEvent(changeEvent)

  log(`Typed "${text}"`, 'success')
}

async function executeSelect(el: HTMLElement, value: string, log: LogFn): Promise<void> {
  if (!(el instanceof HTMLSelectElement)) {
    throw new Error('Target is not a select element')
  }

  el.focus()
  
  // For React controlled components, use the native setter
  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype, 'value'
  )?.set

  if (nativeSelectValueSetter) {
    nativeSelectValueSetter.call(el, value)
  } else {
    el.value = value
  }

  // Dispatch change event (React listens to this for select)
  const changeEvent = new Event('change', { bubbles: true, cancelable: true })
  el.dispatchEvent(changeEvent)

  // Also dispatch input event for completeness
  const inputEvent = new Event('input', { bubbles: true, cancelable: true })
  el.dispatchEvent(inputEvent)

  log(`Selected "${value}"`, 'success')
}

export async function runActions(actions: Action[], log: LogFn): Promise<void> {
  // Clear any previous overlays
  clearAllOverlays()
  showPointer()

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const actionIndex = i + 1

    try {
      switch (action.type) {
        case 'wait': {
          log(`[${actionIndex}] Waiting ${action.ms}ms...`, 'info')
          await wait(action.ms)
          break
        }

        case 'highlight': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          addHighlight(el)
          log(`[${actionIndex}] Highlighted "${action.target.agentId}"`, 'success')
          await wait(200)
          break
        }

        case 'moveTo': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          const center = getElementCenter(el)
          log(`[${actionIndex}] Moving to "${action.target.agentId}"...`, 'info')
          await movePointerTo(center.x, center.y)
          break
        }

        case 'click': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          // Move to element first
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(150)
          log(`[${actionIndex}] Clicking "${action.target.agentId}"...`, 'info')
          await executeClick(el, log)
          await wait(200)
          break
        }

        case 'type': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          // Move to element first
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(150)
          log(`[${actionIndex}] Typing into "${action.target.agentId}"...`, 'info')
          await executeType(el, action.text, log)
          await wait(200)
          break
        }

        case 'select': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          // Move to element first
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(150)
          log(`[${actionIndex}] Selecting "${action.value}" in "${action.target.agentId}"...`, 'info')
          await executeSelect(el, action.value, log)
          await wait(200)
          break
        }

        case 'label': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          addLabel(el, action.text)
          log(`[${actionIndex}] Added label "${action.text}" to "${action.target.agentId}"`, 'success')
          await wait(200)
          break
        }

        case 'setStyle': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          // Move to element first for visual feedback
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(100)
          
          // Apply styles - cast to SetStyleAction to access styles property
          const styleAction = action as SetStyleAction
          const styleEntries = Object.entries(styleAction.styles)
          for (const [prop, value] of styleEntries) {
            // Convert camelCase to kebab-case for setProperty
            const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
            // Use !important to override existing styles
            el.style.setProperty(cssProp, value, 'important')
            
            // 特殊处理：backgroundColor 也要设置 background（覆盖渐变）
            if (prop === 'backgroundColor' || cssProp === 'background-color') {
              el.style.setProperty('background', value, 'important')
            }
          }
          
          const styleDesc = styleEntries.map(([k, v]) => `${k}: ${v}`).join(', ')
          log(`[${actionIndex}] Set style on "${action.target.agentId}": ${styleDesc}`, 'success')
          await wait(200)
          break
        }

        case 'setText': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(100)
          
          // 修改元素文本内容
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            // 对于输入框，设置 value
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(el, action.text)
            } else {
              el.value = action.text
            }
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          } else {
            // 对于其他元素，修改 textContent
            el.textContent = action.text
          }
          log(`[${actionIndex}] Set text on "${action.target.agentId}" to "${action.text}"`, 'success')
          await wait(200)
          break
        }

        case 'hide': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          await wait(100)
          
          el.style.setProperty('display', 'none', 'important')
          log(`[${actionIndex}] Hidden "${action.target.agentId}"`, 'success')
          await wait(200)
          break
        }

        case 'show': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          
          el.style.removeProperty('display')
          // 如果还是隐藏的，强制显示
          if (getComputedStyle(el).display === 'none') {
            el.style.setProperty('display', 'block', 'important')
          }
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          log(`[${actionIndex}] Shown "${action.target.agentId}"`, 'success')
          await wait(200)
          break
        }

        case 'scrollTo': {
          const el = getElementByAgentId(action.target.agentId)
          if (!el) {
            throw new Error(`Element not found: ${action.target.agentId}`)
          }
          
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await wait(500) // 等待滚动完成
          const center = getElementCenter(el)
          await movePointerTo(center.x, center.y)
          log(`[${actionIndex}] Scrolled to "${action.target.agentId}"`, 'success')
          await wait(200)
          break
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log(`[${actionIndex}] ERROR: ${action.type} failed - ${errorMsg}`, 'error')
      hidePointer()
      throw error // Stop execution on error
    }
  }

  hidePointer()
  log('✅ All actions completed!', 'success')
}
