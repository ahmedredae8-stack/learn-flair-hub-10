UPDATE public.courses SET cover_url = '/covers/design.jpg' WHERE slug = 'design';
UPDATE public.courses SET cover_url = '/covers/physical-world.jpg' WHERE slug = 'physical-world';
UPDATE public.courses SET cover_url = '/covers/ai-tools.jpg' WHERE slug = 'ai-tools';
UPDATE public.courses SET cover_url = '/covers/coding.jpg' WHERE slug = 'coding';
UPDATE public.courses SET cover_url = '/covers/products.jpg' WHERE slug = 'products';

INSERT INTO public.courses (slug, title, subtitle, emoji, color, cover_url, highlights, status, coming_soon, is_paid, price, order_index)
SELECT 'physics', 'تجارب فيزيائية تفاعلية', 'جرّب القوانين بنفسك وغيّر الأرقام وشوف النتيجة', '🧪', '#7c3aed', '/covers/physics.jpg',
  '["محاكاة حية لكل تجربة","تحكّم بالكتلة والسرعة والكثافة","اكتشف القانون بالتجربة"]'::jsonb,
  'published', false, false, 0,
  (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.courses)
WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE slug = 'physics');

INSERT INTO public.units (course_id, number, name, emoji, color, description, order_index)
SELECT c.id, 1, 'الحركة والقوى', '🏃', '#7c3aed', 'تجارب حيّة على السرعة والتسارع والقوة والاحتكاك', 1
FROM public.courses c
WHERE c.slug = 'physics'
  AND NOT EXISTS (SELECT 1 FROM public.units u WHERE u.course_id = c.id AND u.number = 1);