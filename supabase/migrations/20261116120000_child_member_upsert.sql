-- Član podijeljenog djeteta nije mogao spremiti ime ni alergije.
--
-- Aplikacija sprema djecu s upsert (INSERT ... ON CONFLICT DO UPDATE), a Postgres
-- na tom putu uvijek provjerava i INSERT politiku za predloženi redak. "children:
-- insert own" je dopuštala samo vlasnika pa je članov upsert padao s 42501.
--
-- Proširujemo INSERT provjeru na podijeljeno dijete. Takav INSERT nikad ne stvara
-- novi redak: članstvo postoji samo dok postoji dijete (FK s on delete cascade),
-- pa upsert uvijek završi kao UPDATE koji već pokriva "children: update own or shared".

drop policy "children: insert own" on public.children;
create policy "children: insert own or upsert shared" on public.children for insert to authenticated
  with check (user_id = (select auth.uid())
    or (user_id, id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())));
