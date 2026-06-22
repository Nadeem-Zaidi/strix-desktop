import { ResponseFunctionToolCall, ResponseInputFile, ResponseInputImage, ResponseInputItem, ResponseInputText, ResponseOutputItem, ResponseOutputText, ResponseStreamEvent } from "openai/resources/responses/responses.mjs";
import OpenAI from "openai";
import { ContentPart, FileInput, ILLM, ImageBase64Content, ImageUrlContent, LLMConfig, LLMMessage, StreamChunk, TextContent } from "../llm_types_and_interfaces/types";
import fs from "fs";

import { Tool } from "openai/resources/responses/responses.mjs";
import { IDatabaseAdapter } from "../../database/idatabase";
import { AppState } from "../../app_state/app_state";
import { LLMTool } from "../../tools/tool_registry";
import { toOpenAIResponsesTool } from "../../tools/tool_schema_adapter";
import { MessageRepository } from "../../database/message_repository";


export class OpenAIProvider implements ILLM {
    private client: OpenAI;
    private config: LLMConfig;
    private tools: LLMTool
    private messageRepository: MessageRepository;
    private appState: AppState;
    private abortController: AbortController | null = null;


    constructor(apiKey: string, config: LLMConfig, tools: LLMTool, messageRepository: MessageRepository, appState: AppState) {
        this.config = config;
        this.client = new OpenAI({ apiKey });
        this.tools = tools;
        this.messageRepository = messageRepository
        this.appState = appState

    }


    supportsTools(): boolean {
        return true;
    }

    abort(): void {
        this.abortController?.abort();
        this.abortController = null;
    }

    private async responseInputFromLLMMessage(messages: LLMMessage[]) {
        return messages.map((m): ResponseInputItem => {
            switch (m.role) {
                case "user":
                    return {
                        type: "message",
                        role: "user",
                        content: m.content.map((msg) => {
                            switch (msg.type) {
                                case "text":
                                    return {
                                        type: "input_text",
                                        text: (msg as TextContent).text
                                    } as ResponseInputText;

                                case "input_file":
                                    return {
                                        type: "input_file",
                                        file_id: (msg as FileInput).file_id
                                    } as ResponseInputFile;

                                case "input_base64_image":
                                    return {
                                        type: "input_image",
                                        image_url: `data:${(msg as ImageBase64Content).source.media_type};base64,${(msg as ImageBase64Content).source.data}`,
                                        detail: "auto"
                                    } as ResponseInputImage;

                                case "input_url_image":
                                    return {
                                        type: "input_image",
                                        image_url: (msg as ImageUrlContent).image_url.url,
                                        detail: "auto"
                                    } as ResponseInputImage;

                                default:
                                    throw new Error(
                                        `Unsupported content type: ${msg.type}`
                                    );
                            }
                        })
                    };

                case "assistant":
                    return {
                        type: "message",
                        role: "assistant",
                        content: m.content.map((msg) => {
                            switch (msg.type) {
                                case "output_text":
                                case "text":
                                    return {
                                        type: "output_text",
                                        text: (msg as TextContent).text
                                    } as ResponseOutputText

                                default:
                                    throw new Error(
                                        `Unsupported assistant content type: ${msg.type}`
                                    );
                            }
                        })

                    } as ResponseInputItem;

                case "tool_call":
                    return {
                        type: "function_call",
                        call_id: m.tool_call_id,
                        name: m.name,
                        arguments: JSON.stringify(m.arguments)
                    } as ResponseFunctionToolCall

                case "tool_call_output":
                    return {
                        type: "function_call_output",
                        call_id: m.tool_call_id,
                        output: m.output

                    } as ResponseInputItem
                case "system":
                    return {
                        type: "message",
                        role: "system",
                        content: m.content.map((msg) => {
                            switch (msg.type) {
                                case "input_text":
                                    return {
                                        type: "input_text",
                                        text: (msg as TextContent).text
                                    } as ResponseInputText;

                                default:
                                    throw new Error(
                                        `Unsupported system content type: ${msg.type}`
                                    );
                            }
                        })
                    };

                default:
                    throw new Error(`Unsupported role: ${m.role}`);
            }
        });


    }

