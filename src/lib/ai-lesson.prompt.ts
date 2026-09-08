import { z } from "zod";

/** Shared cast rules: only the teacher explains, students ask and react. */
export const CAST_RULES = `أدوار الشخصيات (لا تخالفها):
- "أ. سارة" هي المعلّمة الوحيدة في كورس أدوات الذكاء الاصطناعي: هي التي تشرح وتصحّح وتلخّص.
- "زكي" و"نور" و"ادم" طلاب: يسألون، يتحمّسون، يخطئون أحياناً، يلخّصون بكلماتهم، ولا يشرحون درساً جديداً أبداً.
- يُمنع تماماً استخدام "أ . رضا" أو "احمد" في كورس أدوات الذكاء الاصطناعي.
- لا تخترع أسماء غير الموجودة في قائمة الشخصيات المتاحة.`;

export const AiLessonInput = z.object({
  explanation: z.string().min(5),
  characters: z.array(z.string()).default([]),
  /** Approximate number of messages the admin wants. */
  count: z.number().int().min(3).max(60).optional(),
  /** Continuity context so the lesson links to the rest of the unit. */
  context: z
    .object({
      courseTitle: z.string().optional(),
      unitName: z.string().optional(),
      unitNumber: z.number().optional(),
      lessonTitle: z.string().optional(),
      lessonNumber: z.number().optional(),
      previousLesson: z.string().optional(),
      nextLesson: z.string().optional(),
    })
    .optional(),
  /** Ask the model to rewrite the lesson objectives + summary too. */
  withMeta: z.boolean().optional(),
  /** Short bios so every character keeps a consistent personality. */
  characterBios: z.array(z.object({ name: z.string(), bio: z.string().default("") })).default([]),
  /** Raw source article the lesson must be built from. */
  article: z.string().default(""),
  /** "physics" makes the model design interactive simulations instead of plain text. */
  mode: z.enum(["chat", "physics"]).default("chat"),
});

export const AiUnitInput = z.object({
  courseTitle: z.string().default("تعلم أدوات الذكاء الاصطناعي"),
  unitNumber: z.number().int().min(1),
  unitName: z.string().min(2),
  /** Free text: goals, ideas, tools, or anything the admin wants covered. */
  brief: z.string().min(5),
  lessonCount: z.number().int().min(3).max(12).default(10),
  /** Full source article / curriculum text the unit must be built from. */
  article: z.string().default(""),
  mode: z.enum(["chat", "physics"]).default("chat"),
});

export type AiSim = {
  title?: string;
  description?: string;
  vars: { key: string; label: string; min: number; max: number; step?: number; value: number; unit?: string }[];
  outputs?: { label: string; expr: string; unit?: string; decimals?: number }[];
  scene?: { kind?: string; x?: string; y?: string; size?: string; duration?: number; ground?: boolean; color?: string };
  task?: string;
};

export type AiStep = {
  kind: "text" | "image" | "video" | "question" | "simulation";
  character: string | null;
  mood: string;
  content: string;
  admin_note?: string | null;
  choices?: string[];
  answer?: number;
  sim?: AiSim;
};

export type AiLessonResult = {
  steps: AiStep[];
  objectives?: string[];
  summary_points?: string[];
};

export type AiUnitLesson = {
  title: string;
  description: string;
  intro_text: string;
  objectives: string[];
  summary_points: string[];
};

