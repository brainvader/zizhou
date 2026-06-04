import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useGraphStore } from '@/store/useGraphStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { ExecuteRequest, ExecuteResponse, UseNodeExecuteOptions, UseNodeExecuteReturn } from '@/bom/execute'

/**
 * useNodeExecute
 *
 * ノード単体実行フック。
 * - execute(nodeId, req) を呼ぶと invoke('execute_node') を発火する
 * - 開始時:   updateNodeData(nodeId, { status: 'doing' })
 * - 成功時:   updateNodeData(nodeId, { status: 'done' })
 * - 失敗時:   updateNodeData(nodeId, { status: 'todo' }) + toast.error()
 *   （失敗 = reject または success:false）
 * - runningNodeId: 実行中のノードID。null のとき非実行中
 *
 * props DI: onExecute を省略すると invoke() の実装が使われる。
 * テスト・Storybook では差し替えて使う。
 *
 * @context CTX-14
 * @bom     docs/bom/execute.ts
 */
export function useNodeExecute({
    onExecute = (req: ExecuteRequest) =>
        invoke<ExecuteResponse>('execute_node', {
            service: req.service,
            provider: req.provider,
            cwd: req.cwd,
            input: req.input,
        }),
}: UseNodeExecuteOptions = {}): UseNodeExecuteReturn {
    const [runningNodeId, setRunningNodeId] = useState<string | null>(null)
    const updateNodeData = useGraphStore((s) => s.updateNodeData)
    const projects = useProjectStore((s) => s.projects)

    const execute = async (nodeId: string, req: ExecuteRequest): Promise<void> => {
        // [CTX-16] cwd が空のとき早期リターン
        if (!req.cwd || req.cwd.trim() === '') {
            toast.error('root path が未設定です。プロジェクト設定から root path を指定してください。')
            return
        }

        setRunningNodeId(nodeId)
        updateNodeData(nodeId, { status: 'doing' })

        try {
            const res = await onExecute(req)

            if (!res.success) {
                const msg = res.error?.message ?? 'Execution failed'
                updateNodeData(nodeId, { status: 'todo' })
                toast.error(msg)
                return
            }

            updateNodeData(nodeId, { status: 'done' })
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            updateNodeData(nodeId, { status: 'todo' })
            toast.error(msg)
        } finally {
            setRunningNodeId(null)
        }
    }

    return { runningNodeId, execute }
}