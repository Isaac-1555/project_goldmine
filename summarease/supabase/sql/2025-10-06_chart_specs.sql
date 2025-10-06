-- Chart specs per summary (server persistence)
create table if not exists public.chart_specs (
  id uuid default gen_random_uuid() primary key,
  summary_id uuid not null references public.summaries(id) on delete cascade,
  recommended_type text,
  chosen_type text not null,
  spec_json jsonb not null,
  dataset_json jsonb,
  theme text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure one spec per summary
create unique index if not exists chart_specs_summary_id_idx on public.chart_specs(summary_id);

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chart_specs_updated_at
before update on public.chart_specs
for each row execute function public.set_updated_at();