    private async fromLLM(llmMessages: Array<Record<string, any>>) {
        return llmMessages.map((m): ResponseInputItem => {
            switch (m.role) {
                case "user":
                    return {
                        type: "message",
                        role: "user",
                        content: (m.content as ContentPart[]).map((msg) => {
                            switch (msg.type) {
                                case "text":
                                    return {
                                        type: "input_text",
                                        text: (msg as TextContent).text
                                    } as ResponseInputText;

                                case "input_file":
                                    return {
                                        type: "input_file",
                                        file_id: (msg as FileInput).file_id
                                    } as ResponseInputFile;

                                case "input_base64_image":
                                    return {
                                        type: "input_image",
                                        image_url: `data:${(msg as ImageBase64Content).source.media_type};base64,${(msg as ImageBase64Content).source.data}`,
                                        detail: "auto"
                                    } as ResponseInputImage;

                                case "input_url_image":
                                    return {
                                        type: "input_image",
                                        image_url: (msg as ImageUrlContent).image_url.url,
                                        detail: "auto"
                                    } as ResponseInputImage;

                                default:
                                    throw new Error(
                                        `Unsupported content type: ${msg.type}`
                                    );
                            }
                        })
                    };

                case "assistant":
                    return {
                        type: "message",
                        role: "assistant",
                        content: (m.content as ContentPart[]).map((msg) => {
                            switch (msg.type) {
                                case "text":
                                    return {
                                        type: "output_text",
                                        text: (msg as TextContent).text
                                    } as ResponseOutputText

                                default:
                                    throw new Error(
                                        `Unsupported assistant content type: ${msg.type}`
                                    );
                            }
                        })

                    } as ResponseInputItem;

                case "tool_call":
                    return {
                        type: "function_call",
                        call_id: m.tool_call_id,
                        name: m.name,
                        arguments: JSON.stringify(m.arguments)
                    } as ResponseFunctionToolCall

                case "tool_call_output":
                    return {
                        type: "function_call_output",
                        call_id: m.tool_call_id,
                        output: m.output

                    } as ResponseInputItem



                case "system":
                    return {
                        type: "message",
                        role: "system",
                        content: (m.content as ContentPart[]).map((msg) => {
                            switch (msg.type) {
                                case "input_text":
                                    return {
                                        type: "input_text",
                                        text: (msg as TextContent).text
                                    } as ResponseInputText;

                                default:
                                    throw new Error(
                                        `Unsupported system content type: ${msg.type}`
                                    );
                            }
                        })
                    };

                default:
                    // sanitizer should have caught this — but just in case
                    return {
                        type: "message",
                        role: "user",
                        content: [{ type: "input_text", text: "[unreadable message]" }]
                    };
            }
        });
    }

    async summarizeChat(input: ResponseInputItem[]) {
        const promptMessage: ResponseInputItem = {
            type: "message",
            role: "system",
            content: [
                {
                    type: "input_text",
                    text: `
                            You are an expert conversation title generator.

                            Your task is to generate a short, meaningful, and descriptive title that summarizes the user's message or conversation.

                            Rules:
                            - Return only the title.
                            - Do not include quotes or explanations.
                            - Use 4 to 8 words whenever possible.
                            - Focus on the main topic or intent.
                            - Preserve important technical terms, product names, and acronyms.
                            - Make the title specific and searchable.
                            - Use Title Case.
                            - Maximum 60 characters.

                            Examples:
                            User: "Can you explain how rotary positional embeddings work?"
                            Title: Rotary Positional Embeddings Explained

                            User: "What GPU do I need to run DeepSeek V3?"
                            Title: DeepSeek V3 GPU Requirements

                            User: "How does attention use query key and value matrices?"
                            Title: Query Key Value Attention

                            User: "I want to build an LLM from scratch"
                            Title: Building an LLM From Scratch

                            Return only the generated title.
                                `.trim(),
                },
            ],
        };
        const inputMessages = [promptMessage, ...input]
        try {
            const response = await this.client.responses.create({
                model: this.config.model,
                input: inputMessages,
                temperature: 0.3,
                max_output_tokens: 20,
            });

            return response.output_text?.trim() || "New Conversation";
        } catch (error) {
            console.error("Failed to generate title:", error);
            return "New Conversation";
        }

    }





