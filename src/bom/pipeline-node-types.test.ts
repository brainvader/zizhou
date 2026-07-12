/**
 * PIPELINE_NODE_TYPES — React Flow の nodeTypes マッピングが正しく配線されている
 *
 * @see src/components/PipelineStageNode.test.tsx
 */
import { describe, it, expect } from 'vitest'
import { PIPELINE_NODE_TYPES } from './pipeline-node-types'
import { PipelineStageNode } from '@/components/PipelineStageNode'

describe('Pipeline用 React Flow の nodeTypes マッピングが正しく配線されている', () => {
    it('stage キーが PipelineStageNode を指す', () => {
        expect(PIPELINE_NODE_TYPES.stage).toBe(PipelineStageNode)
    })

    it('キーは stage の1つだけ', () => {
        expect(Object.keys(PIPELINE_NODE_TYPES)).toEqual(['stage'])
    })
})