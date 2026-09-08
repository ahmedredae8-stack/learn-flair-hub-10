create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  msg_count int not null default 18,
  mode text not null default 'chat',
  character_ids uuid[] not null default '{}',
  brief text not null default '',
  article text not null default '',
  status text not null default 'pending',
  attempts int not null default 0,
  error text,
  priority int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_jobs_pending_idx on public.ai_jobs (status, priority, created_at);
create unique index if not exists ai_jobs_lesson_unique on public.ai_jobs (lesson_id);
grant select, insert, update, delete on public.ai_jobs to authenticated;
grant all on public.ai_jobs to service_role;
alter table public.ai_jobs enable row level security;
drop policy if exists "admins manage ai jobs" on public.ai_jobs;
create policy "admins manage ai jobs" on public.ai_jobs for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.characters (name, bio, color, moods)
select 'أ. مروان', 'معلّم كورس الإبداع والابتكار: هادئ، عملي، يشرح بأمثلة من الحياة اليومية ويطرح أسئلة تجعل الطالب يفكر بنفسه. هو الوحيد الذي يشرح في هذا الكورس.', 'violet', '{}'::jsonb
where not exists (select 1 from public.characters where name = 'أ. مروان');
insert into public.characters (name, bio, color, moods)
select 'لمى', 'طالبة في كورس الإبداع والابتكار: فضولية، سريعة الحماس، تسأل أسئلة ذكية وتخطئ أحياناً ثم تصحّح، وتلخّص ما فهمته بكلماتها.', 'amber', '{}'::jsonb
where not exists (select 1 from public.characters where name = 'لمى');

insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 1, 'التفكير الإبداعي وكسر القوالب', '🧠', 'violet', 'المحور 1: التفكير الإبداعي وكسر القوالب', 1) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',1,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['العصف الذهني العاكس (Reverse Brainstorming)','تطبيق تقنية SCAMPER لتطوير الأفكار والمنتجات','التفكير الجانبي (Lateral Thinking) للخروج عن المألوف','الربط العشوائي بين مفاهيم غير مرتبطة لتوليد أفكار جديدة','التفكير من المبادئ الأولى (First Principles Thinking)','كسر الافتراضات الضمنية والبديهيات المسبقة','التفكير بالقياس والاستعارة (Analogical Thinking)','إعادة التأطير الإيجابي والسلبي للمشكلات','استخدام قبعات التفكير الست لإدارة جلسات الإبداع','التفكير الاستباقي للسيناريوهات المستقبلية (Futures Thinking)','تحويل القيود والتقلبات إلى فرص إبداعية','التفكير البصري والخرائط الذهنية','رسم الخرائط المفاهيمية المعقدة','التفكير المرن والتقبل العالي للغموض','الدمج بين أفكار متناقضة لتوليد حلول هجينة']) with ordinality as x(t,i);
insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 2, 'تفكيك المشكلات وصياغتها', '🔍', 'sky', 'المحور 2: تفكيك المشكلات وصياغتها', 2) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',2,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['تحليل الأسباب الجذرية باستخدام تقنية (5 Whys)','رسم مخطط سبب ونتيجة (Ishikawa Diagram)','التمييز بين أعراض المشكلة وسببها الحقيقي','تحديد الفجوات في السوق والتجارب الحالية','صياغة أسئلة "كيف يمكننا...؟" (How Might We)','تحليل بيئة المشكلة وتأثيراتها المتعددة','تحديد أصحاب المصلحة المتأثرين بالمشكلة','تحديد أولويات المشكلات حسب الأثر والسهولة','تحليل التوجهات والأنماط السلوكية المسببة للمشكلة','دراسة نقاط الألم (Pain Points) لدى الجمهور','فهم السياق الثقافي والاجتماعي للمشكلة','تحليل القيود الاقتصادية والتنظيمية','صياغة بيان المشكلة الموجه بالإنسان (Human-Centered Statement)','قياس حجم المشكلة وتأثيرها المالي والاجتماعي','رصد التغييرات السريعة والفرص الطارئة']) with ordinality as x(t,i);
insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 3, 'تصميم تجربة المستخدم (UX Design)', '🎯', 'amber', 'المحور 3: تصميم تجربة المستخدم (UX Design)', 3) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',3,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['إجراء المقابلات المتعمقة مع المستخدمين','الملاحظة الميدانية والمحاكاة السلوكية','بناء شخصيات المستخدمين (User Personas)','رسم خرائط رحلة المستخدم (User Journey Mapping)','تحديد نقاط الاحتكاك (Friction Points) في الرحلة','تصميم خرائط التعاطف (Empathy Maps)','تحليل هندسة المعلومات وتطبيقها (Information Architecture)','تصميم تدفقات المستخدم (User Flows)','صياغة رحلات تجربة العملاء الملموسة والرقمية','تطبيق المراحل الخمس للتفكير التصميمي (Design Thinking)','تصميم واجهات مفهومية مبسطة (Wireframing)','تطبيق مبادئ سهولة الاستخدام (Usability Principles)','تحليل تجربة المنافسين واستخراج الفجوات','تصميم لحظات الانبهار (Aha! Moments) للمستخدم','كتابة نصوص تجربة المستخدم (UX Writing)','قياس رضا المستخدم عبر مؤشرات الملاحظة','مراعاة إمكانية الوصول الشامل للجميع (Accessibility)','تصميم التجارب المشتركة بين عدة أطراف','تبسيط الخطوات المعقدة لتجربة خالية من المجهود','تقييم الانطباع النفسي والعاطفي للمنتج']) with ordinality as x(t,i);
insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 4, 'الابتكار الاجتماعي والاقتصادي', '🌍', 'emerald', 'المحور 4: الابتكار الاجتماعي والاقتصادي', 4) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',4,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['تطبيق نماذج الأعمال الدائرية والمستدامة','الابتكار في نماذج الإيرادات وتسعير الخدمات','تصميم حلول ذات أثر اجتماعي مستدام','فهم الاقتصاد السلوكي وتوجيه الخيارات (Nudge Theory)','الابتكار المقتصد (Frugal Innovation) المعتمد على موارد محدودة','تصميم مبادرات المشاركة المجتمعية','الابتكار المفتوح والتشارك مع المجتمعات (Open Innovation)','تقييم العائد الاجتماعي على الاستثمار (SROI)','تصميم خدمات عامة ومجتمعية مبتكرة','دمج أهداف التنمية المستدامة (SDGs) في المشاريع','صياغة القيمة المضافة الحصرية (Value Proposition)','الابتكار في أساليب التوزيع والتوصيل','فهم سلوك المستهلك وتغير الأولويات الاقتصادية','تحويل الخدمات التقليدية إلى نماذج قائمة على الاشتراكات أو المنصات','الابتكار في أدوات التمويل (كالتمويل الجماعي)','تصميم أنظمة التحفيز والمكافآت السلوكية','الابتكار الشامل (Inclusive Innovation) للفئات الفقيرة أو المهمشة','دراسة الآثار الجانبية غير المقصودة للحلول','تصميم حلول تتكيف مع التضخم وتقلبات الأسواق','بناء شراكات استراتيجية بين القطاع العام والخاص والمجتمعي']) with ordinality as x(t,i);
insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 5, 'تطوير النماذج الأولية والتجريب', '🧪', 'rose', 'المحور 5: تطوير النماذج الأولية والتجريب', 5) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',5,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['بناء نموذج أولي سريع منخفض الدقة (Low-Fidelity Prototype)','تطبيق تقنية "ساحر أوز" (Wizard of Oz Testing)','إنشاء منتج أدنى قابل للتطبيق (MVP)','تصميم تجارب الاختبار الميداني للحلول','إجراء اختبارات أ/ب (A/B Testing) للأفكار','جمع الملاحظات والتعليقات الميدانية وتحليلها','التكرار والتطوير السريع (Rapid Iteration)','تصميم محاكاة ورقية وهيكلية للتطبيقات والخدمات','تقليل تكلفة وزمن اختبار الفكرة','تحديد فرضيات النجاح الحرجة واختبارها أولاً','التخلي عن الأفكار الفاشلة بسرعة وبأقل خسارة (Fail Fast)','قياس مؤشرات الأداء الخاصة بالابتكار','تحويل التغذية الراجعة إلى تعديلات ملموسة','اختبار الحلول مع شرائح مستخدمين مختلفة','تصميم النماذج الأولية للخدمات والعمليات']) with ordinality as x(t,i);
insert into public.units (course_id, number, name, emoji, color, description, order_index) values ('d6db2ea1-7d4b-4d8b-b390-018b72d2ce58', 6, 'إدارة الابتكار وتسويق الأفكار', '📈', 'indigo', 'المحور 6: إدارة الابتكار وتسويق الأفكار', 6) on conflict do nothing;
insert into public.lessons (course_id,unit,title,description,intro_text,objectives,summary_points,status,xp_reward,order_index) select 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58',6,t,t,'','[]'::jsonb,'[]'::jsonb,'draft',15,i from unnest(array['سرد القصص للتأثير والإقناع (Storytelling for Innovation)','تقديم العروض التقديمية الابتكارية (Pitching)','إدارة محفظة الأفكار وتصنيفها حسب المخاطرة','بناء ثقافة تقبل المخاطرة والتجريب داخل الفريق','حماية الملكية الفكرية والأفكار المبتكرة','إدارة التغيير ومقاومة التطوير لدى المستفيدين','التخطيط لتقليل مخاطر التوسع في الحل','تسهيل ورش العمل الإبداعية وجلسات العصف الذهني','قياس جاهزية السوق لاستقبال الحل الجديد','التوفيق بين الميزانيات المتاحة وطموح الابتكار','بناء استراتيجيات التوسع للحلول الإبداعية (Scaling)','قياس الأثر البيئي والاجتماعي طويل المدى','إدارة فرق عمل متعددة التخصصات','ربط الأفكار المبتكرة برؤية المنظمة وأهدافها','التقييم الذاتي وتطوير الحس الإبداعي الشخصي المستمر']) with ordinality as x(t,i);

