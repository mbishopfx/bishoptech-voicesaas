alter table public.workflow_boards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.workflow_boards
set metadata = jsonb_build_object(
  'isTemplate', false,
  'phaseOrder', jsonb_build_array('Discovery', 'Qualification', 'Routing', 'Follow-Up', 'Outcome')
)
where metadata = '{}'::jsonb or metadata is null;
