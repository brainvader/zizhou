//! services/vcs/git — Git による VcsProvider 実装
//!
//! @context CTX-20

use std::process::Command;

use super::VcsProvider;

/// Git による実装。
///
/// 初期実装: `git diff --name-only HEAD`
///   → working tree + staged で HEAD と差があるファイル一覧。
///     untracked は含まない（将来 `git ls-files --others --exclude-standard` を union する想定）。
///
/// git のパス区切りは Windows でも forward slash で出力されるため追加変換は不要。
pub struct GitProvider;

impl VcsProvider for GitProvider {
    fn get_changed_files(&self, root_path: &str) -> Result<Vec<String>, String> {
        let output = Command::new("git")
            .args(["diff", "--name-only", "HEAD"])
            .current_dir(root_path)
            .output()
            .map_err(|e| format!("Failed to spawn git: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "git exited with {}: {}",
                output.status,
                stderr.trim()
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect())
    }
}
