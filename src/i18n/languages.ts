/**
 * The 50 interface languages.
 * - name: endonym shown in the picker, english: English name (searchable)
 * - google: language code for Google Search / Translate
 * - sample: letters the language needs beyond A–Z (or letters of its script) —
 *   used to decide whether the LED Dot-Matrix font can display the language.
 */
export const LANGUAGES = [
  { code: "ru", name: "Русский", english: "Russian", google: "ru", sample: "абвгдеёжзийклмнопрстуфхцчшщъыьэюя" },
  { code: "en", name: "English", english: "English", google: "en", sample: "" },
  { code: "uk", name: "Українська", english: "Ukrainian", google: "uk", sample: "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя" },
  { code: "be", name: "Беларуская", english: "Belarusian", google: "be", sample: "абвгдеёжзійклмнопрстуўфхцчшыьэюя" },
  { code: "kk", name: "Қазақ тілі", english: "Kazakh", google: "kk", sample: "аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя" },
  { code: "uz", name: "Oʻzbekcha", english: "Uzbek", google: "uz", sample: "oʻgʻ" },
  { code: "de", name: "Deutsch", english: "German", google: "de", sample: "äöüß" },
  { code: "fr", name: "Français", english: "French", google: "fr", sample: "àâæçéèêëîïôœùûüÿ" },
  { code: "es", name: "Español", english: "Spanish", google: "es", sample: "áéíñóúü" },
  { code: "pt", name: "Português", english: "Portuguese", google: "pt", sample: "áâãàçéêíóôõú" },
  { code: "it", name: "Italiano", english: "Italian", google: "it", sample: "àèéìíîòóùú" },
  { code: "nl", name: "Nederlands", english: "Dutch", google: "nl", sample: "éëïöü" },
  { code: "pl", name: "Polski", english: "Polish", google: "pl", sample: "ąćęłńóśźż" },
  { code: "cs", name: "Čeština", english: "Czech", google: "cs", sample: "áčďéěíňóřšťúůýž" },
  { code: "sk", name: "Slovenčina", english: "Slovak", google: "sk", sample: "áäčďéíĺľňóôŕšťúýž" },
  { code: "sl", name: "Slovenščina", english: "Slovenian", google: "sl", sample: "čšž" },
  { code: "hr", name: "Hrvatski", english: "Croatian", google: "hr", sample: "čćđšž" },
  { code: "sr", name: "Српски", english: "Serbian", google: "sr", sample: "абвгдђежзијклљмнњопрстћуфхцчџш" },
  { code: "bg", name: "Български", english: "Bulgarian", google: "bg", sample: "абвгдежзийклмнопрстуфхцчшщъьюя" },
  { code: "ro", name: "Română", english: "Romanian", google: "ro", sample: "ăâîșț" },
  { code: "hu", name: "Magyar", english: "Hungarian", google: "hu", sample: "áéíóöőúüű" },
  { code: "el", name: "Ελληνικά", english: "Greek", google: "el", sample: "αβγδεζηθικλμνξοπρστυφχψω" },
  { code: "tr", name: "Türkçe", english: "Turkish", google: "tr", sample: "çğıöşü" },
  { code: "az", name: "Azərbaycan", english: "Azerbaijani", google: "az", sample: "çəğıöşü" },
  { code: "ka", name: "ქართული", english: "Georgian", google: "ka", sample: "აბგდევზთიკლმნოპ" },
  { code: "hy", name: "Հայերեն", english: "Armenian", google: "hy", sample: "աբգդեզէըթժիլխծկ" },
  { code: "he", name: "עברית", english: "Hebrew", google: "iw", sample: "אבגדהוזחטיכלמנס" },
  { code: "ar", name: "العربية", english: "Arabic", google: "ar", sample: "ابتثجحخدذرزسشصض" },
  { code: "fa", name: "فارسی", english: "Persian", google: "fa", sample: "ابپتثجچحخدذرزژس" },
  { code: "ur", name: "اردو", english: "Urdu", google: "ur", sample: "ابپتٹثجچحخدڈذرز" },
  { code: "hi", name: "हिन्दी", english: "Hindi", google: "hi", sample: "अआइईउऊएऐओऔकखगघ" },
  { code: "bn", name: "বাংলা", english: "Bengali", google: "bn", sample: "অআইঈউঊএঐওঔকখগঘ" },
  { code: "ta", name: "தமிழ்", english: "Tamil", google: "ta", sample: "அஆஇஈஉஊஎஏஐஒஓகஙச" },
  { code: "th", name: "ไทย", english: "Thai", google: "th", sample: "กขฃคฅฆงจฉชซฌญฎฏ" },
  { code: "vi", name: "Tiếng Việt", english: "Vietnamese", google: "vi", sample: "ăâđêôơưạảấầẩẫậắằẳẵặ" },
  { code: "id", name: "Bahasa Indonesia", english: "Indonesian", google: "id", sample: "" },
  { code: "ms", name: "Bahasa Melayu", english: "Malay", google: "ms", sample: "" },
  { code: "fil", name: "Filipino", english: "Filipino", google: "tl", sample: "ñ" },
  { code: "zh-CN", name: "简体中文", english: "Chinese (Simplified)", google: "zh-CN", sample: "搜索设置书签语言" },
  { code: "zh-TW", name: "繁體中文", english: "Chinese (Traditional)", google: "zh-TW", sample: "搜尋設定書籤語言" },
  { code: "ja", name: "日本語", english: "Japanese", google: "ja", sample: "あいうえおかきくけこ検索" },
  { code: "ko", name: "한국어", english: "Korean", google: "ko", sample: "가나다라마바사아자차" },
  { code: "sv", name: "Svenska", english: "Swedish", google: "sv", sample: "åäö" },
  { code: "nb", name: "Norsk bokmål", english: "Norwegian", google: "no", sample: "æøå" },
  { code: "da", name: "Dansk", english: "Danish", google: "da", sample: "æøå" },
  { code: "fi", name: "Suomi", english: "Finnish", google: "fi", sample: "äö" },
  { code: "et", name: "Eesti", english: "Estonian", google: "et", sample: "äõöüšž" },
  { code: "lv", name: "Latviešu", english: "Latvian", google: "lv", sample: "āčēģīķļņšūž" },
  { code: "lt", name: "Lietuvių", english: "Lithuanian", google: "lt", sample: "ąčęėįšųūž" },
  { code: "sw", name: "Kiswahili", english: "Swahili", google: "sw", sample: "" },
] as const;

export type LanguageInfo = (typeof LANGUAGES)[number];
export type LanguageCode = LanguageInfo["code"];

export const RTL_LANGUAGES: ReadonlySet<LanguageCode> = new Set<LanguageCode>(["he", "ar", "fa", "ur"]);
