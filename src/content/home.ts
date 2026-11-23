// Static content for the landing page.
import { Cpu, Lightbulb, Users } from "lucide-react";
import arduinoPlaylistThumb from "@/assets/arduino-playlist-thumb.png";
import { publicAsset } from "@/config";

export const resources = [
  {
    title: "מבוא לארדואינו – הפרויקט הראשון",
    description: "מצגת מבוא מקיפה בעברית לארדואינו והפרויקט הראשון שלכם – צעד אחר צעד",
    url: "https://gamma.app/docs/-tkm32divpo9tsdr?mode=doc",
    type: "article" as const,
    isHebrew: true,
  },
  {
    title: "ארדואינו ב-100 שניות",
    description: "הסבר מהיר ותמציתי על מה זה ארדואינו ולמה הוא כל כך פופולרי",
    url: "https://www.youtube.com/watch?v=1ENiVwk8idM",
    type: "video" as const,
  },
  {
    title: "מדריך ארדואינו בעברית (PDF)",
    description: "חומר לימוד מקיף בעברית מאת מוטי מאיר - משרד החינוך",
    url: "https://meyda.education.gov.il/files/MadaTech/Megama_Technologit/elecomp/homer-limud/arduino-moti-meir.pdf",
    type: "pdf" as const,
    isHebrew: true,
  },
  {
    title: "10 פרויקטים למתחילים",
    description: "פרויקטים פשוטים עם ברדבורד שמתאימים לכל מי שרק מתחיל",
    url: "https://www.instructables.com/Ten-Breadboard-Projects-For-Beginners/",
    type: "project" as const,
  },
  {
    title: "מבוא לארדואינו",
    description: "מדריך מפורט צעד אחר צעד להתחלת העבודה עם ארדואינו",
    url: "https://www.instructables.com/Intro-to-Arduino/",
    type: "article" as const,
  },
  {
    title: "קורס ארדואינו למתחילים בעברית",
    description: "פלייליסט שלם של שיעורי וידאו בעברית לעבודה עם ארדואינו",
    url: "https://www.youtube.com/watch?v=762uvOU8QCs&list=PL9V14Gc9LIP3yI985hgqfL1_AF8i3UyVF",
    type: "video" as const,
    isHebrew: true,
    embedDisabled: true,
  },
  {
    title: "מדריך חומרה למתחילים",
    description: "כל מה שצריך לדעת על רכיבי חומרה בסיסיים ואיך להשתמש בהם",
    url: "https://www.instructables.com/Complete-Guide-for-Tech-Beginners/",
    type: "article" as const,
  },
  {
    title: "יסודות ארדואינו - וידאו",
    description: "הסבר על הבסיס של ארדואינו - חיבורים, קוד ורכיבים",
    url: "https://www.youtube.com/watch?v=BtLwoNJ6klE",
    type: "video" as const,
  },
  {
    title: "קורס מזורז - 20 דקות",
    description: "למדו את כל הבסיס של ארדואינו בסרטון אחד קצר וממוקד",
    url: "https://www.youtube.com/watch?v=yi29dbPnu28&t=1083s",
    type: "video" as const,
  },
  {
    title: "Arduino Project Hub",
    description: "האתר הרשמי של ארדואינו עם מאות פרויקטים מהקהילה",
    url: "https://projecthub.arduino.cc/?sortBy=most_respected",
    type: "project" as const,
  },
  {
    title: "פלייליסט מדריכי ארדואינו",
    description: "אוסף מקיף של מדריכי וידאו לארדואינו - מהבסיס ועד פרויקטים מתקדמים",
    url: "https://www.youtube.com/playlist?list=PLGs0VKk2DiYw-L-RibttcvK-WBZm8WLEP",
    type: "video" as const,
    embedDisabled: true,
    thumbnail: arduinoPlaylistThumb,
  },
  {
    title: "רמזור תנועה עם ארדואינו",
    description: "פרויקט מעשי ומהנה - בניית רמזור תנועה עובד",
    url: "https://www.instructables.com/Traffic-Lights-With-an-Arduino/",
    type: "project" as const,
  },
  {
    title: "Keyestudio 48-in-1 Sensor Kit – מדריך רשמי",
    description: "המדריך המלא של ערכת 48 החיישנים של Keyestudio – הסברים, סכמות חיבור ודוגמאות קוד לכל חיישן",
    url: publicAsset("tutorials/keyestudio-48-in-1-sensor-kit.pdf"),
    type: "pdf" as const,
  },
  {
    title: "סרטון הדרכה - Maker Space",
    description: "סרטון הדרכה נוסף לעולם היצירה והבנייה",
    url: "https://youtu.be/8hyL9DXYFZc",
    type: "video" as const,
  },
  {
    title: "סרטון השראה ויצירה",
    description: "סרטון מעולם היצירה והפרויקטים",
    url: "https://youtu.be/zfp0IJoXcFg",
    type: "video" as const,
  },
  {
    title: "פרויקט יצירתי",
    description: "סרטון נוסף עם רעיונות ופרויקטים",
    url: "https://youtu.be/i7LFZxQcCQo",
    type: "video" as const,
  },
];

