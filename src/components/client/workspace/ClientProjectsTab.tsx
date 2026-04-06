import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, ChevronRight, PieChart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectRecord, formatCurrency, formatDateShort } from '@/domain/clientWorkspace'

interface Props {
  projects: ProjectRecord[]
}

const PROJECT_STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  completed: 'bg-slate-100 text-slate-700 ring-slate-200',
  on_hold: 'bg-amber-50 text-amber-700 ring-amber-100',
  cancelled: 'bg-red-50 text-red-700 ring-red-100',
}

export const ClientProjectsTab: React.FC<Props> = ({ projects }) => {
  const navigate = useNavigate()

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 text-muted-foreground shadow-sm ring-1 ring-border/50">
           <FolderKanban className="size-8" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-zinc-950">No active projects</h3>
        <p className="mt-1 text-xs text-muted-foreground">Add a project to start tracking jobs for this client.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {projects.map((project) => {
        const statusStyle = PROJECT_STATUS_STYLES[project.status as keyof typeof PROJECT_STATUS_STYLES] || PROJECT_STATUS_STYLES.active
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm ring-1 ring-ring transition hover:bg-muted/30"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                 <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                       {project.project_code || 'PROJ-XXX'}
                    </span>
                 </div>
                 <h3 className="mt-1 truncate text-lg font-black tracking-tight text-zinc-950 group-hover:text-blue-600 transition-colors">
                    {project.name}
                 </h3>
              </div>
              <Badge className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusStyle}`}>
                {project.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
               <div className="flex items-center gap-1.5">
                  <div className="rounded bg-muted p-1 text-zinc-500">
                     <PieChart className="size-3" />
                  </div>
                  <div>
                     <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Value</div>
                     <div className="text-xs font-bold text-zinc-700 leading-none">{formatCurrency(project.project_value)}</div>
                  </div>
               </div>
               <div className="flex items-center gap-1.5 border-l border-border/50 pl-6">
                  <div>
                     <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Start Date</div>
                     <div className="text-xs font-bold text-zinc-700 leading-none">{formatDateShort(project.start_date)}</div>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-5 right-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
               <ChevronRight className="size-5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
