/**
 * @tauri-apps/api/core のテスト用モック。
 * VITE_PLAYWRIGHT=true のとき vite.config.ts の alias で差し替えられる。
 *
 * list_projects:   インメモリの projects[] を返す
 * create_project:  インメモリに project を追加して返す
 */

type MockProject = { id: string; name: string; description?: string; rootPath: string }

const _projects: MockProject[] = []
let _idCounter = 1

export async function invoke<T>(
    command: string,
    args?: Record<string, unknown>,
): Promise<T> {
    switch (command) {
        case 'list_projects':
            return [..._projects] as unknown as T

        case 'create_project': {
            const name = args?.name as string
            const description = args?.description as string | undefined
            const rootPath = (args?.rootPath as string) ?? ''
            const project: MockProject = {
                id: `project:mock-${_idCounter++}`,
                name,
                rootPath,
                ...(description ? { description } : {}),
            }
            _projects.push(project)
            return project as unknown as T
        }

        default:
            throw new Error(`[mock] invoke: unknown command "${command}"`)
    }
}