export const AI_LESSON_SYSTEM = `أنت مساعد لبناء دروس تفاعلية عربية بأسلوب دولينجو.
تحوّل الشرح الخام إلى سلسلة فقاعات حوار قصيرة (سطر أو سطرين لكل فقاعة) بلغة عربية بسيطة ومرحة تناسب المراهقين.
${CAST_RULES}
قواعد المحتوى:
- كل عنصر يمثل رسالة واحدة.
- ابدأ بربط سريع بالدرس السابق (إن وُجد) واختم بتشويق للدرس القادم (إن وُجد).
- محتوى جديد وممتع: مثال واقعي واحد على الأقل، وخطوة عملية يجربها الطالب بنفسه.
- kind = "text" لفقاعة كلام، "image" حين تفيد صورة توضيحية أو لقطة شاشة، "video" حين يفيد مقطع فيديو قصير، "question" لسؤال اختيار من متعدد.
- عناصر image: في content تعليق قصير للطالب، وفي admin_note وصف دقيق للصورة المطلوبة (المحتوى، النص الظاهر، الألوان، النمط) لينفّذها الأدمن.
- عناصر video: في content تمهيد قصير، وفي admin_note وصف دقيق للفيديو المطلوب (الفكرة، المدة، المشاهد، التعليق الصوتي) ليرفعه الأدمن.
- نوّع الرسائل: نص وصورة وفيديو وسؤال، ولا تجعل الدرس نصاً كله. صورة أو فيديو واحد على الأقل في كل درس.
- كل درس يضيف معلومات جديدة تبني على الدرس السابق ولا تكرره، بأسلوب قصة متصلة وممتعة.
- عناصر question: السؤال في content، و choices من 2 إلى 4 خيارات، و answer فهرس الإجابة الصحيحة (يبدأ من 0). السؤال يقيس فهماً حقيقياً لا حفظاً.
- mood من: neutral, happy, sad, surprised, thinking, excited.
- أضف سؤالاً واحداً على الأقل كل 4-6 رسائل.
- التزم بعدد الرسائل المطلوب إن ذُكر (±2).
- إن طُلب objectives و summary_points: 3 أهداف تبدأ بفعل واضح («تعرف…»، «تستخدم…»، «تصمّم…») وتصف ما سيتقنه الطالب فعلاً في هذا الدرس تحديداً، و3 نقاط خلاصة قصيرة.
- إن أُعطيت لك «المقال المصدر» فالتزم بمعلوماته وحقائقه ولا تخرج عنه، ووزّع محتواه على الرسائل بترتيب منطقي مع قصة وربط بين الرسائل.
- إن أُعطيت أوصاف الشخصيات فالتزم بشخصية كل واحد وطريقة كلامه.
أعد JSON فقط بالشكل: {"objectives":[...],"summary_points":[...],"steps":[...]}`;

export const AI_UNIT_SYSTEM = `أنت مصمّم مناهج عربية تفاعلية بأسلوب دولينجو.
تبني خطة وحدة كاملة مترابطة: كل درس يبني على الذي قبله وينتهي بمشروع صغير في الدرس الأخير.
${CAST_RULES}
قواعد:
- عنوان كل درس قصير وجاذب ومختلف عن غيره، ومرتب من الأسهل إلى الأصعب.
- description سطر واحد يشرح فكرة الدرس.
- intro_text سطر تحفيزي يربط الدرس بالذي قبله.
- objectives: 3 أهداف تبدأ بفعل واضح («تعرف…»، «تستخدم…»، «تصمّم…») وتخص هذا الدرس تحديداً. لا تكرر عنوان الدرس كهدف ولا تكتب أهدافاً عامة.
- summary_points: 3 نقاط خلاصة قصيرة.
أعد JSON فقط بالشكل: {"lessons":[{"title":"","description":"","intro_text":"","objectives":["","",""],"summary_points":["","",""]}]}`;


/** Extra rules for the interactive physics course. */
export const AI_PHYSICS_RULES = `هذا كورس تجارب فيزيائية تفاعلية، لذلك:
- استخدم kind = "simulation" مرة على الأقل كل 4-6 رسائل: تجربة يلعب بها الطالب بنفسه.
- عنصر simulation يحتوي حقل sim بالشكل:
  {"title":"","description":"","vars":[{"key":"m","label":"الكتلة","min":1,"max":20,"step":0.5,"value":5,"unit":"كجم"}],
   "outputs":[{"label":"القوة","expr":"m*a","unit":"نيوتن","decimals":2}],
   "scene":{"kind":"ball","x":"10 + 80*(t/3)","y":"10","size":"5 + m","duration":3,"ground":true},
   "task":"جرّب زيادة الكتلة ولاحظ ماذا يحدث للتسارع."}
- key لكل متغير حرف/كلمة إنجليزية بدون مسافات، وتُستخدم داخل expr.
- expr صيغة رياضية بلغة JavaScript فقط (+ - * / ** Math.sin Math.cos Math.sqrt) وتستعمل مفاتيح المتغيرات و t (الزمن بالثواني).
- x و y و size تعطي أرقاماً من 0 إلى 100 (نسبة من مساحة المشهد) — اجعل الحركة صحيحة فيزيائياً حسب القانون.
- اشرح القانون في رسالة نصية قبل التجربة، واسأل سؤالاً بعدها عن العلاقة التي لاحظها الطالب.`;
