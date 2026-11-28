export const assistantLanguages = ["fr", "en", "ar"] as const;
export type AssistantLanguage = (typeof assistantLanguages)[number];

export const assistantLanguageLabels: Record<AssistantLanguage, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export const assistantLanguageDirections: Record<AssistantLanguage, "ltr" | "rtl"> = {
  fr: "ltr",
  en: "ltr",
  ar: "rtl",
};

export const assistantVoiceSupport: Record<AssistantLanguage, "native" | "experimental"> = {
  fr: "native",
  en: "native",
  ar: "native",
};

const fr = {
  "assistant.name": "Ben",
  "assistant.welcome": "Bonsoir, je suis Ben. Que puis-je faire pour vous ?",
  "assistant.open": "Ouvrir l’assistant vocal",
  "assistant.close": "Fermer l’assistant",
  "assistant.language": "Langue de l’assistant",
  "assistant.greetingMorning": "Bonsoir, je suis Ben. Que puis-je faire pour vous ?",
  "assistant.greetingEvening": "Bonsoir, je suis Ben. Que puis-je faire pour vous ?",
  "assistant.ask": "Que souhaitez-vous rechercher aujourd’hui ?",
  "assistant.travelQuestion": "Bien sûr. Vous souhaitez voyager par avion, par bus ou depuis une auto-gare ?",
  "assistant.travelClarify": "Je n’ai pas reconnu le moyen de transport. Vous préférez l’avion, le bus ou le train ?",
  "assistant.listening": "Écoute…",
  "assistant.thinking": "Je cherche…",
  "assistant.speaking": "Je parle…",
  "assistant.stop": "Arrêter la voix",
  "assistant.inputPlaceholder": "Écrivez votre recherche…",
  "assistant.send": "Envoyer",
  "assistant.mic": "Parler à l’assistant",
  "assistant.micUnavailable": "Le microphone n’est pas disponible sur cet appareil.",
  "assistant.voiceUnavailable": "La voix n’est pas disponible sur cet appareil.",
  "assistant.voiceActivate": "Activer la voix",
  "assistant.voiceNotAllowed":
    "La lecture automatique est bloquée. Touchez « Activer la voix » pour entendre l’accueil.",
  "assistant.greetingToggle": "Accueil vocal",
  "assistant.greetingOn": "Accueil vocal activé.",
  "assistant.greetingOff": "Accueil vocal désactivé.",
  "assistant.notUnderstood":
    "Désolé, je n'ai pas bien compris votre demande. Pouvez-vous l'écrire pour que je puisse vous aider ?",
  "assistant.repeat": "Répéter",
  "assistant.writeInstead": "Écrire la demande",
  "assistant.contribute": "Ajouter ce lieu",
  "assistant.notFound":
    "Je n'ai pas trouvé cet endroit dans UPK.\n\nVous rendez-vous à cet endroit actuellement ? Si oui, vous pouvez l'ajouter à UPK pour permettre à d'autres utilisateurs de le retrouver.",
  "assistant.locationNeeded":
    "Activez la localisation pour calculer les distances et trouver les lieux proches.",
  "assistant.networkError":
    "La recherche n’a pas abouti. Vérifiez votre connexion, puis réessayez ou écrivez votre demande.",
  "assistant.found": "J’ai trouvé {name}.",
  "assistant.atDistance": "à {distance}.",
  "assistant.categoryCount": "{count} résultats pour {category}.",
  "assistant.criteriaUnavailable": "Je n’ai pas trouvé de fiche indiquant « {criterion} ». Voici tout de même {count} établissements de la catégorie {category} ; leurs fiches permettront de vérifier.",
  "assistant.nearest": "Le plus proche est {name}, à {distance}.",
  "assistant.quarterCount": "Le quartier {name} contient {count} lieux.",
  "assistant.cityCount": "La ville {name} contient {count} lieux.",
  "assistant.suggestion":
    "Je n’ai pas trouvé exactement « {query} ». Vouliez-vous dire « {suggestion} » ?",
  "assistant.multiple": "Plusieurs lieux correspondent. Lequel cherchez-vous ?",
  "assistant.next": "Suivant",
  "assistant.hours": "Horaires : {value}.",
  "assistant.phone": "Téléphone : {value}.",
  "assistant.address": "Adresse : {value}.",
  "assistant.website": "Site web : {value}.",
  "assistant.distanceOnly": "Distance : {distance}.",
  "assistant.noInfo": "Cette information n’est pas renseignée dans UPK.",
  "assistant.choose": "Choisir",
  "assistant.openPlace": "Voir la fiche",
  "assistant.experimentalVoice":
    "La voix haoussa ou zarma dépend des voix installées sur l’appareil. La saisie écrite reste disponible.",
  "assistant.listeningError":
    "Je n’ai pas pu écouter. Vérifiez le microphone ou écrivez votre demande.",
  "assistant.voiceError": "La voix n’a pas pu être lue. Vous pouvez continuer par écrit.",
} as const;

