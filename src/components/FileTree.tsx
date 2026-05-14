import { useEffect, useState, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { readDir, watch } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react'
import { useProjectDetailStore } from '@/store/useProjectDetailStore'
import type { FileTreeNode } from '@/bom/graph'

// ============================================================
// Types
// ============================================================

type ReadDirFn = (path: string) => Promise<{ name: string; isDirectory: boolean; isSymlink: boolean }[]>
type JoinFn = (...paths: string[]) => Promise<string>
type NavigateFn = (graphId: string) => void

export type FileTreeProps = {
    projectRootPath?: string
    projectId?: string
    /** graphs/*.json 選択時のナビゲーション（省略時は router.navigate にフォールバック） */
    onNavigate?: NavigateFn
    onReadDir?: ReadDirFn
    onJoin?: JoinFn
}

// ============================================================
// Utilities
// ============================================================

const loadTree = async (
    dirPath: string,
    onReadDir: ReadDirFn,
    onJoin: JoinFn,
): Promise<FileTreeNode[]> => {
    const entries = await onReadDir(dirPath)

    const nodes = await Promise.all(
        entries.map(async (entry): Promise<FileTreeNode> => {
            const entryPath = await onJoin(dirPath, entry.name)

            if (entry.isDirectory && !entry.isSymlink) {
                const children = await loadTree(entryPath, onReadDir, onJoin)
                return { name: entry.name, path: entryPath, isDir: true, children }
            }

            return { name: entry.name, path: entryPath, isDir: false }
        })
    )

    return nodes
        .filter((node) => node.name !== '')
        .sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
            return a.name.localeCompare(b.name)
        })
}

const isGraphJson = (path: string): boolean =>
    /[\\/]graphs[\\/][^/\\]+\.json$/.test(path)

const toGraphId = (path: string): string =>
    path.split(/[\\/]/).pop()?.replace(/\.json$/, '') ?? ''

// ============================================================
// TreeItem
// ============================================================

type TreeItemProps = {
    node: FileTreeNode
    depth: number
    selectedPath: string | null
    expandedDirs: Set<string>
    onToggleDir: (path: string) => void
    onSelectFile: (path: string) => void
}

const TreeItem = ({
    node,
    depth,
    selectedPath,
    expandedDirs,
    onToggleDir,
    onSelectFile,
}: TreeItemProps) => {
    const isExpanded = expandedDirs.has(node.path)
    const isSelected = selectedPath === node.path
    const indentPx = depth * 12

    if (node.isDir) {
        return (
            <>
                <div
                    role="button"
                    tabIndex={0}
                    className={[
                        'flex items-center gap-1.5 px-2 py-0.75 rounded-sm cursor-pointer select-none',
                        'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]',
                        'transition-colors duration-100',
                    ].join(' ')}
                    style={{ paddingLeft: `${8 + indentPx}px` }}
                    onClick={() => onToggleDir(node.path)}
                    onKeyDown={(e) => e.key === 'Enter' && onToggleDir(node.path)}
                >
                    <span className="shrink-0 w-3 h-3 text-[--muted-foreground]">
                        {isExpanded
                            ? <ChevronDown size={12} />
                            : <ChevronRight size={12} />}
                    </span>
                    <span className="shrink-0 w-3.5 h-3.5">
                        {isExpanded
                            ? <FolderOpen size={14} className="text-[--primary]" />
                            : <Folder size={14} className="text-[--muted-foreground]" />}
                    </span>
                    <span className="truncate">{node.name}</span>
                </div>
                {isExpanded && node.children?.map((child) => (
                    <TreeItem
                        key={child.path}
                        node={child}
                        depth={depth + 1}
                        selectedPath={selectedPath}
                        expandedDirs={expandedDirs}
                        onToggleDir={onToggleDir}
                        onSelectFile={onSelectFile}
                    />
                ))}
            </>
        )
    }

    return (
        <div
            role="button"
            tabIndex={0}
            className={[
                'flex items-center gap-1.5 px-2 py-0.75 rounded-sm cursor-pointer select-none',
                'transition-colors duration-100',
                isSelected
                    ? 'bg-[--primary-glow] text-[--primary-foreground]'
                    : 'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]',
            ].join(' ')}
            style={{ paddingLeft: `${8 + indentPx}px` }}
            onClick={() => onSelectFile(node.path)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFile(node.path)}
        >
            <span className="shrink-0 w-3 h-3" />
            <span className="shrink-0 w-3.5 h-3.5">
                <FileText size={14} className={isSelected ? 'text-[--primary]' : 'text-[--muted-foreground]'} />
            </span>
            <span className="truncate">{node.name}</span>
        </div>
    )
}

