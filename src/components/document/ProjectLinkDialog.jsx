import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/supabase'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function ProjectLinkDialog({
  open,
  onOpenChange,
  tableName,
  recordId,
  documentLabel,
  onLinked,
}) {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setProjectId('')
      setSaving(false)
    }
  }, [open])

  const handleLink = async () => {
    if (!recordId || !projectId.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from(tableName)
      .update({ project_id: projectId.trim() })
      .eq('id', recordId)
    setSaving(false)

    if (error) {
      toast({ title: 'Failed to link project', description: error.message, variant: 'destructive' })
      return
    }

    onOpenChange(false)
    setProjectId('')
    toast({ title: 'Project linked', description: `${documentLabel} is now attached to the selected project.` })
    await onLinked?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Project</DialogTitle>
          <DialogDescription>
            Attach this {documentLabel.toLowerCase()} to an existing project by pasting the project ID.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="project-link-id" className="text-sm font-medium text-foreground">
            Project ID
          </label>
          <Input
            id="project-link-id"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Paste Project ID (UUID)"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); navigate('/projects') }}>
              Go to Projects
            </Button>
            <Button type="button" onClick={() => void handleLink()} disabled={saving || !projectId.trim()}>
              {saving ? 'Linking...' : 'Link Project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
