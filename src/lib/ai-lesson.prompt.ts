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
});

export const AiUnitInput = z.object({
  courseTitle: z.string().default("تعلم أدوات الذكاء الاصطناعي"),
  unitNumber: z.number().int().min(1),
  unitName: z.string().min(2),
  /** Free text: goals, ideas, tools, or anything the admin wants covered. */
  brief: z.string().min(5),
  lessonCount: z.number().int().min(3).max(12).default(10),
});

export type AiStep = {
  kind: "text" | "image" | "question";
  character: string | null;
  mood: string;
  content: string;
  admin_note?: string | null;
  choices?: string[];
  answer?: number;
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
- kind = "text" لفقاعة كلام، "image" حين تفيد صورة توضيحية أو لقطة شاشة، "question" لسؤال اختيار من متعدد.
- عناصر image: في content تعليق قصير للطالب، وفي admin_note وصف دقيق للصورة المطلوبة (المحتوى، النص الظاهر، الألوان، النمط) لينفّذها الأدمن.
- عناصر question: السؤال في content، و choices من 2 إلى 4 خيارات، و answer فهرس الإجابة الصحيحة (يبدأ من 0). السؤال يقيس فهماً حقيقياً لا حفظاً.
- mood من: neutral, happy, sad, surprised, thinking, excited.
- أضف سؤالاً واحداً على الأقل كل 4-6 رسائل.
- التزم بعدد الرسائل المطلوب إن ذُكر (±2).
- إن طُلب objectives و summary_points: 3 أهداف تبدأ بفعل واضح («تعرف…»، «تستخدم…»، «تصمّم…») وتصف ما سيتقنه الطالب فعلاً في هذا الدرس تحديداً، و3 نقاط خلاصة قصيرة.
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
