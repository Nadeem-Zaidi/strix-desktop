// import { useCallback, useEffect, useRef, useState } from "react";
// import { LLMMessage } from "../../electron/llm/llm_types_and_interfaces/types";
// const isBase64Image = (value: string) => {
//   return /^data:image\/[a-zA-Z]+;base64,/.test(value);
// };
// export const useLocalChatStream = () => {
//   const [messages, setMessages] = useState<LLMMessage[]>([]);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [mcpStatus, setMcpStatus] = useState("");

//   const streamBuffer = useRef("");
//   const botMessageAdded = useRef(false);
//   const cleanupRef = useRef<(() => void) | null>(null);

//   const sendMessage = useCallback(
//     async (llmMessage: LLMMessage) => {
//       if (isStreaming) return;

//       setMessages((prev) => [...prev, llmMessage]);
//       setIsStreaming(true);
//       streamBuffer.current = "";
//       botMessageAdded.current = false;

//       const llmMessages = [
//         ...messages.map((m) => ({
//           role: m.role === "assistant" ? "assistant" : m.role,
//           content: [...m.content],
//           tool_calls: m.tool_calls ? [...m.tool_calls] : [],
//           tool_call_id: m.tool_call_id ? m.tool_call_id : null
//         })),
//         // new user message
//         llmMessage
//       ];

//       try {
//         cleanupRef.current = window.electronAPI.onChunk((chunk) => {
//           if (chunk.content) {
//             for(const c of chunk.content){
//               if(c.type==="text"){
//                 streamBuffer.current += c.text;
//                 updateBotMessage(streamBuffer.current)
//               }
//             }
            
            
//             ;
//           }

//           if (chunk.isDone) {
//             setIsStreaming(false);
//             setMcpStatus("");
//             cleanupRef.current?.();
//             cleanupRef.current = null;
//           }

//           if (chunk.isToolCall && !chunk.isDone) {

//           }
//         });

//         await window.electronAPI.sendMessage(llmMessages);

//       } catch (err: any) {
//         console.log("Stream error:", err);  // ← check DevTools for this
//         // setMessages((prev) => [
//         //   ...prev.slice(0, botMessageAdded.current ? -1 : undefined),
//         //   { role: "bot" as const, text: "Something went wrong. Please try again." },
//         // ]);
//       } finally {
//         setIsStreaming(false);
//       }
//     },
//     [messages, isStreaming]
//   );

//   function updateBotMessage(text: string) {
   
//     if (!botMessageAdded.current) {
//       botMessageAdded.current = true;
//       console.log(text)
//       setMessages((prev) => [
//         ...prev,
//         {
//           role: "assistant",
//           content: [{ type: "output_text", text }]
//         }
//       ]);
//     } else {
//       setMessages((prev) => {
//         const updated = [...prev];
//         updated[updated.length - 1] = {
//           role: "assistant",
//           content: [{ type: "output_text", text }]  // ← same here
//         };
//         return updated;
//       });
//     }
//   }

//   const cancelStream = useCallback(() => {
//     cleanupRef.current?.();
//     cleanupRef.current = null;
//     setIsStreaming(false);
//     setMcpStatus("");
//   }, []);

//   useEffect(() => {
//     return () => cleanupRef.current?.();
//   }, []);

//   return {
//     messages,
//     isStreaming,
//     mcpStatus,
//     sendMessage,
//     cancelStream,
//   };
// };  