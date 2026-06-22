import { ILLM, LLMConfig, LLMMessage, LLMResponse, Tool, ToolCall } from "../llm_types_and_interfaces/types";

interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream: boolean;
    options?: {
        temperature?: number;
        num_predict?: number;
    };
}

interface OllamaMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface OllamaChatResponse {
    model: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    done_reason?: string;
}

interface OllamaStreamChunk {
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    done_reason?: string;
}

interface OllamaEmbeddingResponse {
    embedding: number[];
}

// ---------------------------------------------------------------------------
// Tool-call prompt injection
// ---------------------------------------------------------------------------

const TOOL_SYSTEM_PROMPT = (tools: Tool[]) => `You have access to the following tools. If you need to use a tool, respond with ONLY a valid JSON object in this exact format and nothing else:
{
  "tool_call": {
    "name": "<tool_name>",
    "arguments": { <key>: <value> }
  }
}

Available tools:
${JSON.stringify(tools, null, 2)}

If you do not need to use a tool, respond normally as plain text.`;

/**
 * Try to extract a tool call from the model's text response.
 * Returns null if the response is plain text.
 */
// function extractToolCall(content: string): ToolCall | null {
//     const start = content.indexOf("{");
//     const end   = content.lastIndexOf("}");
//     if (start === -1 || end === -1) return null;

//     try {
//         const json = JSON.parse(content.slice(start, end + 1));
//         if (!json.tool_call?.name) return null;

//         return {
//             id:   `call_${Date.now()}_${json.tool_call.name}`,
//             type: "function",
//             function: {
//                 name:      json.tool_call.name,
//                 arguments: JSON.stringify(json.tool_call.arguments ?? {}),
//             },
//         };
//     } catch {
//         return null;
//     }
// }

