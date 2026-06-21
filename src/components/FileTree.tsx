import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { readDir } from '@tauri-apps/plugin-fs'
import { toast } from 'sonner'
import type {
    FsEntry,
    ReadDirFn,
    FileTreeProps,
    OnFileClickFn,
} from '@/bom/file-tree'

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
// パス変換ヘルパー
// ============================================================

/**
 * [CTX-20] エントリの絶対パスを rootPath 相対 (forward slash) に変換する。
 * BOM 上の onFileClick / selectedFilePath / staleFiles / analyzedFiles は
 * すべて rootPath 相対形式で授受するため、エントリ側で正規化する。
 */
const toRelative = (absPath: string, rootPath: string): string => {
    if (!rootPath) return absPath.replace(/\\/g, '/')
    const root = rootPath.replace(/[/\\]+$/, '')
    if (absPath === root) return ''
    if (absPath.startsWith(root + '/')) {
        return absPath.slice(root.length + 1)
    }
    if (absPath.startsWith(root + '\\')) {
        return absPath.slice(root.length + 1).replace(/\\/g, '/')
    }
    return absPath.replace(/\\/g, '/')
}

// ============================================================
// FsEntryNode — 1エントリを再帰描画するサブコンポーネント
// ============================================================

type FsEntryNodeProps = {
    entry: FsEntry
    depth: number
    rootPath: string
    onReadDir: ReadDirFn
    // [CTX-20]
    onFileClick?: OnFileClickFn
    selectedFilePath?: string | null
    staleFiles?: ReadonlySet<string>
    analyzedFiles?: ReadonlySet<string>
}

const FsEntryNode = ({
    entry,
    depth,
    rootPath,
    onReadDir,
    onFileClick,
    selectedFilePath,
    staleFiles,
    analyzedFiles,
}: FsEntryNodeProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [children, setChildren] = useState<FsEntry[] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 参照が毎レンダー変わりうるコールバックは ref で保持
    const onReadDirRef = useRef(onReadDir)
    const onFileClickRef = useRef(onFileClick)
    useEffect(() => { onReadDirRef.current = onReadDir }, [onReadDir])
    useEffect(() => { onFileClickRef.current = onFileClick }, [onFileClick])

    // [CTX-20] エントリの相対パスを算出
    const relPath = useMemo(
        () => toRelative(entry.path, rootPath),
        [entry.path, rootPath],
    )

    const isFile = !entry.isDirectory
    const isSelected = isFile && !!selectedFilePath && relPath === selectedFilePath
    const isStale = isFile && !!staleFiles?.has(relPath)
    const isAnalyzed = isFile && !!analyzedFiles?.has(relPath)

    const handleClick = useCallback(async () => {
        if (entry.isDirectory) {
            // ディレクトリ展開（既存ロジック）
            if (isExpanded) {
                setIsExpanded(false)
                return
            }
            if (children === null) {
                setIsLoading(true)
                try {
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
        } else {
            // [CTX-20] ファイルクリック → 相対パスで通知
            onFileClickRef.current?.(relPath)
        }
    }, [entry.isDirectory, entry.path, isExpanded, children, relPath])

    const indent = depth * 12

    // ============================================================
    // [CTX-20] 表示スタイル決定
    // ============================================================
    // - stale: primary 色（赤系）で強調
    // - analyzed (登録済み): foreground（通常文字色）で「登録済み」を示す
    // - 未解析ファイル: muted-foreground（既存）
    // - selected: 背景に accent
    // ============================================================
    let textClass: string
    if (entry.isDirectory) {
        textClass = 'text-[--foreground] hover:bg-[--muted]'
    } else if (isStale) {
        textClass = 'text-[--primary] hover:bg-[--muted]'
    } else if (isAnalyzed) {
        textClass = 'text-[--foreground] hover:bg-[--muted]'
    } else {
        textClass = 'text-[--muted-foreground] hover:bg-[--muted]'
    }

    // ファイルでも onFileClick が渡されていればクリック可能
    const cursorClass =
        entry.isDirectory || onFileClick ? 'cursor-pointer' : 'cursor-default'

    const selectedClass = isSelected ? 'bg-[--accent]' : ''

    const icon = entry.isDirectory
        ? isLoading
            ? '…'
            : isExpanded
                ? '▼'
                : '▶'
        : isStale
            ? '●'
            : isAnalyzed
                ? '◉'
                : '◦'

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                data-testid={`fs-entry-${entry.name}`}
                data-selected={isSelected || undefined}
                data-stale={isStale || undefined}
                data-analyzed={isAnalyzed || undefined}
                style={{ paddingLeft: `${12 + indent}px` }}
                className={[
                    'flex items-center gap-1.5 py-1 pr-3 rounded-sm select-none',
                    'text-[11px] font-light transition-colors duration-100',
                    cursorClass,
                    textClass,
                    selectedClass,
                ].join(' ')}
                onClick={handleClick}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            >
                <span className="text-[10px] w-3 text-center shrink-0">{icon}</span>
                <span className="truncate">{entry.name}</span>
            </div>

            {entry.isDirectory && isExpanded && children?.map((child) => (
                <FsEntryNode
                    key={child.path}
                    entry={child}
                    depth={depth + 1}
                    rootPath={rootPath}
                    onReadDir={onReadDir}
                    onFileClick={onFileClick}
                    selectedFilePath={selectedFilePath}
                    staleFiles={staleFiles}
                    analyzedFiles={analyzedFiles}
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
 * @context  CTX-20 / 構造グラフ連携（onFileClick / staleFiles / selectedFilePath / analyzedFiles）
 * @bom      docs/bom/file-tree.ts
 *
 * プロジェクトの rootPath 以下のファイルシステムツリーを表示する。
 * ディレクトリは展開時に遅延ロード（初期は1階層のみ取得）。
 *
 * [CTX-20] 構造グラフ連携:
 *   - ファイルクリックで onFileClick(relPath) を発火（analyze_file 起動などに使う）
 *   - staleFiles に含まれるファイルを primary 色で強調
 *   - analyzedFiles に含まれるファイルは「登録済み」として通常文字色
 *   - selectedFilePath のファイルを背景 accent で強調（ノード→ファイル方向の同期）
 *
 * props DI:
 *   onReadDir 省略時は @tauri-apps/plugin-fs の readDir にフォールバック。
 */
export const FileTree = ({
    rootPath,
    onReadDir = defaultReadDir,
    onFileClick,
    selectedFilePath,
    staleFiles,
    analyzedFiles,
}: FileTreeProps = {}) => {
    const [entries, setEntries] = useState<FsEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
                        rootPath={rootPath}
                        onReadDir={onReadDir}
                        onFileClick={onFileClick}
                        selectedFilePath={selectedFilePath}
                        staleFiles={staleFiles}
                        analyzedFiles={analyzedFiles}
                    />
                ))}
            </div>
        </nav>
    )
}