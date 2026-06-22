// src/database/message_repository.ts

import { IDatabaseAdapter } from "./idatabase";
import { LLMMessage, ContentPart, TextContent } from "../llm/llm_types_and_interfaces/types";
import { createLogger } from "./logger/logger";
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);



const log = createLogger({ context: "message_repository" });
const Database = require('better-sqlite3');

type BetterSQLite = InstanceType<typeof Database>;

type SanitizeResult =
    | { ok: true; message: LLMMessage }
    | { ok: false; message: LLMMessage; reason: string };

export class MessageRepository {
    db: IDatabaseAdapter;
    constructor(db: IDatabaseAdapter) {
        this.db = db;
    }


    getRawDb():BetterSQLite {
        return this.db.getRawDb()
    }

    async getSessionMessages(sessionId: string): Promise<LLMMessage[]> {
        const result = await this.db.query(
            `SELECT * FROM chat_messages WHERE session_id=? ORDER BY id ASC`,
            [sessionId]
        );

        const messages: LLMMessage[] = [];
        let corruptCount = 0;

        for (const row of result.rows) {
            const sanitized = this.sanitizeRow(row, sessionId);
            if (!sanitized.ok) {
                corruptCount++;
                log.warn("corrupt row replaced with placeholder", {
                    sessionId,
                    rowId: row.id,
                    role: row.role,
                    reason: sanitized.reason,
                });
            }
            messages.push(sanitized.message);
        }

        if (corruptCount > 0) {
            log.warn("session had corrupt messages", {
                sessionId,
                corruptCount,
                total: result.rows.length,
            });
        }

        return messages;
    }

    async insertLLMMessage(sessionId: string, message: LLMMessage): Promise<void> {
        try {
            await this.db.query(
                `INSERT INTO chat_messages (session_id, type, role, content) VALUES (?,?,?,?)`,
                [sessionId, message.type, message.role, JSON.stringify(message.content)]
            );
        } catch (err) {
            log.error("failed to insert message", err, { sessionId, role: message.role });
        }
    }

    async insertTextMessage({ sessionId, type, role, content }: { sessionId: string, type: string, role: string, content: Record<string, any> }) {
        try {
            await this.db.query(`INSERT INTO chat_messages (session_id,type,role,content) VALUES(?,?,?,?)`, [sessionId, type, role, JSON.stringify([content])]);
        } catch (err) {
            log.error("failed to insert message", err, { sessionId: sessionId, type: type, role: role, content: content });
        }
    }

    async updateSessionTitle({ sessionId, newTitle }: { sessionId: string, newTitle: string }) {
        try {
            await this.db.query(`UPDATE sessions SET title=? WHERE id=?`, [newTitle, sessionId]);
        } catch (err) {
            log.error("failed to insert message", err, { sessionId: sessionId, newTitle: newTitle });
        }

    }

    async insertToolCall({ sessionId, type, role, toolCallId, toolName, args }: { sessionId: string, type: string, role: string, toolCallId: string, toolName: string, args: Record<string, any> | string }) {
        try {
            await this.db.query(`INSERT INTO chat_messages 
                (session_id,role,type,tool_call_id,name,arguments) VALUES (?,?,?,?,?,?)`, [sessionId, type, role, toolCallId, toolName, (typeof args === "string") ? args : JSON.stringify(args)]);

        } catch (err) {
            log.error("failed to insert message", err, { sessionId: sessionId, type: type, role: role, toolCallId: toolCallId, toolName: toolName, args: (typeof args === "string") ? args : JSON.stringify(args) });

        }
    }

