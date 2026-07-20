import { useRef, useState } from 'react'
import { useEditorStore } from '@/store/editor'

export function ProjectMenu() {
  const { project, newProject, importProject, setProjectName } = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (parsed && typeof parsed === 'object' && 'version' in parsed && 'screens' in parsed) {
          importProject(parsed)
        } else {
          alert('Invalid project file')
        }
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be loaded again
    e.target.value = ''
  }

  const handleNew = () => {
    if (project.screens.length > 1 || project.screens[0]?.root.children.length > 0) {
      if (!confirm('Create a new project? Current project will be lost.')) return
    }
    const name = prompt('Project name:', 'Untitled')
    if (!name) return
    newProject(name)
  }

  const handleNameDoubleClick = () => {
    setEditingName(true)
    setNameValue(project.name)
  }

  const handleNameSubmit = () => {
    const trimmed = nameValue.trim()
    if (trimmed) setProjectName(trimmed)
    setEditingName(false)
  }

  return (
    <div className="flex items-center gap-1">
      {/* Project name */}
      {editingName ? (
        <input
          className="h-5 w-28 bg-transparent border-b border-primary text-xs font-medium outline-none"
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameSubmit()
            if (e.key === 'Escape') setEditingName(false)
          }}
        />
      ) : (
        <span
          className="cursor-default rounded px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
          onDoubleClick={handleNameDoubleClick}
          title="Double-click to rename"
        >
          {project.name}
        </span>
      )}

      <span className="text-xs text-muted-foreground/30">|</span>

      {/* Menu buttons */}
      <button
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={handleNew}
        title="New project"
      >
        New
      </button>

      <button
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={handleSave}
        title="Save to .json file"
      >
        Save
      </button>

      <button
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={() => fileInputRef.current?.click()}
        title="Load from .json file"
      >
        Load
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleLoad}
      />
    </div>
  )
}
