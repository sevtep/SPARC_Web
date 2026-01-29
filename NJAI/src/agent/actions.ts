// Action type definitions and validation

export type ActionType = 'highlight' | 'moveTo' | 'click' | 'type' | 'select' | 'label' | 'wait' | 'setStyle' | 'setText' | 'hide' | 'show' | 'scrollTo'

export interface ActionTarget {
  agentId: string
}

export interface BaseAction {
  type: ActionType
  target?: ActionTarget
}

export interface HighlightAction extends BaseAction {
  type: 'highlight'
  target: ActionTarget
}

export interface MoveToAction extends BaseAction {
  type: 'moveTo'
  target: ActionTarget
}

export interface ClickAction extends BaseAction {
  type: 'click'
  target: ActionTarget
}

export interface TypeAction extends BaseAction {
  type: 'type'
  target: ActionTarget
  text: string
}

export interface SelectAction extends BaseAction {
  type: 'select'
  target: ActionTarget
  value: string
}

export interface LabelAction extends BaseAction {
  type: 'label'
  target: ActionTarget
  text: string
}

export interface WaitAction extends BaseAction {
  type: 'wait'
  ms: number
}

export interface SetStyleAction extends BaseAction {
  type: 'setStyle'
  target: ActionTarget
  styles: Record<string, string>  // e.g. { "backgroundColor": "red", "fontSize": "20px" }
}

export interface SetTextAction extends BaseAction {
  type: 'setText'
  target: ActionTarget
  text: string  // 新的文本内容
}

export interface HideAction extends BaseAction {
  type: 'hide'
  target: ActionTarget
}

export interface ShowAction extends BaseAction {
  type: 'show'
  target: ActionTarget
}

export interface ScrollToAction extends BaseAction {
  type: 'scrollTo'
  target: ActionTarget
}

export type Action = HighlightAction | MoveToAction | ClickAction | TypeAction | SelectAction | LabelAction | WaitAction | SetStyleAction | SetTextAction | HideAction | ShowAction | ScrollToAction

export interface AgentResponse {
  say: string
  actions: Action[]
}

const VALID_ACTION_TYPES: ActionType[] = ['highlight', 'moveTo', 'click', 'type', 'select', 'label', 'wait', 'setStyle', 'setText', 'hide', 'show', 'scrollTo']

export function validateAgentResponse(data: unknown): { valid: true; response: AgentResponse } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not an object' }
  }

  const obj = data as Record<string, unknown>

  if (typeof obj.say !== 'string') {
    return { valid: false, error: 'Missing or invalid "say" field (must be string)' }
  }

  if (!Array.isArray(obj.actions)) {
    return { valid: false, error: 'Missing or invalid "actions" field (must be array)' }
  }

  for (let i = 0; i < obj.actions.length; i++) {
    const action = obj.actions[i]
    const prefix = `Action[${i}]`

    if (!action || typeof action !== 'object') {
      return { valid: false, error: `${prefix}: not an object` }
    }

    const act = action as Record<string, unknown>

    if (!act.type || typeof act.type !== 'string') {
      return { valid: false, error: `${prefix}: missing or invalid "type"` }
    }

    if (!VALID_ACTION_TYPES.includes(act.type as ActionType)) {
      return { valid: false, error: `${prefix}: unknown type "${act.type}"` }
    }

    // Validate based on action type
    switch (act.type) {
      case 'wait':
        if (typeof act.ms !== 'number' || act.ms < 0) {
          return { valid: false, error: `${prefix}: "wait" requires positive "ms" number` }
        }
        break

      case 'highlight':
      case 'moveTo':
      case 'click':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        break

      case 'type':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        if (typeof act.text !== 'string') {
          return { valid: false, error: `${prefix}: "type" action requires "text" string` }
        }
        break

      case 'select':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        if (typeof act.value !== 'string') {
          return { valid: false, error: `${prefix}: "select" action requires "value" string` }
        }
        break

      case 'label':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        if (typeof act.text !== 'string') {
          return { valid: false, error: `${prefix}: "label" action requires "text" string` }
        }
        break

      case 'setStyle':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        if (!act.styles || typeof act.styles !== 'object') {
          return { valid: false, error: `${prefix}: "setStyle" action requires "styles" object` }
        }
        break

      case 'setText':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        if (typeof act.text !== 'string') {
          return { valid: false, error: `${prefix}: "setText" action requires "text" string` }
        }
        break

      case 'hide':
      case 'show':
      case 'scrollTo':
        if (!act.target || typeof act.target !== 'object') {
          return { valid: false, error: `${prefix}: missing "target"` }
        }
        if (typeof (act.target as Record<string, unknown>).agentId !== 'string') {
          return { valid: false, error: `${prefix}: target.agentId must be a string` }
        }
        break
    }
  }

  return {
    valid: true,
    response: {
      say: obj.say as string,
      actions: obj.actions as Action[]
    }
  }
}

export function parseAgentResponse(rawText: string): { valid: true; response: AgentResponse } | { valid: false; error: string; raw: string } {
  // Try to extract JSON from potential markdown code blocks
  let jsonText = rawText.trim()
  
  // Remove markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim()
  }

  // Try to find JSON object
  const objectMatch = jsonText.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonText = objectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonText)
    const validation = validateAgentResponse(parsed)
    if (validation.valid) {
      return validation
    } else {
      return { valid: false, error: validation.error, raw: rawText }
    }
  } catch (e) {
    return { 
      valid: false, 
      error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`,
      raw: rawText 
    }
  }
}
