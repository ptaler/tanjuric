-- Antipiretici (lijekovi za snižavanje temperature).
-- meds.antipyretic: lijek je antipiretik (npr. Neofen, Lupocet).
-- doses.antipyretic: kopija oznake u trenutku upisa (vrijedi i ako se lijek ukloni iz popisa).
-- doses.temp_id: mjerenje temperature uz koje je doza dana (iz obrasca za temperaturu).

alter table public.meds  add column antipyretic boolean not null default false;
alter table public.doses add column antipyretic boolean not null default false;
alter table public.doses add column temp_id text check (char_length(temp_id) <= 64);

-- Postojeći lijekovi i doze s poznatim nazivima antipiretika.
update public.meds  set antipyretic = true
  where name ~* '(neofen|nurofen|ibuprofen|brufen|ibuprom|dalsy|lupocet|paracetamol|panadol|plicet|efferalgan|calpol|perfalgan|daleron|febricet|paracet)';
update public.doses set antipyretic = true
  where med_name ~* '(neofen|nurofen|ibuprofen|brufen|ibuprom|dalsy|lupocet|paracetamol|panadol|plicet|efferalgan|calpol|perfalgan|daleron|febricet|paracet)';