type AssistantKey = keyof typeof fr;

const en: Record<AssistantKey, string> = {
  "assistant.name": "Ben",
  "assistant.welcome": "Hello, I’m Ben. How can I help you?",
  "assistant.open": "Open the voice assistant",
  "assistant.close": "Close assistant",
  "assistant.language": "Assistant language",
  "assistant.greetingMorning": "Hello, I’m Ben. How can I help you?",
  "assistant.greetingEvening": "Hello, I’m Ben. How can I help you?",
  "assistant.ask": "What would you like to search for today?",
  "assistant.travelQuestion": "Of course. Would you like to travel by plane, by bus, or go to a bus station?",
  "assistant.travelClarify": "I did not recognize the transport option. Do you prefer plane, bus, or train?",
  "assistant.listening": "Listening…",
  "assistant.thinking": "Searching…",
  "assistant.speaking": "Speaking…",
  "assistant.stop": "Stop voice",
  "assistant.inputPlaceholder": "Type your search…",
  "assistant.send": "Send",
  "assistant.mic": "Talk to the assistant",
  "assistant.micUnavailable": "The microphone is not available on this device.",
  "assistant.voiceUnavailable": "Voice is not available on this device.",
  "assistant.voiceActivate": "Enable voice",
  "assistant.voiceNotAllowed":
    "Autoplay is blocked. Tap “Enable voice” to hear the welcome message.",
  "assistant.greetingToggle": "Voice welcome",
  "assistant.greetingOn": "Voice welcome enabled.",
  "assistant.greetingOff": "Voice welcome disabled.",
  "assistant.notUnderstood":
    "Sorry, I did not understand your request. Could you write it so I can help you?",
  "assistant.repeat": "Repeat",
  "assistant.writeInstead": "Write the request",
  "assistant.contribute": "Add this place",
  "assistant.notFound":
    "I could not find this place in UPK.\n\nAre you going there now? If so, you can add it to UPK so other users can find it.",
  "assistant.locationNeeded": "Enable location to calculate distances and find nearby places.",
  "assistant.networkError":
    "The search did not complete. Check your connection, then try again or write your request.",
  "assistant.found": "I found {name}.",
  "assistant.atDistance": "{distance} away.",
  "assistant.categoryCount": "{count} results for {category}.",
  "assistant.criteriaUnavailable": "I could not find a listing that mentions “{criterion}”. Here are {count} places in {category} anyway; their details can help you verify.",
  "assistant.nearest": "The nearest is {name}, {distance} away.",
  "assistant.quarterCount": "The neighbourhood {name} has {count} places.",
  "assistant.cityCount": "The city {name} has {count} places.",
  "assistant.suggestion": "I did not find “{query}” exactly. Did you mean “{suggestion}”?",
  "assistant.multiple": "Several places match. Which one are you looking for?",
  "assistant.next": "Next",
  "assistant.hours": "Opening hours: {value}.",
  "assistant.phone": "Phone: {value}.",
  "assistant.address": "Address: {value}.",
  "assistant.website": "Website: {value}.",
  "assistant.distanceOnly": "Distance: {distance}.",
  "assistant.noInfo": "This information is not available in UPK.",
  "assistant.choose": "Choose",
  "assistant.openPlace": "View details",
  "assistant.experimentalVoice":
    "Hausa or Zarma voice depends on the voices installed on the device. Written input remains available.",
  "assistant.listeningError": "I could not listen. Check the microphone or write your request.",
  "assistant.voiceError": "The voice could not be played. You can continue by typing.",
};

