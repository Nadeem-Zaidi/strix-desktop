import { ContentPart, LLMMessage, Session } from "../llm/llm_types_and_interfaces/types";
import { DatabaseManager } from "../database/database_manager";
import { IDatabaseAdapter } from "../database/idatabase";
import { randomUUID } from "crypto";

export class SessionRepository {
    db: IDatabaseAdapter;

    constructor() {
        this.db = DatabaseManager.getinstance().getConnection("sqllite");
    }

    async chat_mode(){
        const result=await this.db.query(`SELECT * FROM chat_mode`);
        return result.rows[0];
    }

    async new_chat(chat_mode:number,sessionid:string){
        await this.db.query(`UPDATE chat_mode SET chat_mode=? ,sessionid=? WHERE id=? `,[chat_mode,sessionid,1 ]);
       
        
    }

    async newSession(model?: string) {
        const session = {
            id: randomUUID(),
            title: "new_chat",
            model: model
        }

        await this.db.query(`INSERT INTO sessions (id,title,model) VALUES (?,?,?)`, [session.id, session.title, session.model]);

        const result = await this.db.query<Session>(`SELECT * FROM sessions WHERE id=?`, [session.id]);
        return result.rows[0];

    }

    async getSessions(): Promise<Session[]> {
        const results = await this.db.query(`SELECT * FROM sessions ORDER BY updated_at desc`);
        return results.rows;
    }

    async getSession(id:string):Promise<Session>{
        const result=await this.db.query(`SELECT * FROM sessions where id=?`,[id])
        console.log(result.rows[0]);
        return result.rows[0];
    }

    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
        await this.db.query(
            `UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [title, sessionId]
        );
    }

    async deleteSession(sessionId: string): Promise<void> {
        // chat_messages deleted automatically via ON DELETE CASCADE
        await this.db.query(
            `DELETE FROM sessions WHERE id = ?`,
            [sessionId]
        );
    }

    async addMessage(sessionId: string, message: LLMMessage) {
        await this.db.query(`INSERT INTO chat_messages (session_id,role,type,content) VALUES (?,?,?,?)`, [sessionId, message.role, message.type??"user", JSON.stringify(message.content)]);

    }

    async getMessages(sessionId: string): Promise<LLMMessage[]> {
        const result = await this.db.query<any>(
            `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
            [sessionId]
        );
        return result.rows.map((row: any) => ({
            ...row,
            content: row.content ? JSON.parse(row.content) : []
        }));
    }



}