    async *chatStream(messages: LLMMessage[]): AsyncGenerator<any, void, unknown> {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        if (!this.appState.currentSessionId) {
            throw new Error("Cannot start chat stream: no active session");
        }

        let continueLoop = true;

        if (!messages) {
            return
        }

        for (const message of messages) {
            await this.messageRepository.insertLLMMessage(this.appState.currentSessionId, message)
        }
        const history = await this.messageRepository.getSessionMessages(
            this.appState.currentSessionId
        );
        const input = await this.fromLLM(history);
        const inputMessages = [...input]
        const tools = this.tools.getAll().map(toOpenAIResponsesTool);
   
        while (continueLoop) {
            if (signal.aborted) break;
            try {
                const stream = this.client.responses.stream({
                    model: this.config.model,
                    input: inputMessages,
                    temperature: this.config.temperature,
                    max_output_tokens: this.config.maxTokens,
                    stream: true,
                    tools,
                });

                const callIdToName = new Map<string, Record<string, any>>();
                for await (const event of stream) {
                    if (signal.aborted) {
                        await stream.abort();   // tell OpenAI SDK to stop
                        continueLoop = false;
                        break;
                    }
                    if (event.type === "response.output_text.delta") {
                        yield {
                            role: "assistant",
                            content: [
                                { type: "text", text: event.delta }
                            ] as ContentPart[]
                        } as LLMMessage

                    }

                    if (event.type === "response.output_text.done") {
                        await this.messageRepository.insertTextMessage({ sessionId: this.appState.currentSessionId, type: "message", role: "assistant", content: { type: "text", text: event.text } });
                        if ([1, 3, 5, 7].includes(inputMessages.length)) {
                            console.log("hi inside")
                            const title = await this.summarizeChat(inputMessages);
                            this.messageRepository.updateSessionTitle({ sessionId: this.appState.currentSessionId, newTitle: title });
                            yield {
                                type: "session_title",
                                title: title
                            }
                        }
                    }

                    if (event.type === "response.output_item.added") {
                        if (event.item.type === "function_call") {
                            callIdToName.set(event.item.id ?? "", {
                                id: event.item.id,
                                name: event.item.name,
                                type: event.item.type,
                                call_id: event.item.call_id,
                                arguments: ""
                            });

                            yield {
                                id: event.item.id,
                                name: event.item.name,
                                type: event.item.type,
                                tool_call_id: event.item.call_id,
                            } as LLMMessage
                        }
                    }
                    if (event.type === "response.function_call_arguments.done") {
                        const entry = callIdToName.get(event.item_id ?? "");
                        if (entry) {
                            entry.arguments = event.arguments;
                            yield {
                                type: "function_call_args",
                                tool_call_id: entry.call_id,
                                args: event.arguments
                            };
                        }
                    }

                    if (event.type === "response.completed") {
                        if (!callIdToName.size) {
                            yield { content: "", isToolCall: false, isDone: true };
                            continueLoop = false;
                        }
                    }

                    if (event.type === "response.failed") {
                        throw new Error(`OpenAI response failed: ${(event as any).response?.error?.message ?? "unknown"}`);
                    }
                }
                // In chatStream, replace the tool execution block:

                for (const [key, value] of callIdToName.entries()) {
                    const args = JSON.parse(value.arguments);
                    let result: string;

                    try {
                        const rawResult = await this.tools.executeTool(
                            value.name,
                            args,
                            { db: this.messageRepository.db, appState: this.appState }
                        );
                        result = JSON.stringify(rawResult);
                    } catch (toolErr) {
                        const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
                        console.error(`Tool "${value.name}" failed:`, errMsg);
                        result = JSON.stringify({
                            error: true,
                            message: errMsg,
                            hint: "Tool execution failed. Do not retry with the same arguments."
                        });
                        yield {
                            type: "function_call_output",
                            tool_call_id: value.call_id,
                            output: result,
                            isError: true
                        };
                    }

                    // ── Write BOTH call + result atomically so history is never half-written ──
                    try {
                        await this.messageRepository.insertToolCallAndResult({
                            sessionId: this.appState.currentSessionId!,
                            toolCallId: value.call_id,
                            toolName: value.name,
                            args: JSON.stringify(value.arguments),
                            output: result
                        });
                    } catch (dbErr) {
                        yield {
                            type: "error",
                            code: "persistence",
                            message: "Something went wrong while saving the tool result. Please try again.",
                            isDone: true
                        };
                        continueLoop = false;
                        break;

                    }

                    // Only push to inputMessages AFTER successful DB write
                    inputMessages.push({
                        id: value.id,
                        type: "function_call",
                        call_id: value.call_id,
                        name: value.name,
                        arguments: value.arguments
                    });

                    inputMessages.push({
                        type: "function_call_output",
                        call_id: value.call_id,
                        output: result
                    });
                }

                // ── Fix: clear map after iteration, not during ──
                callIdToName.clear();


            } catch (err) {
                if (err instanceof OpenAI.RateLimitError) {
                    // 429 — back off and retry
                    yield { type: "error", code: "rate_limit", message: "Rate limit hit. Please wait and retry." };

                } else if (err instanceof OpenAI.AuthenticationError) {
                    // 401 — bad API key, no point retrying
                    yield { type: "error", code: "auth", message: "Invalid API key." };

                } else if (err instanceof OpenAI.PermissionDeniedError) {
                    // 403
                    yield { type: "error", code: "permission", message: "Access denied." };

                } else if (err instanceof OpenAI.InternalServerError) {
                    // 500-599 — OpenAI side, safe to retry
                    yield { type: "error", code: "server", message: "OpenAI server error. Try again shortly." };

                } else if (err instanceof OpenAI.APIConnectionTimeoutError) {
                    // Request timed out — subclass of APIConnectionError, check first
                    yield { type: "error", code: "timeout", message: "Request timed out." };

                } else if (err instanceof OpenAI.APIConnectionError) {
                    // Generic network failure (DNS, TCP reset, proxy, SSL)
                    yield { type: "error", code: "network", message: "Could not reach OpenAI. Check your connection." };

                } else if (err instanceof OpenAI.APIError) {
                    // Catch-all for any other 4xx/5xx not covered above
                    yield { type: "error", code: "api", message: err.message };

                } else {
                    // Unexpected — tell the renderer something went wrong,
                    // then rethrow so it also gets logged at the IPC level
                    yield {
                        type: "error",
                        code: "unexpected",
                        message: err instanceof Error ? err.message : "An unexpected error occurred"
                    };
                    continueLoop = false;
                    throw err;  // ← still rethrow so main.ts logger catches it
                }

                continueLoop = false;
            }

        }
        if (signal.aborted) {
            yield { content: "", isToolCall: false, isDone: true };
        }

        this.abortController = null;
    }

    async fileUPload(fileName: string): Promise<string> {
        const uploadedFile = await this.client.files.create({
            file: fs.createReadStream(fileName),
            purpose: "user_data",
        });

        return uploadedFile.id;

    }

    getProvider(): string {
        return "openai";
    }

    getModel(): string {
        return this.config.model;
    }
}