insert into public.ai_jobs (lesson_id, msg_count, mode, character_ids, brief, priority)
select l.id, 18, 'chat',
  array(select id from public.characters where name in ('أ. سارة','زكي','نور','ادم')),
  'كورس أدوات الذكاء الاصطناعي — الوحدة ' || l.unit || ': درس «' || l.title || '». محتوى جديد تماماً ومترابط مع بقية دروس الوحدة، شرح مبسط جداً وأمثلة عملية.',
  10
from public.lessons l
where l.course_id = 'd6551db0-8926-465f-8c60-92d41fd0bd3f'
  and l.unit between 4 and 10
  and (select count(*) from public.lesson_steps s where s.lesson_id = l.id) < 15
on conflict (lesson_id) do nothing;

insert into public.ai_jobs (lesson_id, msg_count, mode, character_ids, brief, priority)
select l.id, 20, 'chat',
  array(select id from public.characters where name in ('أ. مروان','لمى')),
  'كورس الإبداع والابتكار الأصيل — المحور ' || l.unit || ': ' || coalesce(u.name,'') || '. درس «' || l.title || '». اشرح المهارة بأسلوب مبسط جداً مع قصة وأمثلة واقعية وخطوة عملية يجربها الطالب، واربط الدرس بما قبله وما بعده.',
  20
from public.lessons l
left join public.units u on u.course_id = l.course_id and u.number = l.unit
where l.course_id = 'd6db2ea1-7d4b-4d8b-b390-018b72d2ce58'
on conflict (lesson_id) do nothing;