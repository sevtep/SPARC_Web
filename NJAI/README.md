# Peer Agent Demo

A minimal React + Vite + TypeScript demo showcasing a visual "Peer Agent" (Companion Agent) that can control webpage elements through natural language commands.

## Features

- 🤖 **Natural Language Control**: Tell the agent what to do in plain English
- 👆 **Visual Pointer**: Watch the agent's cursor move to elements
- 🎯 **Highlight & Labels**: Visual indicators show where actions happen
- 📋 **Action Log**: See every action the agent performs
- 🔌 **Local Ollama Integration**: Uses your local Ollama instance

## Prerequisites

### 1. Install Ollama

Download and install Ollama from [ollama.ai](https://ollama.ai)

### 2. Pull the Qwen Model

```bash
ollama pull qwen3:8b
```

Or use any other model you prefer.

### 3. Start Ollama

Make sure Ollama is running on `http://localhost:11434` (default).

```bash
ollama serve
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

### Model Configuration

You can specify a different Ollama model by creating a `.env` file:

```env
VITE_OLLAMA_MODEL=qwen3:8b
```

Or set it when running:

```bash
VITE_OLLAMA_MODEL=llama3.2 npm run dev
```

## Usage

1. Open the app in your browser
2. Look for the Agent panel in the bottom-right corner
3. Type natural language commands, for example:
   - "Click Start"
   - "Set the name to Jacob"
   - "Change level to hard and click Reset"
   - "Fill in the name as Alice and start"
4. Watch the virtual pointer move and execute actions!

## Available Elements

The demo page has these controllable elements:

| Element | Agent ID | Type |
|---------|----------|------|
| Start Button | `btn_start` | button |
| Reset Button | `btn_reset` | button |
| Name Input | `input_name` | text input |
| Level Select | `select_level` | dropdown (easy/medium/hard) |

## Action Types

The agent can perform these actions:

- `highlight` - Highlight an element with a visual border
- `moveTo` - Move the virtual pointer to an element
- `click` - Click on an element
- `type` - Type text into an input field
- `select` - Select an option from a dropdown
- `label` - Add a temporary label near an element
- `wait` - Wait for a specified time (ms)

## Project Structure

```
src/
├── App.tsx              # Main page with demo controls
├── App.css              # Main page styles
├── agent/
│   ├── CompanionAgent.tsx  # Chat panel component
│   ├── CompanionAgent.css  # Panel styles
│   ├── pointer.ts       # Virtual pointer logic
│   ├── overlay.ts       # Highlight/label overlays
│   ├── actions.ts       # Action type definitions & validation
│   └── runner.ts        # Action execution engine
└── lib/
    └── ollama.ts        # Ollama API client
```

## Troubleshooting

### "Ollama API error"

Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found"

Pull the model first:
```bash
ollama pull qwen3:8b
```

### CORS Issues

The Vite dev server is configured to proxy `/ollama/*` to `localhost:11434`. Make sure you're using `npm run dev` and not opening the HTML file directly.

## License

MIT
