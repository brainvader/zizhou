import { useEffect, useRef, useState, useCallback } from 'react'
import { readDir } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import type { FsEntry, ReadDirFn, FileTreeProps } from '@/bom/file-tree'

// ============================================================
// デフォルト実装
// ============================================================

/**
 * @tauri-apps/plugin-fs の readDir をラップする。
 * path: 絶対パス。返す FsEntry の path も絶対パスにする。
 */
const defaultReadDir: ReadDirFn = async (path: string): Promise<FsEntry[]> => {
    const entries = await readDir(path)
    return entries.map((e) => ({
        name: e.name ?? '',
        path: `${path}/${e.name ?? ''}`,
        isDirectory: e.isDirectory ?? false,
    }))
}

// ============================================================
// FsEntryNode — 1エントリを再帰描画するサブコンポーネント
// ============================================================

type FsEntryNodeProps = {
    entry: FsEntry
    depth: number
    onReadDir: ReadDirFn
}

const FsEntryNode = ({ entry, depth, onReadDir }: FsEntryNodeProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [children, setChildren] = useState<FsEntry[] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // onReadDir は毎レンダーで参照が変わりうるので ref で保持
    const onReadDirRef = useRef(onReadDir)
    useEffect(() => { onReadDirRef.current = onReadDir }, [onReadDir])

    const handleClick = useCallback(async () => {
        if (!entry.isDirectory) return

        if (isExpanded) {
            setIsExpanded(false)
            return
        }

        if (children === null) {
            setIsLoading(true)
            try {
                // entry.path は絶対パス
                const result = await onReadDirRef.current(entry.path)
                setChildren(result)
            } catch {
                toast.error('ディレクトリの読み込みに失敗しました')
                setChildren([])
            } finally {
                setIsLoading(false)
            }
        }

        setIsExpanded(true)
    }, [entry.isDirectory, entry.path, isExpanded, children])

    const indent = depth * 12

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                data-testid={`fs-entry-${entry.name}`}
                style={{ paddingLeft: `${12 + indent}px` }}
                className={[
                    'flex items-center gap-1.5 py-1 pr-3 rounded-sm select-none',
                    'text-[11px] font-light transition-colors duration-100',
                    entry.isDirectory
                        ? 'cursor-pointer text-[--foreground] hover:bg-[--muted]'
                        : 'cursor-default text-[--muted-foreground]',
                ].join(' ')}
                onClick={handleClick}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            >
                <span className="text-[10px] w-3 text-center shrink-0">
                    {entry.isDirectory
                        ? isLoading ? '…' : isExpanded ? '▼' : '▶'
                        : '◦'}
                </span>
                <span className="truncate">{entry.name}</span>
            </div>

            {entry.isDirectory && isExpanded && children?.map((child) => (
                <FsEntryNode
                    key={child.path}
                    entry={child}
                    depth={depth + 1}
                    onReadDir={onReadDir}
                />
            ))}
        </>
    )
}

// ============================================================
// FileTree
// ============================================================

/**
 * @context  CTX-19 / FileTree
 * @bom      docs/bom/file-tree.ts
 *
 * プロジェクトの rootPath 以下のファイルシステムツリーを表示する。
 * ディレクトリは展開時に遅延ロード（初期は1階層のみ取得）。
 * グラフ選択機能は持たない。
 *
 * props DI: onReadDir を props で受け取る。
 * 省略時は @tauri-apps/plugin-fs の readDir にフォールバック。
 */
export const FileTree = ({
    rootPath,
    onReadDir = defaultReadDir,
}: FileTreeProps = {}) => {
    const [entries, setEntries] = useState<FsEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // onReadDir の参照変化で再フェッチしないよう ref で保持
    const onReadDirRef = useRef(onReadDir)
    useEffect(() => { onReadDirRef.current = onReadDir }, [onReadDir])

    useEffect(() => {
        if (!rootPath) return

        setIsLoading(true)
        setError(null)

        onReadDirRef.current(rootPath)
            .then(setEntries)
            .catch(() => {
                toast.error('ファイルツリーの読み込みに失敗しました')
                setError('Failed to load directory')
            })
            .finally(() => setIsLoading(false))
    }, [rootPath])

    return (
        <nav
            data-testid="file-tree"
            className="flex flex-col h-full overflow-hidden border-r border-[--border]"
        >
            <div className="flex items-center px-3 h-9 shrink-0 border-b border-[--border]">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[--muted-foreground]">
                    Explorer
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
                {!rootPath && (
                    <p className="px-3 py-2 text-xs text-[--muted-foreground]">
                        root path が未設定です
                    </p>
                )}
                {rootPath && isLoading && (
                    <p className="px-3 py-2 text-xs text-[--muted-foreground]">Loading…</p>
                )}
                {rootPath && error && (
                    <p className="px-3 py-2 text-xs text-[--primary]">{error}</p>
                )}
                {rootPath && !isLoading && !error && entries.map((entry) => (
                    <FsEntryNode
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        onReadDir={onReadDir}
                    />
                ))}
            </div>
        </nav>
    )
}