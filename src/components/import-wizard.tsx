'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { importListFromData } from '@/lib/actions/lists'
import { toast } from 'sonner'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface ImportWizardProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type ImportStep = 'upload' | 'map' | 'preview'

interface ParsedRow {
  [key: string]: string
}

const COLUMN_TARGETS = [
  { key: 'ignore', label: 'Ignore' },
  { key: 'leetcode_number', label: 'LeetCode #' },
  { key: 'title', label: 'Title' },
  { key: 'topic', label: 'Topic' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'done', label: 'Done/Solved' },
  { key: 'slug', label: 'URL Slug' },
] as const

// Auto-detect column mapping by header name
function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  headers.forEach(h => {
    const lower = h.toLowerCase().trim()
    if (lower === '#' || lower === 'number' || lower === 'leetcode' || lower === 'no' || lower === 'leetcode number' || lower === 'lc #') {
      mapping[h] = 'leetcode_number'
    } else if (lower === 'name' || lower === 'title' || lower === 'problem' || lower === 'question') {
      mapping[h] = 'title'
    } else if (lower === 'topic' || lower === 'pattern' || lower === 'category' || lower === 'tag') {
      mapping[h] = 'topic'
    } else if (lower === 'difficulty' || lower === 'diff' || lower === 'level') {
      mapping[h] = 'difficulty'
    } else if (lower === 'done' || lower === 'solved' || lower === 'status' || lower === 'completed') {
      mapping[h] = 'done'
    } else if (lower === 'slug' || lower === 'link' || lower === 'url') {
      mapping[h] = 'slug'
    } else {
      mapping[h] = 'ignore'
    }
  })
  return mapping
}

export function ImportWizard({ open, onClose, onSuccess }: ImportWizardProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [listName, setListName] = useState('')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setListName(file.name.replace(/\.(csv|xlsx|xls)$/i, ''))

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as ParsedRow[]
          if (data.length > 0) {
            const h = Object.keys(data[0])
            setHeaders(h)
            setRows(data)
            setColumnMapping(autoDetectMapping(h))
            setStep('map')
          }
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<ParsedRow>(ws)
        if (data.length > 0) {
          const h = Object.keys(data[0])
          setHeaders(h)
          setRows(data)
          setColumnMapping(autoDetectMapping(h))
          setStep('map')
        }
      }
      reader.readAsBinaryString(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const titleCol = Object.entries(columnMapping).find(([, v]) => v === 'title')?.[0]
      if (!titleCol) {
        toast.error('Please map a Title column')
        return
      }

      const numberCol = Object.entries(columnMapping).find(([, v]) => v === 'leetcode_number')?.[0]
      const topicCol = Object.entries(columnMapping).find(([, v]) => v === 'topic')?.[0]
      const diffCol = Object.entries(columnMapping).find(([, v]) => v === 'difficulty')?.[0]
      const doneCol = Object.entries(columnMapping).find(([, v]) => v === 'done')?.[0]
      const slugCol = Object.entries(columnMapping).find(([, v]) => v === 'slug')?.[0]

      const questions = rows
        .filter(row => row[titleCol]?.trim())
        .map(row => {
          const doneVal = doneCol ? row[doneCol]?.toString().toLowerCase().trim() : ''
          const isSolved = ['yes', 'true', '1', 'done', 'solved', '✓', '✅', 'x'].includes(doneVal)

          let difficulty: 'Easy' | 'Medium' | 'Hard' | undefined
          if (diffCol) {
            const d = row[diffCol]?.toString().trim().toLowerCase()
            if (d === 'easy' || d === 'e') difficulty = 'Easy'
            else if (d === 'medium' || d === 'med' || d === 'm') difficulty = 'Medium'
            else if (d === 'hard' || d === 'h') difficulty = 'Hard'
          }

          return {
            leetcode_number: numberCol ? parseInt(row[numberCol]) || undefined : undefined,
            title: row[titleCol].trim(),
            slug: slugCol ? row[slugCol]?.trim() : undefined,
            topic: topicCol ? row[topicCol]?.trim() : undefined,
            difficulty,
            is_solved: isSolved,
          }
        })

      await importListFromData(listName || 'Imported List', questions)
      toast.success(`Imported ${questions.length} questions!`)
      onSuccess?.()
      onClose()
      resetState()
    } catch (err) {
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsImporting(false)
    }
  }

  const resetState = () => {
    setStep('upload')
    setListName('')
    setFileName('')
    setHeaders([])
    setRows([])
    setColumnMapping({})
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); resetState() } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Import Questions
            <span className="text-xs text-muted-foreground font-normal ml-2">
              Step {step === 'upload' ? '1' : step === 'map' ? '2' : '3'} of 3
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv,.xlsx,.xls'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) handleFile(file)
              }
              input.click()
            }}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">Drop your spreadsheet here</p>
            <p className="text-xs text-muted-foreground">
              Supports CSV, XLSX, XLS files
            </p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'map' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">List Name</label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="mt-1.5"
                placeholder="e.g. My DSA List"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Map Columns</p>
              <p className="text-xs text-muted-foreground mb-3">
                Found {headers.length} columns in &quot;{fileName}&quot;. Map each to a field:
              </p>
              <div className="space-y-2">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-32 truncate font-mono">{h}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <Select
                      value={columnMapping[h] || 'ignore'}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [h]: v ?? 'ignore' }))}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_TARGETS.map(t => (
                          <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep('preview')}>
                Preview <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">Topic</th>
                      <th className="px-3 py-2 text-left">Diff</th>
                      <th className="px-3 py-2 text-left">Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => {
                      const titleCol = Object.entries(columnMapping).find(([, v]) => v === 'title')?.[0]
                      const numCol = Object.entries(columnMapping).find(([, v]) => v === 'leetcode_number')?.[0]
                      const topicCol = Object.entries(columnMapping).find(([, v]) => v === 'topic')?.[0]
                      const diffCol = Object.entries(columnMapping).find(([, v]) => v === 'difficulty')?.[0]
                      const doneCol = Object.entries(columnMapping).find(([, v]) => v === 'done')?.[0]
                      return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono text-muted-foreground">{numCol ? row[numCol] : '-'}</td>
                          <td className="px-3 py-1.5">{titleCol ? row[titleCol] : '-'}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{topicCol ? row[topicCol] : '-'}</td>
                          <td className="px-3 py-1.5">{diffCol ? row[diffCol] : '-'}</td>
                          <td className="px-3 py-1.5">{doneCol ? (row[doneCol] ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-muted-foreground" />) : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
                  ...and {rows.length - 20} more rows
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Ready to import <strong className="text-foreground">{rows.length} questions</strong> into &quot;{listName}&quot;
            </p>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setStep('map')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
