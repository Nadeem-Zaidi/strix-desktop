import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { Message, Session } from "../../types_and_interfaces/types";

interface SessionState {
    sessions: Session[]
    currentSessionId: string | null
    sessionmessages: Message[],
    sessionList: string[];
    loading: boolean
    error: string | null
}

const initialState: SessionState = {
    sessions: [],
    currentSessionId: sessionStorage.getItem("currentSessionId"),
    sessionmessages: [],
    sessionList: [],
    loading: false,
    error: null,
}






const saveSessionId = (id: string | null) => {
    if (id) sessionStorage.setItem("currentSessionId", id);
    else sessionStorage.removeItem("currentSessionId");
}

export const sessionSlice = createSlice({
    name: 'sessionmessage',
    initialState,
    reducers: {
        setCurrentSession: (state, action: PayloadAction<string | null>) => {
            state.currentSessionId = action.payload
            saveSessionId(action.payload)
        },
        clearMessages: (state) => {
            state.sessionmessages = []
        },
        addSession: (state, action: PayloadAction<{ id: string; title: string, last_message: string | null, updated_at: string }>) => {
            // Only add if it doesn't already exist (e.g. user sent sessionId that was already loaded)
            const exists = state.sessions.some(s => s.id === action.payload.id);
            if (!exists) {
                state.sessions = [action.payload as unknown as Session, ...state.sessions];
            }
        },
        updateSessionTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
            const session = state.sessions.find(s => s.id === action.payload.id);
            if (session) {
                session.title = action.payload.title;
            }
        }
    },
})

export const { setCurrentSession, addSession, clearMessages, updateSessionTitle } = sessionSlice.actions
export default sessionSlice.reducer