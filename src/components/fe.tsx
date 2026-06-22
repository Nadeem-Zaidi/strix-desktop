import { useEffect, useState, useCallback } from "react";
import "./fe.css"

// ── Types ──────────────────────────────────────────────────────────────────
type FileEntry = {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modifiedAt?: string;
    ext?: string;
};

type ViewMode = "grid" | "list";

type BreadcrumbPart = { name: string; path: string };

// ── Helpers ────────────────────────────────────────────────────────────────
function formatSize(bytes?: number): string {
    if (bytes === undefined) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function getExt(name: string): string {
    return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
}

// File type → colour token
function extColor(ext: string): string {
    const map: Record<string, string> = {
        pdf: "#e05252", docx: "#3b82f6", doc: "#3b82f6",
        xlsx: "#22c55e", csv: "#22c55e",
        png: "#a855f7", jpg: "#a855f7", jpeg: "#a855f7", gif: "#a855f7", webp: "#a855f7",
        mp4: "#f59e0b", mov: "#f59e0b", avi: "#f59e0b",
        mp3: "#ec4899", wav: "#ec4899",
        zip: "#78716c", rar: "#78716c", "7z": "#78716c",
        js: "#eab308", ts: "#3b82f6", tsx: "#38bdf8", jsx: "#38bdf8",
        json: "#f97316", txt: "#94a3b8", md: "#94a3b8",
        py: "#22d3ee", sql: "#a78bfa",
    };
    return map[ext] ?? "#94a3b8";
}

function extBg(ext: string): string {
    const c = extColor(ext);
    return c + "18"; // 10% opacity hex
}

// File icon (emoji-free, text-based monogram)
function FileIcon({ entry }: { entry: FileEntry }) {
    if (entry.isDirectory) {
        return (
            <div className="fe-icon fe-icon--folder">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
                        fill="currentColor" />
                </svg>
            </div>
        );
    }
    const ext = entry.ext ?? "";
    return (
        <div
            className="fe-icon fe-icon--file"
            style={{ background: extBg(ext), color: extColor(ext) }}
        >
            <span className="fe-icon__label">
                {ext ? ext.slice(0, 3).toUpperCase() : "FILE"}
            </span>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export const FE = () => {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbPart[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");

    // ── IPC bridge — adjust to your actual electronAPI shape ──────────────
    const readDir = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        setSelected(null);
        try {
            // Replace with your actual IPC call, e.g.:
            // const result = await window.electronAPI.readDirectory(path);
            // For now we use a mock so the component renders in isolation:
            const result = await (window as any).electronAPI?.readDirectory(path)
                ?? mockFs(path);
            setEntries(result.entries.map((e: any) => ({
                ...e,
                ext: e.isDirectory ? "" : getExt(e.name),
            })));
            setBreadcrumbs(result.breadcrumbs);
            setCurrentPath(path);
        } catch (err: any) {
            setError(err.message ?? "Could not read directory");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Start from home dir; electronAPI.getHomePath() or hardcode
        const homePath = (window as any).electronAPI?.getHomePath?.() ?? "C:\\Users";
        readDir(homePath);
    }, [readDir]);

    // ── Sorting + filtering ────────────────────────────────────────────────
    const filtered = entries
        .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            // Folders first
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "size") return (a.size ?? 0) - (b.size ?? 0);
            if (sortBy === "date") return (a.modifiedAt ?? "").localeCompare(b.modifiedAt ?? "");
            return 0;
        });

    const handleClick = (entry: FileEntry) => {
        if (entry.isDirectory) {
            readDir(entry.path);
        } else {
            setSelected(prev => prev === entry.path ? null : entry.path);
        }
    };

    const handleBack = () => {
        if (breadcrumbs.length > 1) {
            readDir(breadcrumbs[breadcrumbs.length - 2].path);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="fe-root">
            {/* ── Topbar ── */}
            <div className="fe-topbar">
                <div className="fe-topbar__left">
                    <button
                        className="fe-btn fe-btn--icon"
                        onClick={handleBack}
                        disabled={breadcrumbs.length <= 1}
                        title="Go back"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* Breadcrumbs */}
                    <nav className="fe-breadcrumb">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={crumb.path} className="fe-breadcrumb__item">
                                {i > 0 && <span className="fe-breadcrumb__sep">/</span>}
                                <button
                                    className={`fe-breadcrumb__btn ${i === breadcrumbs.length - 1 ? "active" : ""}`}
                                    onClick={() => readDir(crumb.path)}
                                >
                                    {crumb.name}
                                </button>
                            </span>
                        ))}
                    </nav>
                </div>

                <div className="fe-topbar__right">
                    {/* Search */}
                    <div className="fe-search">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="fe-search__icon">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Filter files…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="fe-search__input"
                        />
                        {search && (
                            <button className="fe-search__clear" onClick={() => setSearch("")}>×</button>
                        )}
                    </div>

                    {/* Sort */}
                    <select
                        className="fe-select"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                    >
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="date">Date</option>
                    </select>

                    {/* View toggle */}
                    <div className="fe-view-toggle">
                        <button
                            className={`fe-btn fe-btn--icon ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                            title="Grid view"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                        </button>
                        <button
                            className={`fe-btn fe-btn--icon ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                            title="List view"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats bar ── */}
            <div className="fe-statsbar">
                <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
                <span>{filtered.filter(e => e.isDirectory).length} folders</span>
                <span>{filtered.filter(e => !e.isDirectory).length} files</span>
            </div>

            {/* ── Content ── */}
            <div className="fe-content">
                {loading && (
                    <div className="fe-state">
                        <div className="fe-spinner" />
                        <span>Loading…</span>
                    </div>
                )}

                {error && (
                    <div className="fe-state fe-state--error">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="fe-state">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
                                stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>{search ? "No files match your filter" : "This folder is empty"}</span>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    viewMode === "grid"
                        ? <GridView entries={filtered} selected={selected} onClick={handleClick} />
                        : <ListView entries={filtered} selected={selected} onClick={handleClick} />
                )}
            </div>
        </div>
    );
};

