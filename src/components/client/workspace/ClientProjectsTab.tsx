import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, ChevronRight, PieChart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectRecord, formatCurrency, formatDateShort } from '@/domain/clientWorkspace'

interface Props {
  projects: ProjectRecord[]
}

const PROJECT_STATUS_STYLES = {
  active: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  completed: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
  on_hold: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))] ring-[hsl(var(--bd-status-warning-border))]',
  cancelled: 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))] ring-[hsl(var(--bd-status-danger-border))]',
}

export const ClientProjectsTab: React.FC<Props> = ({ projects }) => {
  const navigate = useNavigate()

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 text-muted-foreground shadow-sm ring-1 ring-border/50">
           <FolderKanban className="size-8" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-foreground">No active projects</h3>
        <p className="mt-1 text-xs text-muted-foreground">Add a project to start tracking jobs for this client.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {projects.map((project) => {
        const statusStyle = PROJECT_STATUS_STYLES[project.status as keyof typeof PROJECT_STATUS_STYLES] || PROJECT_STATUS_STYLES.active
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="group relative flex min-h-[44px] w-full flex-col overflow-hidden rounded-2xl border border-bd-border bg-bd-surface p-5 text-left shadow-sm transition hover:bg-bd-surface-muted/40"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                 <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                       {project.project_code || 'PROJ-XXX'}
                    </span>
                 </div>
                 <h3 className="mt-1 truncate text-lg font-black tracking-tight text-foreground">
                    {project.name}
                 </h3>
              </div>
              <Badge className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusStyle}`}>
                {project.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
               <div className="flex items-center gap-1.5">
                  <div className="rounded bg-bd-surface-muted p-1 text-bd-text-muted">
                     <PieChart className="size-3" />
                  </div>
                  <div>
                     <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Value</div>
                     <div className="text-xs font-bold leading-none text-foreground">{formatCurrency(project.project_value)}</div>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 border-l border-bd-border/50 pl-6">
                  <div>
                     <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</div>
                     <div className="text-xs font-bold leading-none text-foreground">{formatDateShort(project.start_date)}</div>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-5 right-5 text-muted-foreground transition group-hover:text-foreground">
               <ChevronRight className="size-5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
