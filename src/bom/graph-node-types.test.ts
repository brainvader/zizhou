/**
 * GRAPH_NODE_TYPES — React Flow の nodeTypes マッピングが正しく配線されている
 *
 * 各 CustomNode（ComponentNode 等）自体の描画ロジックは GraphNodeCard.test.tsx で
 * 検証済みのため、ここでは「kind ごとに正しいコンポーネントが登録されているか」
 * という配線のみを検証する。
 *
 * @see src/bom/context-graph.ts (NodeKind)
 * @see src/components/GraphNodeCard.test.tsx
 */
import { describe, it, expect } from 'vitest'

import { GRAPH_NODE_TYPES } from './graph-node-types'
import { ComponentNode } from '@/components/ComponentNode'
import { HookNode } from '@/components/HookNode'
import { ExternalNode } from '@/components/ExternalNode'
import { StateNode } from '@/components/StateNode'
import { FeatureNode } from '@/components/FeatureNode'
import type { NodeKind } from './context-graph'

describe('React Flow の nodeTypes マッピングが正しく配線されている', () => {
    it('NodeKind の全パターン(5種)がキーとして揃っている', () => {
        const kinds: readonly NodeKind[] = [
            'component',
            'hook',
            'external',
            'state',
            'feature',
        ]
        for (const kind of kinds) {
            expect(GRAPH_NODE_TYPES[kind]).toBeDefined()
        }
        expect(Object.keys(GRAPH_NODE_TYPES)).toHaveLength(5)
    })

    it('component キーが ComponentNode を指す', () => {
        expect(GRAPH_NODE_TYPES.component).toBe(ComponentNode)
    })

    it('hook キーが HookNode を指す', () => {
        expect(GRAPH_NODE_TYPES.hook).toBe(HookNode)
    })

    it('external キーが ExternalNode を指す', () => {
        expect(GRAPH_NODE_TYPES.external).toBe(ExternalNode)
    })

    it('state キーが StateNode を指す', () => {
        expect(GRAPH_NODE_TYPES.state).toBe(StateNode)
    })

    it('feature キーが FeatureNode を指す', () => {
        expect(GRAPH_NODE_TYPES.feature).toBe(FeatureNode)
    })
})
