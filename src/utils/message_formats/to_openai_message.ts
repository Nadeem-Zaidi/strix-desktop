import { ResponseInputFile, ResponseInputImage, ResponseInputItem, ResponseInputText } from "openai/resources/responses/responses.mjs";
import { LLMMessage, TextContent } from "../../types_and_interfaces/types";

export const toOpenAi=(messages: LLMMessage[]): ResponseInputItem[] =>{
        return messages.map((msg): ResponseInputItem => {
            if (msg.role === "system") {
                return {
                    type: "message",
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
                        }
                    ]
                }

            }
            if (msg.role === "tool") {
                return {
                    type: "function_call_output",
                    call_id: msg.tool_call_id!,
                    output: typeof msg.content === "string"
                        ? msg.content
                        : JSON.stringify(msg.content),
                }
            }

            if (msg.role === "assistant" && msg.tool_calls?.length) {
                return {
                    type: "message",
                    role: "assistant",
                    content: msg.tool_calls.map((tc) => ({
                        type: "fu nction_call" as const,
                        call_id: tc.id,
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    })),
                } as unknown as ResponseInputItem;
            }

            if (msg.role === "assistant") {
                const content =
                    typeof msg.content === "string"
                        ? [
                            {
                                type: "output_text" as const,
                                text: msg.content,
                            },
                        ]
                        : msg.content.map((part) => {
                            if (part.type !== "text") {
                                throw new Error(
                                    `Assistant messages only support text content. Got: ${part.type}`
                                );
                            }

                            return {
                                type: "output_text" as const,
                                text: (part as TextContent).text ,
                            };
                        });

                return {
                    type: "message",
                    role: "assistant" as const,
                    content,
                }  as unknown as ResponseInputItem;;
            }



            const content = typeof msg.content === "string"
                ? msg.content : msg.content.map((part): ResponseInputText | ResponseInputImage|ResponseInputFile => {
                    if (part.type === "text") {
                        return { type: "input_text", text: (part as TextContent).text }
                    }

                    // if (part.type === "image_url") {
                    //     return {
                    //         type: "input_image",
                    //         image_url: part.image_url.url,
                    //         detail: part.image_url.detail ?? "auto",
                    //     };
                    // }
                    // if (part.type === "image") {
                    //     return {
                    //         type: "input_image",
                    //         image_url: `data:${part.source.media_type};base64,${part.source.data}`,
                    //         detail: "auto",
                    //     };
                    // }

                    if (part.type==="input_image"){
                        return {
                            type:"input_image",
                            file_id:part.file_id
                        } as ResponseInputImage

                    }
                    if(part.type==="input_file"){
                        return {
                            type:"input_file",
                            file_id:part.file_id,
                        }
                    }
                    throw new Error(`Unhandled content part type: ${(part as any).type}`);
                })

            return {
                type: "message",
                role: msg.role as "user" | "assistant",
                content,
            } as ResponseInputItem;
        })
    }