const ar: Record<AssistantKey, string> = {
  "assistant.name": "Ben",
  "assistant.welcome": "مرحبًا، أنا Ben. كيف يمكنني مساعدتك؟",
  "assistant.open": "فتح المساعد الصوتي",
  "assistant.close": "إغلاق المساعد",
  "assistant.language": "لغة المساعد",
  "assistant.greetingMorning": "مرحبًا، أنا Ben. كيف يمكنني مساعدتك؟",
  "assistant.greetingEvening": "مرحبًا، أنا Ben. كيف يمكنني مساعدتك؟",
  "assistant.ask": "ماذا تريد أن تبحث عنه اليوم؟",
  "assistant.travelQuestion": "بالتأكيد. هل تريد السفر بالطائرة أم بالحافلة أم الذهاب إلى محطة الحافلات؟",
  "assistant.travelClarify": "لم أفهم وسيلة النقل. هل تفضل الطائرة أم الحافلة أم القطار؟",
  "assistant.listening": "أستمع…",
  "assistant.thinking": "أبحث…",
  "assistant.speaking": "أتحدث…",
  "assistant.stop": "إيقاف الصوت",
  "assistant.inputPlaceholder": "اكتب بحثك…",
  "assistant.send": "إرسال",
  "assistant.mic": "تحدث إلى المساعد",
  "assistant.micUnavailable": "الميكروفون غير متاح على هذا الجهاز.",
  "assistant.voiceUnavailable": "الصوت غير متاح على هذا الجهاز.",
  "assistant.voiceActivate": "تفعيل الصوت",
  "assistant.voiceNotAllowed": "التشغيل التلقائي محظور. اضغط «تفعيل الصوت» لسماع الترحيب.",
  "assistant.greetingToggle": "الترحيب الصوتي",
  "assistant.greetingOn": "تم تفعيل الترحيب الصوتي.",
  "assistant.greetingOff": "تم إيقاف الترحيب الصوتي.",
  "assistant.notUnderstood": "عذرًا، لم أفهم طلبك جيدًا. هل يمكنك كتابته لأساعدك؟",
  "assistant.repeat": "إعادة",
  "assistant.writeInstead": "كتابة الطلب",
  "assistant.contribute": "إضافة هذا المكان",
  "assistant.notFound":
    "لم أجد هذا المكان في UPK.\n\nهل تتوجه إلى هذا المكان الآن؟ إذا كان الأمر كذلك، يمكنك إضافته إلى UPK ليتمكن مستخدمون آخرون من العثور عليه.",
  "assistant.locationNeeded": "فعّل الموقع لحساب المسافات والعثور على الأماكن القريبة.",
  "assistant.networkError": "لم يكتمل البحث. تحقق من اتصالك ثم أعد المحاولة أو اكتب طلبك.",
  "assistant.found": "وجدت {name}.",
  "assistant.atDistance": "على بعد {distance}.",
  "assistant.categoryCount": "{count} نتيجة لـ {category}.",
  "assistant.criteriaUnavailable": "لم أجد بطاقة تذكر «{criterion}». إليك مع ذلك {count} مكانًا ضمن فئة {category}، ويمكنك التحقق من تفاصيلها.",
  "assistant.nearest": "الأقرب هو {name}، على بعد {distance}.",
  "assistant.quarterCount": "حي {name} يضم {count} مكانًا.",
  "assistant.cityCount": "مدينة {name} تضم {count} مكانًا.",
  "assistant.suggestion": "لم أجد «{query}» بالضبط. هل تقصد «{suggestion}»؟",
  "assistant.multiple": "هناك عدة أماكن مطابقة. أيها تبحث عنه؟",
  "assistant.next": "التالي",
  "assistant.hours": "ساعات العمل: {value}.",
  "assistant.phone": "الهاتف: {value}.",
  "assistant.address": "العنوان: {value}.",
  "assistant.website": "الموقع: {value}.",
  "assistant.distanceOnly": "المسافة: {distance}.",
  "assistant.noInfo": "هذه المعلومة غير متوفرة في UPK.",
  "assistant.choose": "اختيار",
  "assistant.openPlace": "عرض البطاقة",
  "assistant.experimentalVoice":
    "الصوت بالهوسا أو الزارما يعتمد على الأصوات المثبتة على الجهاز. تبقى الكتابة متاحة.",
  "assistant.listeningError": "لم أستطع الاستماع. تحقق من الميكروفون أو اكتب طلبك.",
  "assistant.voiceError": "لم يتم تشغيل الصوت. يمكنك المتابعة بالكتابة.",
};

const catalogs: Record<AssistantLanguage, Record<AssistantKey, string>> = { fr, en, ar };

export type { AssistantKey };

export function assistantText(
  language: AssistantLanguage,
  key: AssistantKey,
  values: Record<string, string | number> = {},
): string {
  const template = catalogs[language][key] ?? catalogs.fr[key];
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export function assistantIsRtl(language: AssistantLanguage): boolean {
  return assistantLanguageDirections[language] === "rtl";
}
