'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
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

function detectColumns(rows: any[][]): { titleIdx: number, diffIdx: number, topicIdx: number, doneIdx: number, youtubeIdx: number } {
  let titleIdx = 0
  let diffIdx = -1
  let topicIdx = -1
  let doneIdx = -1
  let youtubeIdx = -1

  if (rows.length === 0) return { titleIdx, diffIdx, topicIdx, doneIdx, youtubeIdx }
  
  // 1. Check if first row has obvious headers
  const headerRow = rows[0].map(c => (c || '').toString().toLowerCase().trim())
  
  for (let i = 0; i < headerRow.length; i++) {
    const h = headerRow[i]
    if (['name', 'title', 'problem', 'question'].includes(h)) titleIdx = i
    if (['difficulty', 'diff', 'level'].includes(h)) diffIdx = i
    if (['topic', 'pattern', 'category', 'tag'].includes(h)) topicIdx = i
    if (['done', 'solved', 'status', 'completed'].includes(h)) doneIdx = i
    if (['video', 'youtube', 'link', 'url', 'solution'].includes(h)) youtubeIdx = i
  }

  // 2. If no obvious title header was found, guess by column with longest text
  if (!['name', 'title', 'problem', 'question'].includes(headerRow[titleIdx])) {
    const maxRows = Math.min(5, rows.length)
    let maxScore = 0
    const numCols = rows[0].length
    for (let c = 0; c < numCols; c++) {
      let score = 0
      for (let r = 0; r < maxRows; r++) {
        const val = (rows[r][c] || '').toString()
        score += val.length
        if (/[a-zA-Z]/.test(val)) score += 5 
      }
      if (score > maxScore) {
        maxScore = score
        titleIdx = c
      }
    }
  }

  return { titleIdx, diffIdx, topicIdx, doneIdx, youtubeIdx }
}

export function ImportWizard({ open, onClose, onSuccess }: ImportWizardProps) {
  const [isImporting, setIsImporting] = useState(false)

  const processImportData = useCallback(async (rows: any[][], fileListName: string) => {
    if (rows.length === 0) return
    setIsImporting(true)
    
    try {
      const { titleIdx, diffIdx, topicIdx, doneIdx, youtubeIdx } = detectColumns(rows)

      // Skip the header row if it contains header keywords
      let startIndex = 0
      const firstRowLower = (rows[0][titleIdx] || '').toString().toLowerCase()
      if (['name', 'title', 'problem', 'question'].includes(firstRowLower)) {
        startIndex = 1
      }

      const questions = []
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i]
        const title = (row[titleIdx] || '').toString().trim()
        if (!title) continue // Skip empty rows
        
        let difficulty: 'Easy' | 'Medium' | 'Hard' | undefined
        if (diffIdx !== -1) {
          const d = (row[diffIdx] || '').toString().trim().toLowerCase()
          if (d === 'easy' || d === 'e') difficulty = 'Easy'
          else if (d === 'medium' || d === 'med' || d === 'm') difficulty = 'Medium'
          else if (d === 'hard' || d === 'h') difficulty = 'Hard'
        }

        let topic = topicIdx !== -1 ? (row[topicIdx] || '').toString().trim() : undefined
        
        let is_solved = false
        if (doneIdx !== -1) {
          const doneVal = (row[doneIdx] || '').toString().toLowerCase().trim()
          is_solved = ['yes', 'true', '1', 'done', 'solved', '✓', '✅', 'x'].includes(doneVal)
        }

        let youtube_url = undefined
        if (youtubeIdx !== -1) {
          youtube_url = (row[youtubeIdx] || '').toString().trim() || undefined
        }

        questions.push({ title, difficulty, topic, is_solved, youtube_url })
      }

      await importListFromData(fileListName, questions)
      toast.success(`Imported ${questions.length} questions! Metadata auto-resolved.`)
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsImporting(false)
    }
  }, [onSuccess, onClose])

  const handleFile = useCallback((file: File) => {
    const listName = file.name.replace(/\.(csv|xlsx|xls)$/i, '')
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: false, // Return arrays
        skipEmptyLines: true,
        complete: (results) => {
          processImportData(results.data as any[][], listName)
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Return arrays
        processImportData(data as any[][], listName)
      }
      reader.readAsBinaryString(file)
    }
  }, [processImportData])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isImporting) onClose() }}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            1-Click Smart Import
          </DialogTitle>
        </DialogHeader>

        {isImporting ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analyzing Spreadsheet...</h3>
            <p className="text-muted-foreground text-sm max-w-[280px]">
              We are automatically extracting your questions and cross-referencing LeetCode's database to fill in missing difficulty levels and tags.
            </p>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-16 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
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
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium mb-1">Drop your spreadsheet here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports CSV, XLSX, XLS files
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto opacity-70">
              No manual column mapping needed. We automatically extract question names and fetch missing data!
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
