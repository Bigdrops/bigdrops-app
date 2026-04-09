alter table public.projects
add column if not exists project_code text;

with ranked_projects as (
  select
    id,
    to_char(coalesce(created_at, now()), 'YYYY') as project_year,
    row_number() over (
      partition by to_char(coalesce(created_at, now()), 'YYYY')
      order by coalesce(created_at, now()), id
    ) as project_sequence , 
  from public.projects
  where project_code is null
)
update public.projects as projects
set project_code = 'PRJ-' || ranked_projects.project_year || '-' || lpad(ranked_projects.project_sequence::text, 3, '0')
from ranked_projects
where projects.id = ranked_projects.id;

create unique index if not exists projects_project_code_key
on public.projects (project_code);

alter table public.projects
alter column project_code set not null;
 