//! services/vcs — バージョン管理操作の抽象化
//!
//! @context CTX-20: VcsProvider trait

pub mod git;

/// VCS 操作の抽象。
pub trait VcsProvider: Send + Sync {
    /// `root_path` を作業ディレクトリとして、変更されたファイルのパス一覧を返す。
    /// 返り値はリポジトリルートからの相対パス、forward slash 区切り。
    fn get_changed_files(&self, root_path: &str) -> Result<Vec<String>, String>;
}
