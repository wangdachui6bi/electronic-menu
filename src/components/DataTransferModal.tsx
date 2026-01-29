import { useRef, useState } from 'react'
import type { ExportBundleV1 } from '../storage'
import './DataTransferModal.css'

type Props = {
  onClose: () => void
  onExport: () => Promise<ExportBundleV1>
  onImport: (bundle: ExportBundleV1, opts: { replace: boolean }) => Promise<void>
}

export default function DataTransferModal({ onClose, onExport, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    setBusy(true)
    try {
      const bundle = await onExport()
      const name = `menu-export-${new Date(bundle.exportedAt).toISOString().slice(0, 10)}.json`
      download(name, JSON.stringify(bundle, null, 2))
    } finally {
      setBusy(false)
    }
  }

  const parseFile = async (file: File): Promise<ExportBundleV1> => {
    const text = await file.text()
    const json = JSON.parse(text) as ExportBundleV1
    if (!json || json.version !== 1) throw new Error('不支持的导入文件格式')
    if (!Array.isArray(json.dishes) || !Array.isArray(json.categories)) {
      throw new Error('导入文件缺少 dishes/categories')
    }
    return json
  }

  const pickImport = (replace: boolean) => {
    const input = fileRef.current
    if (!input) return

    input.onchange = async () => {
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      setBusy(true)
      try {
        const bundle = await parseFile(file)
        await onImport(bundle, { replace })
        alert('导入成功')
        onClose()
      } catch (e) {
        alert(e instanceof Error ? e.message : '导入失败')
      } finally {
        setBusy(false)
      }
    }

    input.click()
  }

  return (
    <div className="xfer-overlay" onClick={onClose}>
      <div className="xfer" onClick={(e) => e.stopPropagation()}>
        <div className="xfer__header">
          <h2>导入 / 导出</h2>
          <button type="button" className="xfer__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="xfer__body">
          <p className="xfer__desc">
            用 JSON 文件备份/迁移数据：可导出菜品与分类，然后导入到另一台设备。
          </p>

          <div className="xfer__actions">
            <button type="button" className="xfer__btn" onClick={handleExport} disabled={busy}>
              导出为文件
            </button>
            <button
              type="button"
              className="xfer__btn"
              onClick={() => pickImport(false)}
              disabled={busy}
              title="合并导入：如果 id 冲突会覆盖"
            >
              导入（合并）
            </button>
            <button
              type="button"
              className="xfer__btn xfer__btn--danger"
              onClick={() => {
                if (!confirm('确定要导入并覆盖当前所有数据吗？此操作不可撤销。')) return
                pickImport(true)
              }}
              disabled={busy}
            >
              导入（覆盖）
            </button>
          </div>

          <input ref={fileRef} type="file" accept="application/json" className="xfer__file" />
        </div>
        <div className="xfer__footer">
          <button type="button" className="xfer__btn" onClick={onClose} disabled={busy}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
