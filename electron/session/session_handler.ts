import { ipcMain } from "electron";
import { SessionRepository } from "./session_repository";
import { LLMMessage } from "../llm/llm_types_and_interfaces/types";
import { AppState } from "../app_state/app_state";

export function registerSessionHandlers() {
  const repo = new SessionRepository();

  // creates new session + updates AppState globally
  ipcMain.handle('session:new', () => {
    return AppState.getInstance().createNewSession();
  });

  // returns current session id from AppState
  ipcMain.handle('session:getCurrent', () => {
    return AppState.getInstance().currentSessionId;
  });

  // switches active session in AppState
  ipcMain.handle('session:switch', (_, id: string) => {
    AppState.getInstance().switchSession(id);
    return true;
  });

  ipcMain.handle('session:list', () => {
    return repo.getSessions();
  });

  ipcMain.handle('session:updateTitle', (_, sessionId: string, title: string) => {
    return repo.updateSessionTitle(sessionId, title);
  });

  ipcMain.handle('session:delete', (_, sessionId: string) => {
    return repo.deleteSession(sessionId);
  });

  ipcMain.handle('session:addMessage', (_, sessionId: string, message: LLMMessage) => {
    return repo.addMessage(sessionId, message);
  });

  ipcMain.handle('session:getMessages', (_, sessionId: string) => {
    return repo.getMessages(sessionId);
  });
}