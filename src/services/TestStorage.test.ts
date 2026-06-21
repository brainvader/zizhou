import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defaultTestStorage } from './TestStorage'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }))

beforeEach(() => vi.clearAllMocks())

describe('TestStorage インターフェースを満たす', () => {
    it('analyzeTests は analyze_tests を projectId で呼ぶ', async () => {
        mockInvoke.mockResolvedValue(undefined)
        await defaultTestStorage.analyzeTests('proj:001')
        expect(mockInvoke).toHaveBeenCalledWith('analyze_tests', { projectId: 'proj:001' })
    })

    it('listTestSuites は list_test_suites を projectId で呼び TestSuite[] を返す', async () => {
        const suites = [{ id: 'suite:001', testFileId: 'file:001', parentSuiteId: null, name: 'MyTests', nodeIds: [] }]
        mockInvoke.mockResolvedValue(suites)
        const result = await defaultTestStorage.listTestSuites('proj:001')
        expect(mockInvoke).toHaveBeenCalledWith('list_test_suites', { projectId: 'proj:001' })
        expect(result).toEqual(suites)
    })

    it('listTestCases は list_test_cases を suiteId で呼び TestCase[] を返す', async () => {
        const cases = [{ id: 'case:001', suiteId: 'suite:001', name: 'does something', order: 0 }]
        mockInvoke.mockResolvedValue(cases)
        const result = await defaultTestStorage.listTestCases('suite:001')
        expect(mockInvoke).toHaveBeenCalledWith('list_test_cases', { suiteId: 'suite:001' })
        expect(result).toEqual(cases)
    })
})