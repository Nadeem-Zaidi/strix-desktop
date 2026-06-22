import { ILLM } from "../llm/llm_types_and_interfaces/types";
import { SessionRepository } from "../session/session_repository";


export class AppState {
    private static instance: AppState;
    private _currentSessionId: string | null = null;
    private sessionRepo: SessionRepository;
    public activeLLM: ILLM | null = null; 
    private constructor() {
        this.sessionRepo = new SessionRepository();
    }

    static getInstance() {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }
        return AppState.instance;
    }

    get currentSessionId(): string | null {
        return this._currentSessionId;
    }

    set currentSessionId(session_id: string) {
        this._currentSessionId = session_id;

    }

    async createNewSession() {
        const session = await this.sessionRepo.newSession();
        this._currentSessionId = session.id;
        return this._currentSessionId;

    }

    async switchSession(id: string) {
        const session = await this.sessionRepo.getSession(id);
        if (!session) throw new Error(`Session ${id} not found`);
        this._currentSessionId = session.id;


    }

    clearSession(): void {
        this._currentSessionId = null;
    }
}