import { useRef, useState } from "react";
import "./ingest.css";

const FolderIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
);

const IndexIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
        <path d="M12 12v4M10 14l2 2 2-2"/>
    </svg>
);

const XIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

export function IngestPanel() {
    const [selectedDir, setSelectedDir] = useState("");
    const [status, setStatus] = useState<{
        type: "success" | "error" | "loading";
        msg: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const docsDirRef = useRef<string>("");

    const handlePickFolder = async () => {
        const dir = await window.electronAPI.openFolder();
        if (!dir) return;
        docsDirRef.current = dir;
        setSelectedDir(dir);
        setStatus(null);
    };

    const handleIngest = async () => {
        const docsDir = docsDirRef.current;
        if (!docsDir) {
            setStatus({ type: "error", msg: "Please select a folder first." });
            return;
        }

        setLoading(true);
        setStatus({ type: "loading", msg: "Indexing…" });

        try {
            const result = await window.electronAPI.ingestDocs(docsDir);
            if (result.success) {
                setStatus({ type: "success", msg: `${result.total} chunks indexed` });
            } else {
                setStatus({ type: "error", msg: result.error ?? "Indexing failed." });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus({ type: "error", msg });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        await window.electronAPI.abortIngest();
        setLoading(false);
        setStatus({ type: "error", msg: "Cancelled." });
    };

    const handleDismiss = () => setStatus(null);

    const folderName = selectedDir
        ? selectedDir.replace(/\\/g, "/").split("/").pop()
        : null;

    return (
        <div className="ip-root">
            <p className="ip-label">Knowledge base</p>

            <div className="ip-row">
                <button className="ip-pick" onClick={handlePickFolder} disabled={loading}>
                    <FolderIcon />
                    <span>{folderName ?? "Pick folder"}</span>
                </button>

                {loading ? (
                    <button
                        className="ip-cancel"
                        onClick={handleCancel}
                        title="Cancel indexing"
                    >
                        <XIcon />
                    </button>
                ) : (
                    <button
                        className="ip-index"
                        onClick={handleIngest}
                        disabled={!selectedDir}
                        title="Index documents into knowledge base"
                    >
                        <IndexIcon />
                    </button>
                )}
            </div>

            {selectedDir && (
                <p className="ip-path">{selectedDir}</p>
            )}

            {status && (
                <div className={`ip-status-row ${status.type}`}>
                    <p className="ip-status-msg">
                        {status.type === "loading" && <span className="ip-dot-spinner" />}
                        {status.msg}
                    </p>
                    {status.type !== "loading" && (
                        <button className="ip-dismiss" onClick={handleDismiss} title="Dismiss">
                            <XIcon />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