// ============================================================
// FileTree
// ============================================================

/**
 * @context  CTX-1 / FileTree
 * @bom      docs/bom/graph.ts (FileTreeNode, ProjectDetailStore)
 *
 * projectRootPath を useProjectDetailStore から取得し、
 * マウント時に onReadDir を再帰呼び出しでツリーを構築する。
 * graphs/ 配下の .json 選択時は onNavigate を呼ぶ。
 *
 * props DI: onReadDir / onJoin / projectRootPath / projectId / onNavigate を props で受け取る。
 * 省略時は Tauri fs 実装・useRouter にフォールバックする。
 */
export const FileTree = ({
    projectRootPath: rootPathProp,
    projectId: projectIdProp,
    onNavigate,
    onReadDir = readDir as unknown as ReadDirFn,
    onJoin = join,
}: FileTreeProps = {}) => {
    const router = useRouter()
    const storeRootPath = useProjectDetailStore((s) => s.projectRootPath)

    const projectRootPath = rootPathProp ?? storeRootPath

    const navigate = onNavigate ?? ((graphId: string) => {
        router.navigate({
            to: '/projects/$id',
            params: { id: projectIdProp ?? '' },
            search: { graph: graphId },
        })
    })

    const [tree, setTree] = useState<FileTreeNode[]>([])
    const [selectedPath, setSelectedPath] = useState<string | null>(null)
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!projectRootPath) return

        let cancelled = false
        let unwatch: (() => void) | null = null

        const refresh = () => {
            if (cancelled) return
            setIsLoading(true)
            setError(null)

            loadTree(projectRootPath, onReadDir, onJoin)
                .then((nodes) => {
                    if (!cancelled) {
                        setTree(nodes)
                        setIsLoading(false)
                    }
                })
                .catch((err) => {
                    if (!cancelled) {
                        setError(String(err))
                        setIsLoading(false)
                    }
                })
        }

        // 初回ロード
        refresh()

        // ファイルシステム監視
        watch(projectRootPath, () => refresh(), { recursive: true })
            .then((unwatchFn) => {
                if (cancelled) {
                    unwatchFn()
                } else {
                    unwatch = unwatchFn
                }
            })
            .catch((err) => {
                console.error('watch error:', err)
            })

        return () => {
            cancelled = true
            unwatch?.()
        }
    }, [projectRootPath, onReadDir, onJoin])

    const handleToggleDir = useCallback((path: string) => {
        setExpandedDirs((prev) => {
            const next = new Set(prev)
            next.has(path) ? next.delete(path) : next.add(path)
            return next
        })
    }, [])

    const handleSelectFile = useCallback((path: string) => {
        setSelectedPath(path)
        if (isGraphJson(path)) {
            navigate(toGraphId(path))
        }
    }, [navigate])

    return (
        <nav
            data-testid="file-tree"
            className="flex flex-col h-full overflow-hidden border-r border-[--border]"
            style={{ width: 'var(--pane-file-tree-width)' }}
        >
            <div className="flex items-center px-3 h-9 shrink-0 border-b border-[--border]">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    Files
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
                {isLoading && (
                    <p className="px-3 py-2 text-xs text-[--muted-foreground]">Loading…</p>
                )}
                {error && (
                    <p className="px-3 py-2 text-xs text-[--primary]">{error}</p>
                )}
                {!isLoading && !error && tree.map((node) => (
                    <TreeItem
                        key={node.path}
                        node={node}
                        depth={0}
                        selectedPath={selectedPath}
                        expandedDirs={expandedDirs}
                        onToggleDir={handleToggleDir}
                        onSelectFile={handleSelectFile}
                    />
                ))}
            </div>
        </nav>
    )
}