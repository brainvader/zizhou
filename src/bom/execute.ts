import { z } from 'zod'

// ============================================================
// ExecuteRequest                                     [CTX-14]
// invoke('execute_node', ...) に渡す引数型。
// GraphNodeData から必要フィールドを抽出して組み立てる。
// ============================================================

export const ExecuteRequestSchema = z.object({
    /** node_catalog の service フィールドに対応 */
    service: z.string(),
    /** node_catalog の provider フィールドに対応 */
    provider: z.string(),
    /** std::process::Command の current_dir に使用 */
    cwd: z.string(),
    /** subcommand を含む入力パラメータ。CatalogProfile.fields に対応 */
    input: z.record(z.string(), z.unknown()),
})

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>

// ============================================================
// ExecuteResponse                                    [CTX-14]
// execute_node コマンドの戻り値型。
// Rust 側の ExecuteResponse struct と対応する。
// ============================================================

export const ExecuteErrorSchema = z.object({
    /** SERVICE_NOT_FOUND / PROFILE_NOT_FOUND / CLI_EXECUTION_FAILED 等 */
    code: z.string(),
    message: z.string(),
})

export type ExecuteError = z.infer<typeof ExecuteErrorSchema>

export const ExecuteResponseSchema = z.object({
    success: z.boolean(),
    /**
     * CLI executor: { stdout: string, stderr: string }
     * HTTP executor: レスポンスボディ (JSON)
     * 失敗時は null
     */
    output: z.record(z.string(), z.unknown()).nullable(),
    error: ExecuteErrorSchema.nullable(),
})

export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>

// ============================================================
// UseNodeExecuteOptions                              [CTX-14]
// useNodeExecute hook の props DI 型。
// テスト・Storybook では onExecute を差し替えて使う。
// ============================================================

export type UseNodeExecuteOptions = {
    onExecute?: (req: ExecuteRequest) => Promise<ExecuteResponse>
}

export type UseNodeExecuteReturn = {
    /** 実行中ノード ID。null のとき非実行中 */
    runningNodeId: string | null
    /** invoke を呼んで status を doing → done/error に更新する */
    execute: (nodeId: string, req: ExecuteRequest) => Promise<void>
}