function mapFinishReason(reason?: string): LLMResponse["finishReason"] {
    switch (reason) {
        case "stop":           return "stop";
        case "length":         return "length";
        case "tool_calls":     return "tool_calls";
        case "content_filter": return "content_filter";
        default:               return "stop";
    }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class GemmaProvider implements ILLM {
    private readonly model: string;
    private readonly baseURL: string;
    private readonly temperature?: number;
    private readonly maxTokens?: number;

    constructor(config: LLMConfig) {
        this.model       = config.model;
        this.baseURL     = "http://localhost:11434";
        this.temperature = config.temperature;
        this.maxTokens   = config.maxTokens;
    }
    fileUPload(fileName: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    supportsTools(): boolean {
        return false;
    }

    // -----------------------------------------------------------------------
    // Message mapping
    // -----------------------------------------------------------------------

    /**
     * Gemma does not support a native `system` role or `tool` role.
     * - System messages are merged into the first user message.
     * - Tool result messages are converted to user messages.
     * - When tools are provided, a tool-use instruction block is prepended
     *   to the first user message.
     */
    private mapMessages(messages: LLMMessage[], tools?: Tool[]): OllamaMessage[] {
        const result: OllamaMessage[] = [];
        let systemBuffer = "";

        if (tools && tools.length > 0) {
            systemBuffer = TOOL_SYSTEM_PROMPT(tools);
        }

        for (const msg of messages) {
            if (msg.role === "system") {
                const text = Array.isArray(msg.content)
                    ? msg.content.map(c => (typeof c === "string" ? c : JSON.stringify(c))).join("\n")
                    : msg.content;
                systemBuffer += (systemBuffer ? "\n\n" : "") + text;
                continue;
            }

            if (msg.role === "tool") {
                // Convert tool result to a user message so Gemma can read it
                // FIX: tool_call_id is not optional in your LLMMessage type
                const toolContent = `Tool result for call ${msg.tool_call_id}:\n${msg.content}`;
                result.push({ role: "user", content: toolContent });
                continue;
            }

            if (msg.role === "user") {
                // FIX: content is string | any[] — coerce to string safely
                const text = Array.isArray(msg.content)
                    ? msg.content.map(c => (typeof c === "string" ? c : JSON.stringify(c))).join("\n")
                    : msg.content;
                const content = systemBuffer
                    ? `${systemBuffer}\n\n${text}`
                    : text;
                result.push({ role: "user", content });
                systemBuffer = "";
                continue;
            }

            // if (msg.role === "assistant") {
            //     // FIX: content is string | any[] — coerce to string safely
            //     const text = Array.isArray(msg.content)
            //         ? msg.content.map(c => (typeof c === "string" ? c : JSON.stringify(c))).join("\n")
            //         : msg.content;

            //     if (msg.tool_calls && msg.tool_calls.length > 0) {
            //         const tc = msg.tool_calls[0];
            //         const reconstructed = JSON.stringify({
            //             tool_call: {
            //                 name:      tc.function.name,
            //                 // FIX: arguments is already a string in your ToolCall type — parse it
            //                 arguments: JSON.parse(tc.function.arguments),
            //             },
            //         }, null, 2);
            //         result.push({ role: "assistant", content: reconstructed });
            //     } else {
            //         result.push({ role: "assistant", content: text });
            //     }
            // }
        }

        if (systemBuffer) {
            result.push({ role: "user", content: systemBuffer });
        }

        return result;
    }

    // -----------------------------------------------------------------------
    // HTTP
    // -----------------------------------------------------------------------

    private buildRequest(
        messages: LLMMessage[],
        stream: boolean,
        tools?: Tool[]
    ): OllamaChatRequest {
        const req: OllamaChatRequest = {
            model:    this.model,
            messages: this.mapMessages(messages, tools),
            stream,
        };

        if (this.temperature !== undefined || this.maxTokens !== undefined) {
            req.options = {};
            if (this.temperature !== undefined) req.options.temperature = this.temperature;
            if (this.maxTokens   !== undefined) req.options.num_predict  = this.maxTokens;
        }

        return req;
    }

    private async fetchOllama(path: string, body: unknown): Promise<Response> {
        const res = await fetch(`${this.baseURL}${path}`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Ollama error (${res.status}): ${text}`);
        }

        return res;
    }

    // -----------------------------------------------------------------------
    // ILLM
    // -----------------------------------------------------------------------

    async chat(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
        // const body = this.buildRequest(messages, false, tools);
        // const res  = await this.fetchOllama("/api/chat", body);
        // const data: OllamaChatResponse = await res.json();

        // const rawContent = data.message.content ?? "";
        // const toolCall   = tools?.length ? extractToolCall(rawContent) : null;

        // return {
        //     content:      toolCall ? null : rawContent,
        //     // FIX: your LLMResponse uses toolCalls? (optional), not toolCalls: null
        //     toolCalls:    toolCall ? [toolCall] : undefined,
        //     finishReason: toolCall ? "tool_calls" : mapFinishReason(data.done_reason),
        // };
        throw new Error("Method not implemented.");
    }

    async *chatStream(
        messages: LLMMessage[],
        tools?: Tool[]
    ): AsyncGenerator<any, void, unknown> {
        const body = this.buildRequest(messages, true, tools);
        const res  = await this.fetchOllama("/api/chat", body);

        if (!res.body) throw new Error("No response body for streaming.");

        const reader  = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer    = "";
        let collected = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    const chunk: OllamaStreamChunk = JSON.parse(trimmed);
                    const delta = chunk.message?.content ?? "";
                    collected  += delta;

                    if (chunk.done) {
                        // const toolCall = tools?.length ? extractToolCall(collected) : null;

                        // if (toolCall) {
                        //     yield {
                        //         content:    "",
                        //         isToolCall: true,
                        //         // FIX: StreamChunk.toolCalls expects your ToolCall[], not OpenAI's
                        //         toolCalls:  [toolCall],
                        //         isDone:     true,
                        //     };
                        // } else {
                        //     yield {
                        //         content:    delta,
                        //         isToolCall: false,
                        //         isDone:     true,
                        //     };
                        // }
                        // return;
                    }

                    yield {
                        content:    delta,
                        isToolCall: false,
                        isDone:     false,
                    };
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const res  = await this.fetchOllama("/api/embeddings", { model: this.model, prompt: text });
        const data: OllamaEmbeddingResponse = await res.json();
        return data.embedding;
    }

    getProvider(): string {
        return "ollama";
    }

    getModel(): string {
        return this.model;
    }
}