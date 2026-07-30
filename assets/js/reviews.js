
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),

  review_id uuid not null
    references public.reviews(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  content text not null
    check (
      char_length(trim(content)) between 1 and 280
    ),

  created_at timestamptz not null default now()
);

create index if not exists review_comments_review_id_created_at_idx
on public.review_comments (review_id, created_at asc);

create index if not exists review_comments_user_id_idx
on public.review_comments (user_id);

alter table public.review_comments enable row level security;
