import { ResponseFunctionToolCall, ResponseInputContent, ResponseInputFile, ResponseInputImage, ResponseInputItem, ResponseInputText, ResponseOutputItem, ResponseOutputText } from "openai/resources/responses/responses.mjs";
import { ContentPart, FileInput, ImageBase64Content, ImageUrlContent, LLMMessage, LLMType, TextContent, ToolCall } from "./llm_types_and_interfaces/types";





export class MessageAdapter {
    message: LLMMessage[];
    llmType: LLMType;
    llmMessage: LLMMessage[];


    constructor(llmType: LLMType, message: LLMMessage[]) {
        this.llmType = llmType;
        this.message = message;
        this.llmMessage = [];
    }

    to(llmType: LLMType) {
        switch (llmType) {
            case "openai":
                return this.converterOpenAi();
            default:
                return [];

        }

    }

    private converterOpenAi(): (ResponseInputItem | ResponseOutputItem)[] {
        return this.message.map((m): ResponseInputItem | ResponseOutputItem => {
            switch (m.role) {
                case "user":
                    return {
                        type: "message",
                        role: "user",
                        content: m.content.map((msg) => {
                            switch (msg.type) {
                                case "input_text":
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
                                case "input_text":
                                    return {
                                        type: "output_text",
                                        text: (msg as TextContent).text
                                    } as ResponseOutputText;

                                default:
                                    throw new Error(
                                        `Unsupported assistant content type: ${msg.type}`
                                    );
                            }
                        }),

                    } as ResponseOutputItem;

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
                        output: typeof m.content === "string"
                            ? m.content
                            : JSON.stringify(m.content)

                    } as ResponseInputItem.FunctionCallOutput



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




}