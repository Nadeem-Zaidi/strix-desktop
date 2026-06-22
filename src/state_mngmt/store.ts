import { configureStore } from "@reduxjs/toolkit";
import chatModeReducer from "./slices/chat_mode_slice";
import sideBarReducer from "./slices/toggle_sidebar";
import authenticationReducer from "./slices/authentication_slice";

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

import folderCreationReducer from "./slices/create_folder";
import selectItemReducer from "./slices/select_item_slice";
import session from "./slices/session_slice";
import sessionTitle from "./slices/session_title";

export const store = configureStore({
  reducer: {
    chatMode: chatModeReducer,
    sideBar: sideBarReducer,
    authentication: authenticationReducer,
    session: session,
    sessionTitle: sessionTitle,
    folderCreation: folderCreationReducer,
    selectItems: selectItemReducer,


  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;