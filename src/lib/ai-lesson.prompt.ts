import { z } from "zod";

export const AiLessonInput = z.object({
  explanation: z.string().min(5),
  characters: z.array(z.string()).default([]),
  /** Approximate number of messages the admin wants. */
  count: z.number().int().min(3).max(60).optional(),
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

export const AI_LESSON_SYSTEM = `أنت مساعد لبناء دروس تفاعلية عربية بأسلوب دولينجو.
تحوّل الشرح الخام إلى سلسلة فقاعات حوار قصيرة (سطر أو سطرين لكل فقاعة) بلغة عربية بسيطة ومرحة.
قواعد:
- كل عنصر يمثل رسالة واحدة.
- kind = "text" لفقاعة كلام، "image" حين يفيد وجود صورة توضيحية أو لقطة شاشة، "question" لسؤال اختيار من متعدد.
- عناصر image: في content تعليق قصير للطالب، وفي admin_note وصف دقيق ومفصّل للصورة المطلوبة (المحتوى، النص الظاهر داخلها، الألوان، نمط الرسم) حتى يستطيع الأدمن تنفيذها بنفسه.
- عناصر question: السؤال في content، و choices من 2 إلى 4 خيارات، و answer فهرس الإجابة الصحيحة (يبدأ من 0).
- وزّع الرسائل على الشخصيات المتاحة بالاسم في الحقل character (أو null).
- mood من: neutral, happy, sad, surprised, thinking, excited.
- أضف سؤالاً واحداً على الأقل كل 4-6 رسائل.
- التزم بعدد الرسائل المطلوب إن ذُكر (±2).
أعد JSON فقط بالشكل: {"steps":[...]}`;
