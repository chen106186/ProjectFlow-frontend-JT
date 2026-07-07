# AGENTS.md

## Code Navigation

- Prefer using `codegraph` to build a code index map before broad code exploration, so the model does not need to scan the whole repository.
- If `codegraph` is unavailable in the current environment, use targeted searches such as `rg`, `rg --files`, and focused file reads instead of full-repository dumps.

## Command Output

Protect context usage. **Any command with unknown or potentially large output must be byte-capped.**

Default pattern:

```bash
COMMAND 2>&1 | head -c 4000
```

For PowerShell, use an equivalent cap, for example:

```powershell
$o = COMMAND 2>&1 | Out-String; $o.Substring(0, [Math]::Min($o.Length, 4000))
```

## Testing

不需要 codex 自动测试，我会手动测试，然后给你反馈测试结果。

## Context Management

- 经常使用上下文压缩，减少上下文长度。
- Prefer concise progress updates and avoid pasting large command output into the conversation.
