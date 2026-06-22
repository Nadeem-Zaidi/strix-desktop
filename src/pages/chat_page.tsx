import { useEffect, useRef, useState } from "react";
import "../global/chat.css";
import { BotMessage } from "../components/ui/bot_message";
import { SideDrawer } from "../components/layout/sidebar";
import { useSelector } from "react-redux";
import { changeChatMode } from "../state_mngmt/slices/chat_mode_slice";
import { useAppDispatch } from "../state_mngmt/store";
import { appendCacheMessage, clearCacheMessage, getCurrentSession, loadMessages, loadSessions, newSession, replaceLastMessage, updateSessionTitle } from "../state_mngmt/slices/session_slice";
import { FileComponent } from "../components/ui/file_component";
import { SendFileAttachment } from "../components/ui/file_send_component";
import { ContentPart, FileInput, ImageId, LLMMessage, TextContent } from "../../electron/llm/llm_types_and_interfaces/types";
import { FileAttachment, ImageAttachment, LLMFileUploadResponse, TextAttachment } from "../types_and_interfaces/types";

export const ChatPage = () => {
  const dispatch = useAppDispatch();
  const chatMode = useSelector((state: any) => state.chatMode.chatMode);
  const activeSessionId = useSelector((state: any) => state.session.activeSessionId);
  const cacheMessages = useSelector((state: any) => state.session.cacheChatMessages)
  const [isStreaming, setIsStreaming] = useState(false);
  const [mcpStatus, setMcpStatus] = useState("");
  const [activeTools, setActiveTools] = useState<Record<string, {
    name: string; args: string; done: boolean; result?: string
  }>>({});
  const [streamError, setStreamError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [pastedTexts, setPastedTexts] = useState<TextAttachment[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [llmUploadResponse, setLLMUploadResponse] = useState<LLMFileUploadResponse[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBuffer = useRef("");
  const botMessageAdded = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      dispatch(loadSessions());
      const result = await dispatch(getCurrentSession());
      const existingId = result.payload as string | null;
      if (existingId) {
        await dispatch(loadMessages(existingId)); // ← load existing session messages
      } else {
        // dispatch(newSession());
      }
    };
    bootstrap();
  }, [activeSessionId]);

  useEffect(() => {
    if (!chatMode) dispatch(clearCacheMessage());
  }, [chatMode]);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  useEffect(() => {
    const cont = pageRef.current;
    if (!cont || cacheMessages.length === 0) return;
    const lastMsg = cacheMessages[cacheMessages.length - 1];

    if (lastMsg.role === "user") {
      const userIndex = cacheMessages.length - 1;
      if (userIndex !== lastScrolledIndex.current) {
        lastScrolledIndex.current = userIndex;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = lastUserMsgRef.current;
            const c = pageRef.current;
            if (!el || !c) return;
            const er = el.getBoundingClientRect();
            const cr = c.getBoundingClientRect();
            c.scrollTo({ top: er.top - cr.top + c.scrollTop - 20, behavior: "smooth" });
          });
        });
      }
      return;
    }

    if (lastMsg.role === "assistant" && bottomAnchorRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = pageRef.current;
          const anchor = bottomAnchorRef.current;
          if (!c || !anchor) return;
          const cr = c.getBoundingClientRect();
          const ar = anchor.getBoundingClientRect();
          if (ar.top > cr.bottom + 100) return;
          if (ar.top < cr.bottom - 50) return;
          c.scrollTo({ top: Math.max(0, ar.top - cr.top + c.scrollTop - c.clientHeight + 60) });
        });
      });
    }
  }, [cacheMessages]);

  // ── helpers ────────────────────────────────────────────────────────────────
  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function updateBotMessage(text: string) {
    if (!botMessageAdded.current) {
      botMessageAdded.current = true;
      dispatch(appendCacheMessage([{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }]));
    } else {
      dispatch(replaceLastMessage({
        type: "message",
        role: "assistant",
        content: [{ type: "text", text }]
      } as LLMMessage));
    }
  }
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((i) => i.type.startsWith("image/"));
    if (imageItems.length) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const data = await toBase64(file);
        const previewUrl = URL.createObjectURL(file);
        setImages((prev) => [...prev, { previewUrl, mimeType: file.type, data }]);
      }
      return;
    }
    const fileItems = items.filter((i) => i.kind === "file" && !i.type.startsWith("image/"));
    if (fileItems.length) {
      e.preventDefault();
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
        setFiles((prev) => [...prev, { name: file.name, extension, path: file.path, isImage: false }]);
      }
      return;
    }
    const text = e.clipboardData.getData("text");
    if (text.length > 500) {
      e.preventDefault();
      setPastedTexts((prev) => [...prev, { name: `Pasted text (${prev.length + 1})`, content: text }]);
    }
  };

  // Reset helper — call this after every stream ends (done OR cancelled OR error)
  const resetStreamState = () => {
    setIsStreaming(false);
    setActiveTools({});
    setMcpStatus("");
    streamBuffer.current = "";
    botMessageAdded.current = false;
    // Always remove the listener
    cleanupRef.current?.();
    cleanupRef.current = null;
  };

  const handleSend = async () => {
    if (!input.trim() && !llmUploadResponse.length) return;
    if (isStreaming) return; // guard: don't allow send while streaming

    if (!chatMode) dispatch(changeChatMode(true));
    if (!activeSessionId) dispatch(newSession());

    const content: ContentPart[] = [];
    if (input.trim()) {
      content.push({ type: "text", text: input.trim() } as TextContent);
    }
    for (const response of llmUploadResponse) {
      if (response.isImage) {
        content.push({ type: "input_image", file_id: response.fileId } as ImageId);
      } else {
        content.push({
          type: "input_file",
          file_id: response.fileId,
          fileName: response.name,
          fileExtension: response.extension
        } as FileInput);
      }
    }

    const messageToSend: LLMMessage = { type: "message", role: "user", content };
    dispatch(appendCacheMessage([messageToSend]));

    // Reset BEFORE registering listener, so state is clean
    streamBuffer.current = "";
    botMessageAdded.current = false;
    setIsStreaming(true);
    setInput("");
    setImages([]);
    setLLMUploadResponse([]);
    setPastedTexts([]);
    setFiles([]);
    setStreamError(null);

    // Always remove any stale listener before registering a new one
    cleanupRef.current?.();
    cleanupRef.current = null;

    cleanupRef.current = window.electronAPI.onChunk((chunk: any) => {
      if (chunk.type === "error") {
        console.error("Stream error from main:", chunk.code, chunk.message);
        setStreamError(chunk.message);  // ← store error to display
        resetStreamState();
        return;
      }

      if (chunk.type === "function_call") {
        setActiveTools(prev => ({
          ...prev,
          [chunk.tool_call_id]: { name: chunk.name, args: "", done: false }
        }));
      }

      if (chunk.type === "function_call_args") {
        setActiveTools(prev => ({
          ...prev,
          [chunk.tool_call_id]: { ...prev[chunk.tool_call_id], args: chunk.args }
        }));
      }

      if (chunk.type === "function_call_output") {
        setActiveTools(prev => ({
          ...prev,
          [chunk.tool_call_id]: { ...prev[chunk.tool_call_id], done: true, result: chunk.output }
        }));
      }

      if (chunk.type === "session_title") {
        dispatch(updateSessionTitle({ sessionId: activeSessionId, title: chunk.title }));
      }

      if (chunk.content) {
        for (const c of chunk.content) {
          if (c.type === "output_text" || c.type === "text") {
            streamBuffer.current += c.text;
            updateBotMessage(streamBuffer.current);
          }
        }
      }

      if (chunk.isDone) {
        resetStreamState();
      }
    });

    // Fire and forget — no await, no try/catch needed here
    // errors come back as { type: "error" } chunks via onChunk
    window.electronAPI.sendMessage([messageToSend]);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // const cancelStream = () => {
  //   cleanupRef.current?.();
  //   cleanupRef.current = null;
  //   setIsStreaming(false);
  //   setMcpStatus("");
  // };

  const removeImage = (i: number) => setImages((p) => p.filter((_, idx) => idx !== i));
  const removePastedText = (i: number) => setPastedTexts((p) => p.filter((_, idx) => idx !== i));
  const removeFile = (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i));
  const fileAccumulator = (response: LLMFileUploadResponse) => {
    setLLMUploadResponse((p) => [...p, response]);
  };

  console.log("******************** Session Id ******************************");
  console.log(activeSessionId)
  console.log("*********************Session Id******************************")

  // ── render ─────────────────────────────────────────────────────────────────
  const cancelStream = async () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    await window.electronAPI.abortChat();
    setIsStreaming(false);
    setMcpStatus("");
    setActiveTools({});
  };
  return (
    <div className="chat_main">
      <div className="chat_sections">
        <SideDrawer />
        <div className="chat_plane">
          <div className="chat_topbar"><h4>Owl Bot</h4></div>

          <div className={chatMode ? "page" : ""} ref={pageRef}>
            <div className={`message_area ${cacheMessages.length > 2 ? "scrollable" : ""}`}>
              {cacheMessages.length === 0 && <div className="empty_state" />}

              {cacheMessages.map((msg: LLMMessage, i: number) => {
                const isLastUser =
                  msg.role === "user" &&
                  i === cacheMessages.findLastIndex((m: LLMMessage) => m.role === "user");

                if (msg.role === "user") {
                  return msg.content.map((m, j) => {
                    if (m.type === "input_file") {
                      return (
                        <div key={`${i}-${j}`} className="message user_message">
                          <SendFileAttachment fileName={(m as FileInput).fileName ?? ""} />
                        </div>
                      );
                    }
                    if (m.type === "text") {
                      return (
                        <div key={`${i}-${j}`} ref={isLastUser ? lastUserMsgRef : undefined}
                          className="message user_message">
                          {(m as TextContent).text}
                        </div>
                      );
                    }
                    return null;
                  })

                } else if (msg.role === "assistant") {
                  return msg.content.map((m, j) => {
                    if (m.type === "text") {
                      return <BotMessage key={`${i}-${j}`} text={(m as TextContent).text} />;
                    }
                    return null;
                  })
                }


              })}

              {/* ── thinking indicator ── */}
              {streamError && (
                <div className="message error_message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="#C0392B" strokeWidth="2"
                      strokeLinecap="round" />
                  </svg>
                  <span>{streamError}</span>
                </div>
              )}
              {isStreaming && streamBuffer.current === "" && Object.keys(activeTools).length === 0 && (
                <div className="thinking-bubble">
                  <div className="dot-trio">
                    <span /><span /><span />
                  </div>
                  <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)" }}>
                    Thinking…
                  </span>
                </div>
              )}

              {/* ── tool execution cards ── */}
              {Object.entries(activeTools).map(([callId, tool]) => (
                <div key={callId} className={`tool-card ${tool.done ? "done" : ""}`}>
                  <div className="tool-icon-wrap">
                    <div className="ring" />
                    <i
                      className={`ti ${tool.done ? "ti-check" : "ti-math-function"}`}
                      style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 15, color: tool.done ? "#0F6E56" : "#534AB7"
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{tool.name}</div>
                    <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
                      <div className="tool-status-dot" />
                      {tool.done ? `returned ${tool.result}` : "executing…"}
                    </div>
                    {tool.args && (
                      <div className="tool-args">
                        {tool.args}{tool.done ? ` → ${tool.result}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {mcpStatus && <div className="mcp_status">{mcpStatus}</div>}
              <div ref={bottomAnchorRef} />
            </div>
          </div>

          {/* ── input box ── */}
          <div className="chat_input_wrapper">
            {!chatMode && <div className="chat_welcom_message">Hello How Are You</div>}
            <div className="chat_input">
              {(images.length > 0 || pastedTexts.length > 0 || files.length > 0) && (
                <div className="attachment_pills">
                  {images.map((img, i) => (
                    <div key={`img-${i}`} className="pill image_pill">
                      <img src={img.previewUrl} alt="pasted" />
                      <button onClick={() => removeImage(i)}>×</button>
                    </div>
                  ))}
                  {pastedTexts.map((t, i) => (
                    <div key={`txt-${i}`} className="pill text_pill">
                      <span className="pill_label">{t.name}</span>
                      <span className="pill_badge">PASTED</span>
                      <button onClick={() => removePastedText(i)}>×</button>
                    </div>
                  ))}
                  {files.map((f, i) => (
                    <FileComponent
                      key={`file-${i}`}
                      file={f}
                      upload={true}
                      index={i}
                      fileIdAccumulator={fileAccumulator}
                      removeFile={() => removeFile(i)}
                    />
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={isStreaming}
              />

              <div className="chat_input_bottom">
                <div className="chat_input_bottom__dropdown_options">
                  <label style={{ cursor: "pointer" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" /><path d="M5 12h14" />
                    </svg>
                    <input
                      type="file"
                      style={{ display: "none" }}
                      accept="image/*,.docx,.pdf,.txt,.csv,.json"
                      multiple
                      onChange={async (e) => {
                        const picked = Array.from(e.target.files ?? []);
                        for (const file of picked) {
                          const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
                          setFiles((p) => [...p, {
                            name: file.name, extension,
                            path: file.path,
                            isImage: file.type.startsWith("image/")
                          }]);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="chat_input_bottom__functional_options">
                  {isStreaming ? (
                    <button className="stop_btn" onClick={cancelStream}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="5" y="5" width="14" height="14" rx="2" fill="white" />
                      </svg>
                    </button>
                  ) : (
                    <button className="send_btn" onClick={handleSend}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 19V5M5 12l7-7 7 7" stroke="white" strokeWidth="2.2"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};