// ── Grid View ──────────────────────────────────────────────────────────────
function GridView({ entries, selected, onClick }: {
    entries: FileEntry[];
    selected: string | null;
    onClick: (e: FileEntry) => void;
}) {
    return (
        <div className="fe-grid">
            {entries.map(entry => (
                <div
                    key={entry.path}
                    className={`fe-grid__item ${selected === entry.path ? "selected" : ""}`}
                    onClick={() => onClick(entry)}
                    title={entry.name}
                >
                    <FileIcon entry={entry} />
                    <span className="fe-grid__name">{entry.name}</span>
                    {!entry.isDirectory && (
                        <span className="fe-grid__meta">{formatSize(entry.size)}</span>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── List View ──────────────────────────────────────────────────────────────
function ListView({ entries, selected, onClick }: {
    entries: FileEntry[];
    selected: string | null;
    onClick: (e: FileEntry) => void;
}) {
    return (
        <div className="fe-list">
            <div className="fe-list__header">
                <span className="fe-list__col fe-list__col--name">Name</span>
                <span className="fe-list__col fe-list__col--size">Size</span>
                <span className="fe-list__col fe-list__col--date">Modified</span>
            </div>
            {entries.map(entry => (
                <div
                    key={entry.path}
                    className={`fe-list__row ${selected === entry.path ? "selected" : ""}`}
                    onClick={() => onClick(entry)}
                >
                    <span className="fe-list__col fe-list__col--name">
                        <FileIcon entry={entry} />
                        <span className="fe-list__name">{entry.name}</span>
                    </span>
                    <span className="fe-list__col fe-list__col--size">
                        {entry.isDirectory ? "—" : formatSize(entry.size)}
                    </span>
                    <span className="fe-list__col fe-list__col--date">
                        {formatDate(entry.modifiedAt)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Mock data (remove once IPC is wired) ──────────────────────────────────
function mockFs(path: string) {
    return {
        breadcrumbs: [
            { name: "Home", path: "C:\\Users" },
            { name: "Documents", path: "C:\\Users\\Documents" },
        ],
        entries: [
            { name: "Projects", path: path + "\\Projects", isDirectory: true, modifiedAt: "2025-05-01" },
            { name: "Downloads", path: path + "\\Downloads", isDirectory: true, modifiedAt: "2025-06-10" },
            { name: "Notes", path: path + "\\Notes", isDirectory: true, modifiedAt: "2025-04-20" },
            { name: "report_q2.pdf", path: path + "\\report_q2.pdf", isDirectory: false, size: 2048000, modifiedAt: "2025-06-01" },
            { name: "budget.xlsx", path: path + "\\budget.xlsx", isDirectory: false, size: 512000, modifiedAt: "2025-05-28" },
            { name: "README.md", path: path + "\\README.md", isDirectory: false, size: 4200, modifiedAt: "2025-06-15" },
            { name: "index.ts", path: path + "\\index.ts", isDirectory: false, size: 8800, modifiedAt: "2025-06-18" },
            { name: "schema.sql", path: path + "\\schema.sql", isDirectory: false, size: 14200, modifiedAt: "2025-06-12" },
            { name: "photo.jpg", path: path + "\\photo.jpg", isDirectory: false, size: 3200000, modifiedAt: "2025-05-10" },
            { name: "data.json", path: path + "\\data.json", isDirectory: false, size: 92000, modifiedAt: "2025-06-17" },
        ]
    };
}
