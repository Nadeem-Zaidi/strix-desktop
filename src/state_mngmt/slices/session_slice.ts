// store/slices/sessionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import { ContentPart, LLMMessage, Session } from "../../../electron/llm/llm_types_and_interfaces/types"


export const newSession = createAsyncThunk("session/new", () => window.electronAPI.newSession())
export const loadSessions = createAsyncThunk("session/loadAll", () => window.electronAPI.listSessions())
export const deleteSession = createAsyncThunk("session/delete", (id: string) => window.electronAPI.deleteSession(id).then(() => id))
export const loadMessages = createAsyncThunk("session/loadMessages", (id: string) => window.electronAPI.getMessages(id))
export const getCurrentSession = createAsyncThunk("session/getCurrent", () => window.electronAPI.getCurrentSession())
export const switchSession = createAsyncThunk("session/switch", (id: string) => window.electronAPI.switchSession(id).then(() => id))
export const addMessage = createAsyncThunk(
    "session/addMessage",
    ({ sessionId, message }: { sessionId: string; message: LLMMessage }) =>
        window.electronAPI.addMessage(sessionId, message)
)

interface SessionState {
    sessions: Session[]
    activeSessionId: string | null
    chatMessages: LLMMessage[]
    cacheChatMessages: LLMMessage[]
    status: "idle" | "loading" | "error"
}

const initialState: SessionState = {
    sessions: [],
    activeSessionId: null,
    chatMessages: [],
    cacheChatMessages: [],
    status: "idle"
}

const sessionSlice = createSlice({
    name: "session",
    initialState,
    reducers: {
        setActiveSession(state, action: PayloadAction<string>) {   // fixed: number
            state.activeSessionId = action.payload
        },
        updateSessionTitle(
            state,
            action: PayloadAction<{
                sessionId: string;
                title: string;
            }>
        ) {
            console.log("Hello man")
            console.log(action.payload)
            console.log("Hello man")
            const session = state.sessions.find(
                s => s.id === action.payload.sessionId
            );

            if (session) {
                session.title = action.payload.title;
            }
        },
        appendMessage(state, action: PayloadAction<LLMMessage>) {
            if (!state.activeSessionId) state.chatMessages = []
            state.chatMessages = [...state.chatMessages, action.payload]
        },

        appendCacheMessage(state, action: PayloadAction<LLMMessage[]>) {
            state.cacheChatMessages = [...state.cacheChatMessages, ...action.payload];
        },

        clearCacheMessage(state) {
            state.cacheChatMessages = [];

        },
        replaceLastMessage(state, action: PayloadAction<LLMMessage>) {
            if (state.cacheChatMessages.length === 0) return;
            state.cacheChatMessages[state.cacheChatMessages.length - 1] = action.payload;
        },
        setCacheMessages(state, action: PayloadAction<LLMMessage[]>) {
            state.cacheChatMessages = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder

            .addCase(newSession.fulfilled, (state, action) => {
                state.activeSessionId = action.payload
            })


            .addCase(getCurrentSession.fulfilled, (state, action) => {
                state.activeSessionId = action.payload
            })

            .addCase(switchSession.fulfilled, (state, action) => {
                state.activeSessionId = action.payload
            })
            .addCase(loadSessions.fulfilled, (state, action) => {
                state.sessions = action.payload
            })
            .addCase(deleteSession.fulfilled, (state, action) => {
                state.sessions = state.sessions.filter(s => s.id !== action.payload)
                if (state.activeSessionId === action.payload) {
                    state.activeSessionId = state.sessions[0]
                        ? state.sessions[0].id
                        : null
                }
            })

            .addCase(loadMessages.fulfilled, (state, action: PayloadAction<Array<Record<string, any>>>) => {
                if (state.activeSessionId) {
                    console.log(action.payload)
                    const storedMessages: LLMMessage[] | [] = action.payload.map((message) => {
                        switch (message.role) {
                            case "user":
                                return {
                                    role: "user",
                                    content: message.content as ContentPart[]
                                } as LLMMessage
                            case "assistant":
                                return {
                                    role: "assistant",
                                    content: message.content as ContentPart[]
                                } as LLMMessage
                            case "tool_call":
                                return {
                                    role: "tool_call",
                                    name: message.name,
                                    arguments: message.arguments
                                        ? message.arguments  // parse if stored as JSON string
                                        : {},
                                    tool_call_id: message.tool_call_id
                                } as LLMMessage

                            case "tool_call_output":
                                return {
                                    role: "tool",
                                    tool_call_id: message.tool_call_id,
                                    output: message.output ?? ""  // guard against null
                                } as LLMMessage
                            default:
                                throw new Error(
                                    `Unsupported content type:`
                                );
                        }
                    })
                    state.chatMessages = [...state.chatMessages, ...storedMessages]
                    state.cacheChatMessages = [...storedMessages];
                }
            })

            .addCase(loadSessions.pending, (state) => { state.status = "loading" })
            .addCase(loadSessions.rejected, (state) => { state.status = "error" })
    }
})

export const { setActiveSession, appendMessage, appendCacheMessage, clearCacheMessage, replaceLastMessage, setCacheMessages,updateSessionTitle } = sessionSlice.actions
export default sessionSlice.reducer