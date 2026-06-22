import { ToolDefinition } from "./dynamic_tool_loader";

// ─────────────────────────────────────────────────────────────────────────────
//  OpenAI — Responses API format
//  https://platform.openai.com/docs/api-reference/responses
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenAIResponsesTool {
    type: "function";
    name: string;
    description: string;
    strict: true;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
        additionalProperties: false;
    };
}

export function toOpenAIResponsesTool(tool: ToolDefinition): OpenAIResponsesTool {
    return {
        type: "function",
        name: tool.name,
        description: tool.description,
        strict: true,
        parameters: {
            ...tool.parameters,
            additionalProperties: false,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  OpenAI — Chat Completions API format  (gpt-4o, gpt-3.5-turbo etc.)
//  https://platform.openai.com/docs/api-reference/chat
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenAIChatTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}

export function toOpenAIChatTool(tool: ToolDefinition): OpenAIChatTool {
    return {
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Anthropic — Messages API format
//  https://docs.anthropic.com/en/api/messages
// ─────────────────────────────────────────────────────────────────────────────

export interface AnthropicTool {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
    };
}

export function toAnthropicTool(tool: ToolDefinition): AnthropicTool {
    return {
        name: tool.name,
        description: tool.description,
        input_schema: {
            type: "object",
            properties: tool.parameters.properties,
            required: tool.parameters.required
        },
    };
}