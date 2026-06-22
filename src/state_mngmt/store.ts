import { configureStore } from "@reduxjs/toolkit";
import chatModeReducer from "./slices/chat_mode_slice";
import sideBarReducer from "./slices/toggle_sidebar";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import session from "./slices/session_slice";


export const store = configureStore({
  reducer: {
    chatMode: chatModeReducer,
    sideBar: sideBarReducer,
    session: session,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;