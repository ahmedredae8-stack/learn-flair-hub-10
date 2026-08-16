UPDATE public.courses SET highlights = '["100 درس تفاعلي بأسلوب المحادثة","مشاريع عملية بأدوات حقيقية","شهادة تقدم ونقاط XP"]'::jsonb WHERE slug = 'ai-tools';
UPDATE public.courses SET highlights = '["من الفكرة إلى منتج ملموس","إلكترونيات وطباعة ثلاثية الأبعاد","تجارب عملية آمنة للأطفال"]'::jsonb WHERE slug = 'physical-world';

INSERT INTO public.courses (slug, title, subtitle, emoji, color, status, coming_soon, order_index, is_paid, price, highlights)
VALUES
 ('design', 'التصميم الرقمي بالذكاء الاصطناعي', 'تعلّم تصميم الواجهات والهوية البصرية بأدوات الذكاء الاصطناعي.', '🎨', 'accent', 'published', true, 3, true, 199, '["أساسيات الألوان والخطوط","تصميم شعار وهوية كاملة","تحويل الفكرة إلى واجهة تطبيق"]'::jsonb),
 ('coding', 'البرمجة للمبتكرين الصغار', 'من أول سطر كود إلى تطبيق حقيقي يعمل على الإنترنت.', '💻', 'primary', 'published', true, 4, true, 249, '["مفاهيم البرمجة بأسلوب مبسّط","بناء موقعك الأول خطوة بخطوة","استخدام الذكاء الاصطناعي كمساعد برمجة"]'::jsonb),
 ('products', 'بناء وإطلاق المنتجات', 'كيف تحوّل مشروعك إلى منتج يستخدمه الناس فعلاً.', '🚀', 'streak', 'published', true, 5, true, 299, '["دراسة الفكرة والجمهور","بناء نموذج أولي سريع","الإطلاق والتسويق الذكي"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;