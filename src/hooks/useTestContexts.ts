import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { SourceContext } from '@/bom/source-context'
import type { TestSuite } from '@/bom/test-analysis'

/**
 * useTestContexts
 *
 * 選択中ファイルがテストファイルの場合、list_test_suites を呼び
 * 対応する SourceContext 一覧を返す。
 * テストファイル以外が選択された場合は空配列を返す。
 *
 * @param projectId       プロジェクト ID
 * @param selectedFilePath 選択中ファイルパス
 * @returns               Subflow 表示用 SourceContext 一覧
 * @context CTX-22
 */
export function useTestContexts(
    projectId: string,
    selectedFilePath: string | null,
): SourceContext[] {
    const [contexts, setContexts] = useState<SourceContext[]>([])

    useEffect(() => {
        if (!selectedFilePath) {
            setContexts([])
            return
        }

        const lower = selectedFilePath.toLowerCase()
        const isTest =
            lower.endsWith('.test.ts') ||
            lower.endsWith('.test.tsx') ||
            lower.endsWith('.spec.ts') ||
            lower.endsWith('.spec.tsx')

        if (!isTest) {
            setContexts([])
            return
        }

        invoke<TestSuite[]>('list_test_suites', { projectId })
            .then((suites) => {
                const fileKey = selectedFilePath.replace(/\//g, '-')
                const relevant = suites.filter(
                    (s) => s.nodeIds.length > 0 && s.testFileId.includes(fileKey),
                )
                setContexts(
                    relevant.map((s) => ({
                        id: s.id,
                        name: s.name,
                        projectId,
                        nodeIds: s.nodeIds,
                    })),
                )
            })
            .catch((e) => {
                console.warn('list_test_suites failed', e)
                setContexts([])
            })
    }, [selectedFilePath, projectId])

    return contexts
}