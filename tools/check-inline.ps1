Param(
  [Parameter(Mandatory=$false)][string]$Path = "."
)

# 扫描 HTML 文件中是否有：
# 1) <style> 标签
# 2) 行内事件属性（onClick/onmouseover 等）
# 3) 内联 <script>（不含 src）

$errors = @()

$files = Get-ChildItem -Path $Path -Recurse -Include *.html -File -ErrorAction SilentlyContinue
foreach ($f in $files) {
  $content = Get-Content -LiteralPath $f.FullName -Raw

  if ($content -match "<style[\s>]") {
    $errors += "[STYLE] $($f.FullName) 包含 <style>"
  }

  if ($content -match "on[a-z]+\=") {
    $errors += "[INLINE-EVENT] $($f.FullName) 包含内联事件属性"
  }

  if ($content -match "<script(?![^>]*src=)[^>]*>") {
    $errors += "[INLINE-SCRIPT] $($f.FullName) 包含内联 <script>"
  }
}

if ($errors.Count -eq 0) {
  Write-Host "PASS: 未发现内联样式、内联事件或内联脚本" -ForegroundColor Green
  exit 0
} else {
  Write-Host "发现以下问题：" -ForegroundColor Yellow
  $errors | ForEach-Object { Write-Host $_ }
  exit 1
}
