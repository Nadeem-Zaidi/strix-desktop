import { ResponseFunctionToolCall, ResponseInputFile, ResponseInputImage, ResponseInputItem, ResponseInputText, ResponseItem, ResponseOutputText } from "openai/resources/responses/responses.mjs";
import { FileInput, ImageBase64Content, ImageUrlContent, LLMMessage, LLMType, TextContent } from "../llm_types_and_interfaces/types";
type Native = ResponseInputItem



export class MessageAdapter {
    llmMessage: LLMMessage[];
    llmType: LLMType;


    constructor(llmMessage: LLMMessage[], llmType: LLMType) {
        this.llmMessage = llmMessage;
        this.llmType = llmType;
    }

    private toOpenAiFormat() {
        return this.llmMessage.map((message): ResponseInputItem => {
            switch (message.role) {
                case 'user':
                    return {
                        type: "message",
                        role: "user",
                        content: message.content.map((msg) => {
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
                        content: message.content.map((msg) => {
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
                        call_id: message.tool_call_id,
                        name: message.name,
                        arguments: JSON.stringify(message.arguments)
                    } as ResponseFunctionToolCall

                case "tool_call_output":
                    return {
                        type: "function_call_output",
                        call_id: message.tool_call_id,
                        output: typeof message.content === "string"
                            ? message.content
                            : JSON.stringify(message.content)

                    } as ResponseInputItem
                case "system":
                    return {
                        type: "message",
                        role: "system",
                        content: message.content.map((msg) => {
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
                    throw new Error(`Unsupported role: ${message.role}`);
            }

        })
    }

    toNative() {
        switch (this.llmType) {
            case (LLMType.OpenAi):
                this.toOpenAiFormat();
        }

    }



}