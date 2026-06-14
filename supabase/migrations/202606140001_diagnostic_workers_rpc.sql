-- Diagnostic worker discovery.
--
-- Direct anonymous reads on users/jobseeker_profiles are intentionally blocked.
-- This RPC exposes only the public worker-card fields needed by the Diagnostic
-- page and only for verified jobseekers whose skills match the requested trade.

create or replace function public.get_diagnostic_workers(p_trade_id text)
returns table (
  id uuid,
  name text,
  role text,
  subtype text,
  skills text[]
)
language sql
security definer
stable
set search_path = public
as $$
  with trade_aliases as (
    select lower(alias) as alias
    from unnest(
      case lower(coalesce(p_trade_id, ''))
        when 'plumbing' then array[
          'plumbing', 'plumber', 'pipe fitting', 'pipefitting', 'water systems',
          'drainage', 'drain cleaning', 'faucet repair', 'toilet repair'
        ]
        when 'electrical' then array[
          'electrical', 'electrician', 'electrical work', 'wiring',
          'circuit installation', 'electrical repair', 'lighting installation'
        ]
        when 'masonry' then array[
          'masonry', 'mason', 'tile setting', 'tiling', 'concrete work',
          'cement work', 'plastering', 'bricklaying'
        ]
        when 'welding' then array[
          'welding', 'welder', 'metal fabrication', 'steel work',
          'gate installation', 'fabricator'
        ]
        when 'carpentry' then array[
          'carpentry', 'carpenter', 'carpentry work', 'woodworking',
          'cabinet making', 'furniture repair'
        ]
        else array[]::text[]
      end
    ) as alias
  ),
  verified_jobseekers as (
    select
      u.id,
      u.role,
      u.subtype,
      coalesce(
        nullif(concat_ws(' ', nullif(js.first_name, ''), nullif(js.middle_name, ''), nullif(js.surname, '')), ''),
        nullif(js.full_name, ''),
        nullif(u.name, ''),
        'Verified Worker'
      ) as display_name,
      array(
        select distinct skill
        from unnest(
          coalesce(js.predefined_skills, '{}'::text[]) ||
          coalesce(js.skills, '{}'::text[])
        ) as skill
        where nullif(skill, '') is not null
        order by skill
      ) as combined_skills
    from public.users u
    join public.jobseeker_profiles js on js.id = u.id
    where (u.role = 'user' and u.subtype = 'jobseeker')
      and (coalesce(js.is_verified, false) = true or js.jobseeker_status = 'verified')
  )
  select
    v.id,
    v.display_name as name,
    v.role,
    v.subtype,
    v.combined_skills as skills
  from verified_jobseekers v
  where lower(coalesce(p_trade_id, '')) = 'all'
    or exists (
    select 1
    from unnest(v.combined_skills) as worker_skill
    join trade_aliases ta
      on lower(worker_skill) like '%' || ta.alias || '%'
      or ta.alias like '%' || lower(worker_skill) || '%'
  )
  order by v.display_name;
$$;

revoke all on function public.get_diagnostic_workers(text) from public;
grant execute on function public.get_diagnostic_workers(text) to anon, authenticated;

create or replace function public.get_diagnostic_worker_counts()
returns table (
  trade_id text,
  worker_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with trade_aliases(trade_id, aliases) as (
    values
      ('plumbing', array[
        'plumbing', 'plumber', 'pipe fitting', 'pipefitting', 'water systems',
        'drainage', 'drain cleaning', 'faucet repair', 'toilet repair'
      ]::text[]),
      ('electrical', array[
        'electrical', 'electrician', 'electrical work', 'wiring',
        'circuit installation', 'electrical repair', 'lighting installation'
      ]::text[]),
      ('masonry', array[
        'masonry', 'mason', 'tile setting', 'tiling', 'concrete work',
        'cement work', 'plastering', 'bricklaying'
      ]::text[]),
      ('welding', array[
        'welding', 'welder', 'metal fabrication', 'steel work',
        'gate installation', 'fabricator'
      ]::text[]),
      ('carpentry', array[
        'carpentry', 'carpenter', 'carpentry work', 'woodworking',
        'cabinet making', 'furniture repair'
      ]::text[])
  ),
  aliases as (
    select trade_id, lower(alias) as alias
    from trade_aliases
    cross join lateral unnest(aliases) as alias
  ),
  verified_jobseekers as (
    select
      u.id,
      array(
        select distinct skill
        from unnest(
          coalesce(js.predefined_skills, '{}'::text[]) ||
          coalesce(js.skills, '{}'::text[])
        ) as skill
        where nullif(skill, '') is not null
      ) as combined_skills
    from public.users u
    join public.jobseeker_profiles js on js.id = u.id
    where (u.role = 'user' and u.subtype = 'jobseeker')
      and (coalesce(js.is_verified, false) = true or js.jobseeker_status = 'verified')
  ),
  matched_workers as (
    select distinct a.trade_id, v.id
    from aliases a
    join verified_jobseekers v on exists (
      select 1
      from unnest(v.combined_skills) as worker_skill
      where lower(worker_skill) like '%' || a.alias || '%'
        or a.alias like '%' || lower(worker_skill) || '%'
    )
  )
  select
    ta.trade_id,
    count(mw.id) as worker_count
  from trade_aliases ta
  left join matched_workers mw on mw.trade_id = ta.trade_id
  group by ta.trade_id
  order by ta.trade_id;
$$;

revoke all on function public.get_diagnostic_worker_counts() from public;
grant execute on function public.get_diagnostic_worker_counts() to anon, authenticated;