export const features = [
  {
    icon: Cpu,
    title: "ציוד מתקדם",
    description: "גישה למדפסות תלת מימד, חותכי לייזר, לוחות ארדואינו ועוד",
  },
  {
    icon: Users,
    title: "קהילה פעילה",
    description: "סטודנטים מכל הפקולטות עובדים יחד על פרויקטים מגוונים",
  },
  {
    icon: Lightbulb,
    title: "סדנאות והדרכות",
    description: "סדנאות שבועיות בנושאי אלקטרוניקה, תכנות ויצירה דיגיטלית",
  },
];

export const inspirations = [
  {
    name: "Limor Fried (Ladyada)",
    role: "מהנדסת ומייסדת Adafruit",
    description: "חלוצה בעולם החומרה הפתוחה, מייסדת אחת מחברות האלקטרוניקה היוצרות הגדולות בעולם",
    url: "https://www.adafruit.com/",
  },
  {
    name: "Simone Giertz",
    role: "מלכת רובוטים גרועים",
    description: "ממציאה ויוצרת יוטיוב שבונה רובוטים מצחיקים ומפתיעים - הוכחה שכישלון הוא חלק מהתהליך",
    url: "https://www.youtube.com/@simonegiertz",
  },
  {
    name: "Becky Stern",
    role: "יוצרת תוכן DIY ואלקטרוניקה לבישה",
    description: "מאות מדריכים על מיקרו-בקרים, אלקטרוניקה לבישה ופרויקטי יצירה לכל הרמות",
    url: "https://beckystern.com/",
  },
  {
    name: "Nina Zakharenko",
    role: "מהנדסת תוכנה ויוצרת חומרה",
    description: "משלבת בין Python לחומרה - מומחית ל-CircuitPython, IoT ופרויקטי לבישה יצירתיים",
    url: "https://www.nnja.io/",
  },
  {
    name: "Naomi Wu",
    role: "יוצרת מ-Shenzhen",
    description: "מתעדת את עולם החומרה הפתוחה והייצור בסין, עם פרויקטים מקוריים ומרהיבים",
    url: "https://www.youtube.com/@RealSexyCyborg",
  },
  {
    name: "Mark Rober",
    role: "מהנדס לשעבר ב-NASA",
    description: "פרויקטי הנדסה ענקיים ויצירתיים שמשלבים מדע, הומור ובניית גאדג׳טים מטורפים",
    url: "https://www.youtube.com/@MarkRober",
  },
  {
    name: "Instructables",
    role: "קהילת DIY עולמית",
    description: "אלפי מדריכים ופרויקטים מאנשים מכל העולם - מקור השראה אינסופי ליוצרים",
    url: "https://www.instructables.com/",
  },
];

export const projectIdeas = [
  {
    title: "רמזור LED",
    difficulty: "קל מאוד",
    description: "שלושה לדים, נגדים וקצת קוד - הפרויקט הקלאסי להתחלה עם ארדואינו",
    url: "https://www.instructables.com/Traffic-Lights-With-an-Arduino/",
  },
  {
    title: "חיישן מרחק עם זמזם",
    difficulty: "קל",
    description: "השתמשו בחיישן אולטרסוני לזיהוי מרחק והפעלת זמזם - מערכת חניה מיני",
    url: "https://docs.arduino.cc/built-in-examples/sensors/Ping/",
  },
  {
    title: "תחנת מזג אוויר",
    difficulty: "בינוני",
    description: "מדידת טמפרטורה ולחות עם תצוגת LCD - פרויקט שימושי שמלמד עבודה עם חיישנים ומסכים",
    url: "https://docs.arduino.cc/learn/electronics/lcd-displays",
  },
  {
    title: "נורת RGB מתחלפת",
    difficulty: "קל",
    description: "שלטו בצבע של נורת RGB - למידת PWM, ערבוב צבעים ושליטה אנלוגית",
    url: "https://docs.arduino.cc/built-in-examples/communication/Dimmer/",
  },
  {
    title: "מנעול דיגיטלי עם מקלדת",
    difficulty: "בינוני",
    description: "בנו מערכת קוד סודי עם מקלדת ממברנה ומנוע סרוו לפתיחת דלת או קופסה",
    url: "https://www.instructables.com/Arduino-Keypad-Door-Lock/",
  },
  {
    title: "רובוט נמנע ממכשולים",
    difficulty: "מתקדם",
    description: "רובוט קטן על גלגלים שמסתובב במרחב ומזהה מכשולים בעזרת חיישנים - פרויקט מלא",
    url: "https://www.instructables.com/Obstacle-Avoiding-Robot-Using-Arduino/",
  },
  {
    title: "תזכורת לשתות מים",
    difficulty: "קל",
    description: "מכשיר קטן שמהבהב ומצפצף כל שעה כדי להזכיר לכם לשתות - שימושי ופשוט",
    url: "https://www.instructables.com/Drink-Water-Reminder/",
  },
  {
    title: "פסנתר עם כפתורים",
    difficulty: "קל",
    description: "8 כפתורים ורמקול פיזואלקטרי = פסנתר מיני. למדו על תדרים והשמעת צלילים",
    url: "https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/",
  },
];
