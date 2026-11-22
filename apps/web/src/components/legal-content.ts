import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { absoluteUrl } from "../lib/site";

export type LegalPageKey = "about" | "privacy" | "terms" | "contact";

type LegalContent = {
  title: string;
  description: string;
  paragraphs: string[];
  email?: string;
};

export const PAGE_PATHS: Record<LegalPageKey, string> = {
  about: "a-propos",
  privacy: "confidentialite",
  terms: "conditions",
  contact: "contact",
};

const EMAIL = "benwahab111@gmail.com";

export const legalContent: Record<LegalPageKey, Record<Locale, LegalContent>> = {
  about: {
    fr: {
      title: "À propos d'UPK",
      description: "Un guide local simple et rapide pour trouver les lieux utiles au Niger.",
      paragraphs: [
        "UPK rassemble les lieux utiles de Niamey et du Niger : pharmacies, restaurants, garages, écoles, services publics et bien d'autres.",
        "Les données initiales proviennent d'OpenStreetMap. Les contributeurs peuvent proposer de nouveaux lieux ; chaque proposition est vérifiée avant publication.",
        "Le service est pensé pour les connexions lentes et les téléphones Android d'entrée de gamme. La recherche fonctionne sans compte.",
        "Une question, une correction ou un partenariat ? Écrivez-nous.",
      ],
      email: EMAIL,
    },
    en: {
      title: "About UPK",
      description: "A simple, fast local guide to useful places in Niger.",
      paragraphs: [
        "UPK brings together useful places in Niamey and Niger: pharmacies, restaurants, garages, schools, public services and more.",
        "Initial data comes from OpenStreetMap. Contributors can suggest new places; every suggestion is reviewed before publication.",
        "The service is designed for slow connections and entry-level Android phones. Search works without an account.",
        "A question, a correction or a partnership? Write to us.",
      ],
      email: EMAIL,
    },
    ar: {
      title: "حول UPK",
      description: "دليل محلي بسيط وسريع للعثور على الأماكن المفيدة في النيجر.",
      paragraphs: [
        "يجمع UPK الأماكن المفيدة في نيامي والنيجر: الصيدليات والمطاعم وورش السيارات والمدارس والخدمات العامة وغيرها.",
        "تأتي البيانات الأولية من OpenStreetMap. يمكن للمساهمين اقتراح أماكن جديدة، وتُراجع كل مساهمة قبل النشر.",
        "صُمم الموقع للاتصالات البطيئة والهواتف الذكية الاقتصادية. ويعمل البحث دون حساب.",
        "لديك سؤال أو تصحيح أو شراكة؟ راسلنا.",
      ],
      email: EMAIL,
    },
  },
  privacy: {
    fr: {
      title: "Politique de confidentialité",
      description: "Quelles données UPK conserve et pourquoi.",
      paragraphs: [
        "UPK ne demande aucun compte pour rechercher un lieu. Les recherches ne sont pas rattachées à une identité.",
        "Lors d'une proposition ou d'un signalement, nous conservons les informations que vous saisissez (nom du lieu, adresse, coordonnées, description, email de contact) et, si vous êtes connecté, l'identifiant de votre compte. Ces données servent uniquement à traiter votre demande.",
        "Les photos envoyées sont stockées dans Cloudflare R2 et rattachées à la proposition. Elles sont publiées avec la fiche si la proposition est acceptée.",
        "Les adresses IP sont utilisées sous forme hachée pour limiter les abus. Elles ne sont pas affichées publiquement.",
        "Les données sont conservées le temps nécessaire au traitement et à la modération. Vous pouvez demander la suppression de vos données en écrivant à l'adresse ci-dessous.",
        "Le site utilise un cookie de session uniquement lorsque vous vous connectez. Aucun cookie publicitaire n'est utilisé.",
      ],
      email: EMAIL,
    },
    en: {
      title: "Privacy policy",
      description: "What data UPK keeps and why.",
      paragraphs: [
        "UPK does not require an account to search for a place. Searches are not linked to an identity.",
        "When you submit a suggestion or a report, we keep the information you enter (place name, address, coordinates, description, contact email) and, if signed in, your account ID. This data is used only to process your request.",
        "Uploaded photos are stored in Cloudflare R2 and linked to the suggestion. They are published with the place if the suggestion is approved.",
        "IP addresses are used in hashed form for abuse prevention. They are not displayed publicly.",
        "Data is kept for as long as needed for processing and moderation. You can request deletion by writing to the address below.",
        "The site uses a session cookie only when you sign in. No advertising cookies are used.",
      ],
      email: EMAIL,
    },
    ar: {
      title: "سياسة الخصوصية",
      description: "ما البيانات التي يحتفظ بها UPK ولماذا.",
      paragraphs: [
        "لا يتطلب UPK حسابًا للبحث عن مكان. ولا تُربط عمليات البحث بأي هوية.",
        "عند إرسال اقتراح أو بلاغ، نحتفظ بالمعلومات التي تدخلها (اسم المكان، العنوان، الإحداثيات، الوصف، البريد الإلكتروني) ومعرّف حسابك إن كنت مسجلاً. تُستخدم هذه البيانات لمعالجة طلبك فقط.",
        "تُخزن الصور المرسلة في Cloudflare R2 وترتبط بالاقتراح، وتُنشر مع المكان إذا تمت الموافقة على الاقتراح.",
        "تُستخدم عناوين IP بصيغة مجزأة لمنع الإساءة، ولا تُعرض علنًا.",
        "تُحفظ البيانات للمدة اللازمة للمعالجة والإشراف. يمكنك طلب حذف بياناتك بمراسلتنا على العنوان أدناه.",
        "يستخدم الموقع ملف تعريف ارتباط للجلسة فقط عند تسجيل الدخول، ولا يستخدم ملفات تعريف ارتباط إعلانية.",
      ],
      email: EMAIL,
    },
  },
  terms: {
    fr: {
      title: "Conditions d'utilisation",
      description: "Les règles d'usage du guide UPK.",
      paragraphs: [
        "UPK est un service d'information local. Les fiches peuvent contenir des erreurs ou être incomplètes ; vérifiez les informations importantes avant de vous déplacer.",
        "En proposant un lieu, vous confirmez que les informations sont exactes et que vous avez le droit de les partager. N'envoyez pas de contenu illégal, trompeur ou appartenant à un tiers.",
        "Les propositions sont modérées. UPK peut refuser ou retirer un contenu, notamment en cas de doublon, d'information inexacte ou de non-respect de ces conditions.",
        "Les données OpenStreetMap restent soumises à la licence ODbL et à l'attribution aux contributeurs OpenStreetMap.",
        "Le service est fourni en l'état, sans garantie de disponibilité ni d'exactitude. UPK ne peut être tenu responsable des décisions prises à partir des informations du guide.",
      ],
      email: EMAIL,
    },
    en: {
      title: "Terms of use",
      description: "The rules for using the UPK guide.",
      paragraphs: [
        "UPK is a local information service. Listings may contain errors or be incomplete; verify important information before travelling.",
        "By suggesting a place, you confirm that the information is accurate and that you have the right to share it. Do not send illegal, misleading or third-party content.",
        "Suggestions are moderated. UPK may refuse or remove content, especially for duplicates, inaccurate information or breaches of these terms.",
        "OpenStreetMap data remains subject to the ODbL licence and attribution to OpenStreetMap contributors.",
        "The service is provided as is, without any guarantee of availability or accuracy. UPK cannot be held liable for decisions made from the guide's information.",
      ],
      email: EMAIL,
    },
    ar: {
      title: "شروط الاستخدام",
      description: "قواعد استخدام دليل UPK.",
      paragraphs: [
        "UPK خدمة معلومات محلية. قد تحتوي البطاقات على أخطاء أو تكون غير مكتملة؛ تحقق من المعلومات المهمة قبل التوجه إلى المكان.",
        "بإرسال مكان، تؤكد أن المعلومات صحيحة وأن لديك الحق في مشاركتها. لا ترسل محتوى غير قانوني أو مضللاً أو مملوكًا لطرف ثالث.",
        "تُراجع الاقتراحات. ويمكن لـ UPK رفض المحتوى أو إزالته، خاصة عند التكرار أو عدم الدقة أو مخالفة هذه الشروط.",
        "تخضع بيانات OpenStreetMap لرخصة ODbL وللإسناد إلى مساهمي OpenStreetMap.",
        "تُقدَّم الخدمة كما هي، دون ضمان التوفر أو الدقة. ولا يتحمل UPK مسؤولية القرارات المتخذة بناءً على معلومات الدليل.",
      ],
      email: EMAIL,
    },
  },
  contact: {
    fr: {
      title: "Contact",
      description: "Écrivez à l'équipe UPK.",
      paragraphs: [
        "Pour une correction, une proposition, un partenariat ou une question sur vos données, écrivez-nous.",
        "Nous répondons en général sous quelques jours ouvrés.",
      ],
      email: EMAIL,
    },
    en: {
      title: "Contact",
      description: "Write to the UPK team.",
      paragraphs: [
        "For a correction, a suggestion, a partnership or a question about your data, write to us.",
        "We usually reply within a few working days.",
      ],
      email: EMAIL,
    },
    ar: {
      title: "اتصل بنا",
      description: "راسل فريق UPK.",
      paragraphs: [
        "للتصحيح أو الاقتراح أو الشراكة أو أي سؤال حول بياناتك، راسلنا.",
        "نرد عادة خلال بضعة أيام عمل.",
      ],
      email: EMAIL,
    },
  },
};

export function legalHead(page: LegalPageKey, locale: Locale) {
  const content = legalContent[page][locale];
  const path = `/${locale}/${PAGE_PATHS[page]}`;
  return {
    meta: [
      { title: `${content.title} — ${t(locale, "app.name")}` },
      { name: "description", content: content.description },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl(path) },
      ...(["fr", "en", "ar"] as const).map((code) => ({
        rel: "alternate",
        hrefLang: code,
        href: absoluteUrl(`/${code}/${PAGE_PATHS[page]}`),
      })),
      {
        rel: "alternate",
        hrefLang: "x-default",
        href: absoluteUrl(`/fr/${PAGE_PATHS[page]}`),
      },
    ],
  };
}
