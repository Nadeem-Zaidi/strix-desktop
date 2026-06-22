import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import os from "os";

export function registerFileExplorerHandlers() {

    ipcMain.handle("fe:get-home", () => os.homedir());

    ipcMain.handle("fe:read-dir", async (_event, dirPath: string) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        const result = entries.map((dirent) => {
            const fullPath = path.join(dirPath, dirent.name);
            let size: number | undefined;
            let modifiedAt: string | undefined;
            try {
                const stat = fs.statSync(fullPath);
                size = dirent.isDirectory() ? undefined : stat.size;
                modifiedAt = stat.mtime.toISOString();
            } catch { /* permission denied */ }

            return {
                name: dirent.name,
                path: fullPath,
                isDirectory: dirent.isDirectory(),
                size,
                modifiedAt,
            };
        });

        const parts = dirPath.replace(/\\/g, "/").split("/").filter(Boolean);
        const breadcrumbs = parts.map((part, i) => ({
            name: part,
            path: parts.slice(0, i + 1).join(path.sep) + path.sep,
        }));

        if (breadcrumbs.length > 0 && !breadcrumbs[0].path.endsWith(path.sep)) {
            breadcrumbs[0].path = breadcrumbs[0].path + path.sep;
        }

        return { entries: result, breadcrumbs };
    });
}