    async insertToolResult({ sessionId, type, role, toolCallId, output }: { sessionId: string, type: string, role: string, toolCallId: string, output: Record<string, any> | string }) {
        try {
            await this.db.query(`INSERT INTO chat_messages 
                (session_id,role,type,tool_call_id,output) VALUES (?,?,?,?,?)`, [sessionId, type, role, toolCallId, (typeof output === "string") ? output : JSON.stringify(output)])

        } catch (err) {
            log.error("failed to insert message", err, { sessionId: sessionId, type: type, role: role, toolCallId: toolCallId, output: (typeof output === "string") ? output : JSON.stringify(output) });

        }
    }
    insertToolCallAndResult(params: {
        sessionId: string;
        toolCallId: string;
        toolName: string;
        args: string;
        output: string;
    }): void {
        const rawDb = this.getRawDb(); // ← get ONCE, outside transaction

        // Prepare OUTSIDE the transaction body (better-sqlite3 best practice)
        const insertCall = rawDb.prepare(`
        INSERT INTO chat_messages 
            (session_id, role, type, tool_call_id,name, arguments)
        VALUES 
            (@sessionId, 'tool_call', 'tool_call', @toolCallId, @toolName, @args)
    `);

        const insertResult = rawDb.prepare(`
        INSERT INTO chat_messages 
            (session_id, role, type, tool_call_id, output)
        VALUES 
            (@sessionId, 'tool_call_output', 'tool_call_output', @toolCallId, @output)
    `);

        // Transaction wraps only the .run() calls
        const tx = rawDb.transaction(() => {
            insertCall.run({
                sessionId: params.sessionId,
                toolCallId: params.toolCallId,
                toolName: params.toolName,
                args: params.args
            });

            insertResult.run({
                sessionId: params.sessionId,
                toolCallId: params.toolCallId,
                output: params.output
            });
        });

        tx(); // synchronous, throws if either insert fails → neither row written
    }


    private sanitizeRow(row: any, sessionId: string): SanitizeResult {
        if (!row.role) {
            return this.corrupt(row, "missing role",
                this.placeholderMessage("user", "message had no role"));
        }
        if (row.role === "tool_call") {
            return {
                ok: true,
                message: {
                    role: "tool_call",
                    type: "tool_call",
                    tool_call_id: row.tool_call_id,
                    name: row.name,
                    arguments: this.safeParseArgs(row.arguments, row.id, sessionId),
                } as LLMMessage,
            };
        }

        if (row.role === "tool_call_output") {
            return {
                ok: true,
                message: {
                    role: "tool_call_output",
                    type: "tool_call_output",
                    tool_call_id: row.tool_call_id,
                    output: row.output ?? "{}",
                } as LLMMessage,
            };
        }

        // Guard: content column unparseable
        let content: ContentPart[];
        try {
            const parsed = JSON.parse(row.content);
            if (!Array.isArray(parsed)) throw new Error("content is not an array");
            content = parsed;
        } catch (err) {
            const reason = `content JSON parse failed (row id=${row.id})`;
            return this.corrupt(row, reason,
                this.placeholderMessage(row.role, "message content was corrupted"));
        }

        // Guard: empty content
        if (content.length === 0) {
            return this.corrupt(row, "empty content array",
                this.placeholderMessage(row.role, "message was empty"));
        }

        const KNOWN_TYPES = ["text", "input_text", "output_text",
            "input_file", "input_base64_image", "input_url_image"];
        const badParts = content.filter((p) => !KNOWN_TYPES.includes(p?.type));
        if (badParts.length > 0) {
            content = content.filter((p) => KNOWN_TYPES.includes(p?.type));
            const reason = `unknown content types filtered: ${badParts.map(p => p?.type).join(", ")}`;
            if (content.length === 0) {
                return this.corrupt(row, reason,
                    this.placeholderMessage(row.role, "all content parts were unreadable"));
            }
            // Partial corruption — keep surviving parts, mark as not ok
            return this.corrupt(row, reason, {
                role: row.role,
                type: "message",
                content,
            } as LLMMessage);
        }

        return {
            ok: true,
            message: { role: row.role, type: "message", content } as LLMMessage,
        };
    }

    // ── Helpers ──

    private placeholderMessage(role: string, reason: string): LLMMessage {
        const textMap: Record<string, string> = {
            user: `[System notice: a previous message could not be loaded — ${reason}]`,
            assistant: `[Previous response unavailable — ${reason}]`,
            system: `[System notice: an instruction could not be loaded — ${reason}]`,
        };
        return {
            role: role as any,
            type: "message",
            content: [{ type: "text", text: textMap[role] ?? `[Unreadable message — ${reason}]` }],
        } as LLMMessage;
    }

    private corrupt(row: any, reason: string, message: LLMMessage): SanitizeResult {
        log.warn("sanitizing corrupt row", { rowId: row.id, role: row.role, reason });
        return { ok: false, reason, message };
    }

    private safeParseArgs(raw: string, rowId: number, sessionId: string): Record<string, any> {
        try {
            return JSON.parse(raw);
        } catch {
            log.warn("tool_call arguments JSON parse failed", { rowId, sessionId });
            return {};
        }
    }
}
