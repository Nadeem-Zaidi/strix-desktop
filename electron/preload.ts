import { ipcRenderer, contextBridge } from 'electron'
import { LLMMessage } from './llm/llm_types_and_interfaces/types'

// existing ipcRenderer bridge — keep as is
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args
        return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },
})

contextBridge.exposeInMainWorld('electronAPI', {
    // Chat
    sendMessage: (messages: any[]) =>
        ipcRenderer.send("chat:send", messages),

    llmProvider: () =>
        ipcRenderer.invoke("llm:type"),  // fixed: was missing return

    onChunk: (callback: (chunk: any) => void) => {
        const handler = (_event: any, chunk: any) => callback(chunk);
        ipcRenderer.on("chat:chunk", handler);
        return () => ipcRenderer.removeListener("chat:chunk", handler);
    },

    uploadFile: (filePath: string) =>
        ipcRenderer.invoke("file:upload", filePath),

    // Session
    newSession: () =>
        ipcRenderer.invoke("session:new"),           // removed model param

    getCurrentSession: () =>
        ipcRenderer.invoke("session:getCurrent"),    // added

    switchSession: (id: string) =>
        ipcRenderer.invoke("session:switch", id),    // added

    listSessions: () =>
        ipcRenderer.invoke("session:list"),

    updateSessionTitle: (sessionId: string, title: string) =>
        ipcRenderer.invoke("session:updateTitle", sessionId, title),

    deleteSession: (sessionId: string) =>
        ipcRenderer.invoke("session:delete", sessionId),

    addMessage: (sessionId: string, message: LLMMessage) =>
        ipcRenderer.invoke("session:addMessage", sessionId, message),

    getMessages: (sessionId: string) =>
        ipcRenderer.invoke("session:getMessages", sessionId),

    readDirectory: (dirPath: string) => ipcRenderer.invoke("fe:read-dir", dirPath),
    getHomePath: () => ipcRenderer.invoke("fe:get-home"),

    ingestDocs: (docsDir: string) =>
        ipcRenderer.invoke("rag:ingest", docsDir),

    searchDocs: (query: string, topK?: number) =>
        ipcRenderer.invoke("rag:search", query, topK ?? 5),

    abortIngest: () =>
        ipcRenderer.invoke("rag:abort"),

    abortChat: () => ipcRenderer.invoke("chat:abort"),

    openFolder: () =>
        ipcRenderer.invoke("dialog:openFolder"),





})