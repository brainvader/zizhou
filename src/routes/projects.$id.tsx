import { useParams } from '@tanstack/react-router'

/**
 * ProjectDetailRoute
 * "/projects/$id" ルートのプレースホルダーコンポーネント。
 * useParams で id を取得して表示するだけ。
 * 詳細画面の実装は次コンテキスト以降で行う。
 *
 * @see src/router.tsx
 * @see docs/specs/routing.spec.tsx
 */
export const ProjectDetailRoute = () => {
    const { id } = useParams({ from: '/projects/$id' })

    return (
        <main className="p-6">
            <div data-testid="project-detail-id">{id}</div>
        </main>
    )
}