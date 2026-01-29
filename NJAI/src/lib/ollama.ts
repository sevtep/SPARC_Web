// Ollama API client

const OLLAMA_BASE_URL = '/ollama/api'
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'qwen3:8b'

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatRequest {
  model: string
  stream: boolean
  messages: OllamaMessage[]
}

interface OllamaChatResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

const SYSTEM_PROMPT = `You are a web page companion agent. You MUST output ONLY valid JSON without any markdown formatting, code blocks, or explanatory text.

The JSON must follow this exact structure:
{
  "say": "A brief friendly message to the user (1 sentence)",
  "actions": [
    { "type": "highlight", "target": { "agentId": "element_id" } },
    { "type": "moveTo", "target": { "agentId": "element_id" } },
    { "type": "click", "target": { "agentId": "element_id" } },
    { "type": "type", "target": { "agentId": "element_id" }, "text": "text to type" },
    { "type": "select", "target": { "agentId": "element_id" }, "value": "option_value" },
    { "type": "label", "target": { "agentId": "element_id" }, "text": "label text" },
    { "type": "setStyle", "target": { "agentId": "element_id" }, "styles": { "backgroundColor": "red", "color": "white" } },
    { "type": "setText", "target": { "agentId": "element_id" }, "text": "new text content" },
    { "type": "hide", "target": { "agentId": "element_id" } },
    { "type": "show", "target": { "agentId": "element_id" } },
    { "type": "scrollTo", "target": { "agentId": "element_id" } },
    { "type": "wait", "ms": 400 }
  ]
}

VALID action types (use EXACTLY these names, no variations):
- "highlight": Add a visual highlight border around element
- "moveTo": Move the virtual pointer to element
- "click": Click on element
- "type": Type text into an input field (use this to input text into input fields)
- "select": Select an option from a dropdown
- "label": Add a temporary floating label near element (NOT "setLabel")
- "setStyle": Change CSS styles (backgroundColor, color, fontSize, border, etc.)
- "setText": Change the text content of an element (button text, etc.)
- "hide": Hide an element (display: none)
- "show": Show a hidden element
- "scrollTo": Scroll the page to bring element into view
- "wait": Wait for specified milliseconds

IMPORTANT Rules:
1. Only use the EXACT action type names listed above. Do NOT use "setLabel" - use "label" instead.
2. Always use agentId in target, never CSS selectors
3. For click/type/select/setStyle actions, add a moveTo or highlight action before them for visual effect
4. Keep "say" brief and friendly in the same language as user's input
5. Output ONLY the JSON object, no other text`

export async function sendAgentMessage(userMessage: string, availableAgentIds: string[]): Promise<string> {
  const messages: OllamaMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
    { role: 'user', content: `Available agentId values you can use: ${availableAgentIds.join(', ')}. Only use these exact IDs.` }
  ]

  const request: OllamaChatRequest = {
    model: DEFAULT_MODEL,
    stream: false,
    messages
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data: OllamaChatResponse = await response.json()
  return data.message.content
}

export function getModelName(): string {
  return DEFAULT_MODEL
}
