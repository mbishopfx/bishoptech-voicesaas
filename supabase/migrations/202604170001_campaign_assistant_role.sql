alter type public.agent_type add value if not exists 'campaign';

do $$
begin
  if exists (select 1 from pg_type where typname = 'assistant_role_type') then
    alter type public.assistant_role_type add value if not exists 'campaign';
  end if;
exception
  when duplicate_object then null;
end $$;

update public.agents
set agent_type = 'campaign'
where agent_type = 'specialist';
