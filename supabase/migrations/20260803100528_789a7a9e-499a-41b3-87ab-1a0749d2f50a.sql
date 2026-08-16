
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  emoji text not null default '✨',
  color text not null default 'primary',
  status public.lesson_status not null default 'published',
  coming_soon boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;

drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select to authenticated using (status = 'published' or public.has_role(auth.uid(),'admin'));
drop policy if exists "courses admin all" on public.courses;
create policy "courses admin all" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter table public.lessons add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.lesson_steps add column if not exists admin_note text;

insert into public.courses (slug, title, subtitle, emoji, color, order_index, coming_soon)
values
  ('ai-tools','أدوات الذكاء الاصطناعي','تعلّم تتكلم مع الذكاء الاصطناعي وتصنع به أي شيء','🤖','primary',1,false),
  ('physical-world','العالم المادي وبناء المنتجات','حوّل أفكارك إلى منتجات حقيقية تُلمس وتُباع','🛠️','streak',2,true)
on conflict (slug) do nothing;

update public.lessons set course_id = (select id from public.courses where slug='ai-tools') where course_id is null;

insert into public.characters (name, color, bio)
select 'نور', '#e11d48', 'زميلتك الفضولية في الفصل، دايماً عندها سؤال!'
where not exists (select 1 from public.characters where name='نور');
insert into public.characters (name, color, bio)
select 'أ. سارة', '#0ea5e9', 'معلمة التقنية، تشرح ببساطة وتحب التجارب'
where not exists (select 1 from public.characters where name='أ. سارة');
