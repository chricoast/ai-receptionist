-- Owners now describe their type of business in their own words
-- (e.g. "Tetovací studio a piercing") instead of picking from a fixed list.

alter table public.businesses drop constraint if exists businesses_type_check;

-- Turn the old fixed values into readable text in the business's main language.
update public.businesses
set type = case
  when languages[1] = 'en' then case type
    when 'salon' then 'Hair or beauty salon'
    when 'barber' then 'Barbershop'
    when 'clinic' then 'Physiotherapy, massage and health care'
    when 'tattoo' then 'Tattoo studio'
    when 'studio' then 'Pilates, yoga or fitness studio'
    when 'cafe' then 'Café'
    when 'restaurant' then 'Restaurant'
    when 'service_shop' then 'Service shop or e-shop'
    when 'other' then ''
    else type end
  else case type
    when 'salon' then 'Kadeřnictví nebo kosmetika'
    when 'barber' then 'Barbershop'
    when 'clinic' then 'Fyzioterapie, masáže a zdravotní péče'
    when 'tattoo' then 'Tetovací studio'
    when 'studio' then 'Pilates, jóga nebo fitness studio'
    when 'cafe' then 'Kavárna'
    when 'restaurant' then 'Restaurace'
    when 'service_shop' then 'Servis nebo e-shop'
    when 'other' then ''
    else type end
  end;

alter table public.businesses
  alter column type set default '',
  add constraint businesses_type_length check (char_length(type) <= 100);
