import { dialog, ipcMain } from "electron";
import { Ingester } from "../vector_store/ingestor";
import { getVectorStore } from "../bootstrap/bottstrap_db";
import { Embedder } from "../embedder/embedder";
import * as dotenv from 'dotenv'
dotenv.config()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
let activeIngester: Ingester | null = null;

export function registerRagHandlers() {
    ipcMain.handle("dialog:openFolder", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory"]
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.handle("rag:ingest", async (_event, docsDir: string) => {
        if (activeIngester) activeIngester.abort();

        const vectorStore = getVectorStore();
        
        activeIngester = new Ingester(vectorStore, OPENAI_API_KEY??"");

        try {
            const result = await activeIngester.ingest(docsDir);
            return { success: true, total: result.total };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            activeIngester = null;
        }
    });

    ipcMain.handle("rag:search", async (_event, query: string, topK = 5) => {
        const vectorStore = getVectorStore();
        const embedder = new Embedder(process.env.OPENAI_API_KEY ?? "");
        const queryEmbedding = await embedder.embedText(query);
        return vectorStore.search(queryEmbedding, topK);
    });

    ipcMain.handle("rag:abort", () => {
        activeIngester?.abort();
        activeIngester = null;
    });
}