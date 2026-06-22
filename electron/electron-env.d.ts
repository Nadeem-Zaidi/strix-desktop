/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer
}

interface Window {
  electronAPI: {
    sendMessage: (messages: any[]) => Promise<void>;
    onChunk: (callback: (chunk: any) => void) => () => void;
    uploadFile: (filePath: string) => Promise<any>;
    llmProvider: () => Record<string, string>;

    newSession: () => Promise<string>;
    getCurrentSession: () => Promise<string | null>;
    switchSession: (id: string) => Promise<boolean>;
    listSessions: () => Promise<Session[]>;
    updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    addMessage: (sessionId: string, message: LLMMessage) => Promise<void>;
    getMessages: (sessionId: string) => Promise<LLMMessage[]>;
    ingestDocs(docsDir: string): Promise<any>;
    searchDocs(query: string, topK?: number): Promise<any>;
    abortIngest(): Promise<void>;
    openFolder(): Promise<string | null>;
    abortChat(): Promise<void>;  // ← add this
  }
}