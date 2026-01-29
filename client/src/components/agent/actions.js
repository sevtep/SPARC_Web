// Action type definitions and validation

const VALID_ACTION_TYPES = ['highlight', 'moveTo', 'click', 'type', 'select', 'label', 'wait', 'navigate', 'startCompetition']

export function validateAgentResponse(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not an object' }
  }

  if (typeof data.say !== 'string') {
    return { valid: false, error: 'Missing or invalid "say" field (must be string)' }
  }

  if (!Array.isArray(data.actions)) {
    return { valid: false, error: 'Missing or invalid "actions" field (must be array)' }
  }

  // Validate each action
  for (let i = 0; i < data.actions.length; i++) {
    const action = data.actions[i]
    
    if (!action || typeof action !== 'object') {
      return { valid: false, error: `Action ${i} is not an object` }
    }

    if (!VALID_ACTION_TYPES.includes(action.type)) {
      return { valid: false, error: `Action ${i} has invalid type: ${action.type}` }
    }

    // Validate target for actions that need it
    if (['highlight', 'moveTo', 'click', 'type', 'select', 'label'].includes(action.type)) {
      if (!action.target || typeof action.target.agentId !== 'string') {
        return { valid: false, error: `Action ${i} (${action.type}) missing valid target.agentId` }
      }
    }

    // Validate specific action fields
    if (action.type === 'type' && typeof action.text !== 'string') {
      return { valid: false, error: `Action ${i} (type) missing text field` }
    }

    if (action.type === 'select' && typeof action.value !== 'string') {
      return { valid: false, error: `Action ${i} (select) missing value field` }
    }

    if (action.type === 'label' && typeof action.text !== 'string') {
      return { valid: false, error: `Action ${i} (label) missing text field` }
    }

    if (action.type === 'wait' && typeof action.ms !== 'number') {
      return { valid: false, error: `Action ${i} (wait) missing ms field` }
    }

    if (action.type === 'navigate' && typeof action.path !== 'string') {
      return { valid: false, error: `Action ${i} (navigate) missing path field` }
    }
  }

  return { valid: true, response: data }
}

export function parseAgentResponse(rawResponse) {
  // Try to extract JSON from the response
  let jsonStr = rawResponse.trim()
  
  // Remove qwen3's thinking process (wrapped in <think>...</think>)
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '')
  
  // Remove markdown code blocks if present
  if (jsonStr.includes('```json')) {
    const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/)
    if (match) {
      jsonStr = match[1]
    }
  } else if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/)
    if (match) {
      jsonStr = match[1]
    }
  }
  jsonStr = jsonStr.trim()

  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    const validation = validateAgentResponse(parsed)
    
    if (validation.valid) {
      return { valid: true, response: validation.response }
    } else {
      return { valid: false, error: validation.error, raw: rawResponse }
    }
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e.message}`, raw: rawResponse }
  }
}
