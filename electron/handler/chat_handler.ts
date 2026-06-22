import { ipcMain, BrowserWindow } from "electron";
import { OpenAIProvider } from "../llm/adapters/openai_adapter";
import { LLMTool } from "../tools/tool_registry";
import { DatabaseManager } from "../database/database_manager";
import { AppState } from "../app_state/app_state";
import { DynamicToolLoader } from "../tools/dynamic_tool_loader";
import path from "path";
import { app } from "electron";

import { createSearchKnowledgeBaseTool } from "../tools/built_in/search";
import { getVectorStore } from "../bootstrap/bottstrap_db";
import { MessageRepository } from "../database/message_repository";
import { jiraStoryReader } from "../tools/built_in/jira_read_story";
import { jiraAddComment } from "../tools/built_in/jira_add_comment";
import * as dotenv from 'dotenv'
dotenv.config()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
let llm: OpenAIProvider | null = null;


let isStreaming = false;

export function registerChatHandlers(win: BrowserWindow) {
    const registry = new LLMTool();
    const toolsDir = path.join(app.getPath("home"), "strix-tools");
    const toolLoader = new DynamicToolLoader(toolsDir);
    const dbManager = DatabaseManager.getinstance();
    const messageRepository = new MessageRepository(dbManager.getConnection('sqllite'))
    registry.registerBuiltin(
        createSearchKnowledgeBaseTool(
            getVectorStore(),
            OPENAI_API_KEY ?? ""
        )
    );

    registry.registerBuiltin(jiraStoryReader())
    registry.registerBuiltin(jiraAddComment());



    // Load tools asynchronously
    (async () => {
        try {
            const initialTools = await toolLoader.loadAll();
            registry.registerDynamic(initialTools);
            console.log(
                JSON.stringify(
                    initialTools,
                    null,
                    2
                )
            );
            console.log("Loaded tools:", registry.getAll().map(t => t.name));

            // Initialize LLM
            llm = new OpenAIProvider(
                OPENAI_API_KEY??"",
                {
                    model: "gpt-4o-mini",
                    temperature: 0.7,
                    maxTokens: 1000,
                },
                registry,
                messageRepository,
                AppState.getInstance()
            );

            toolLoader.watch((updatedTools) => {
                registry.registerDynamic(updatedTools);
                win.webContents.send("tools:reloaded", {
                    tools: updatedTools.map((t) => ({
                        name: t.name,
                        description: t.description
                    })),
                });
            });
        } catch (error) {
            console.error("Failed to load tools:", error);
            win.webContents.send("tools:error", {
                message: "Failed to load tools. Check console for details."
            });
        }
    })();

    // // IPC Handlers
    // ipcMain.handle("chat:send", async (_event, messages) => {
    //     try {
    //         const stream = llm!.chatStream(messages);
    //         for await (const chunk of stream) {
    //             win.webContents.send("chat:chunk", chunk);
    //         }
    //     } catch (error) {
    //         console.error("Chat stream error:", error);
    //     }
    // });

    ipcMain.handle("file:upload", async (_event, filePath: string) => {
        try {
            return await llm?.fileUPload(filePath);
        } catch (error) {
            console.error("File upload error:", error);
            throw error;
        }
    });

    ipcMain.handle("llm:type", async (_event) => {
        return {
            llm_provider: llm?.getProvider(),
            llm_model: llm?.getModel()
        };
    });
    ipcMain.on("chat:send", async (_event, messages) => {
        if (isStreaming) {
            // Safety: shouldn't happen if renderer disables input while streaming,
            // but guard anyway
            win.webContents.send("chat:chunk", {
                type: "error",
                code: "busy",
                message: "A stream is already in progress."
            });
            return;
        }

        isStreaming = true;
        try {
            const stream = llm!.chatStream(messages);
            for await (const chunk of stream) {
                if (win.isDestroyed()) break;
                win.webContents.send("chat:chunk", chunk);
            }
        } catch (error) {
            console.error("Chat stream error:", error);
            win.webContents.send("chat:chunk", {
                type: "error",
                code: "unexpected",
                message: error instanceof Error ? error.message : "Stream failed"
            });
        } finally {
            isStreaming = false;
        }
    });

    ipcMain.handle("chat:abort", () => {
        llm?.abort();   // call whatever holds your provider
    });

    win.on('closed', () => {
        toolLoader.stopWatching();
    });
}