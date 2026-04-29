import heroImage from "@/assets/hero-maker.jpg";
import arduinoPlaylistThumb from "@/assets/arduino-playlist-thumb.png";
import ResourceCard from "@/components/ResourceCard";
import SiteNav from "@/components/SiteNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Cpu, Users, Lightbulb, ArrowDown, Play, BookOpen, ExternalLink, Sparkles, Rocket } from "lucide-react";

const resources = [
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
];

const features = [
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

const inspirations = [
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
];

const projectIdeas = [
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
    url: "https://projecthub.arduino.cc/Isaac100/getting-started-with-the-hc-sr04-ultrasonic-sensor-7cabe1",
  },
  {
    title: "תחנת מזג אוויר",
    difficulty: "בינוני",
    description: "מדידת טמפרטורה ולחות עם תצוגת LCD - פרויקט שימושי שמלמד עבודה עם חיישנים ומסכים",
    url: "https://projecthub.arduino.cc/",
  },
  {
    title: "נורת RGB מתחלפת",
    difficulty: "קל",
    description: "שלטו בצבע של נורת RGB - למידת PWM, ערבוב צבעים ושליטה אנלוגית",
    url: "https://projecthub.arduino.cc/SAnwandter1/programming-4-leds-with-the-arduino-uno-93f128",
  },
  {
    title: "מנעול דיגיטלי עם מקלדת",
    difficulty: "בינוני",
    description: "בנו מערכת קוד סודי עם מקלדת ממברנה ומנוע סרוו לפתיחת דלת או קופסה",
    url: "https://projecthub.arduino.cc/electropeak/diy-arduino-keypad-door-lock-9a92e7",
  },
  {
    title: "רובוט נמנע ממכשולים",
    difficulty: "מתקדם",
    description: "רובוט קטן על גלגלים שמסתובב במרחב ומזהה מכשולים בעזרת חיישנים - פרויקט מלא",
    url: "https://projecthub.arduino.cc/",
  },
  {
    title: "תזכורת לשתות מים",
    difficulty: "קל",
    description: "מכשיר קטן שמהבהב ומצפצף כל שעה כדי להזכיר לכם לשתות - שימושי ופשוט",
    url: "https://www.instructables.com/Arduino-Water-Reminder/",
  },
  {
    title: "פסנתר עם כפתורים",
    difficulty: "קל",
    description: "8 כפתורים ורמקול פיזואלקטרי = פסנתר מיני. למדו על תדרים והשמעת צלילים",
    url: "https://projecthub.arduino.cc/SURYATEJA/use-a-buzzer-module-piezo-speaker-using-arduino-uno-89df45",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      {/* Hero */}
      <section className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
        <img
          src={heroImage}
          alt="Maker Space workbench with Arduino and electronics"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-in-up">
            <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              אוניברסיטת בר אילן
            </span>
            <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-foreground md:text-7xl">
              <span className="text-gradient">Maker Space</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
              המרחב שלכם ליצור, לבנות ולחדש.
              <br />
              מהרעיון למציאות – עם הכלים, הידע והקהילה.
            </p>
          </div>
          <a
            href="#resources"
            className="mt-12 animate-bounce text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowDown className="h-6 w-6" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border py-20">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="py-20">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-black text-foreground md:text-4xl">
              חומרי לימוד <span className="text-gradient">ומשאבים</span>
            </h2>
            <p className="text-muted-foreground">
              סרטונים, מדריכים, רעיונות לפרויקטים והשראה מיוצרים בעולם
            </p>
          </div>
          <Tabs defaultValue="video" dir="rtl">
            <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-2xl grid-cols-2 gap-1 sm:flex sm:w-fit sm:flex-wrap">
              <TabsTrigger value="video" className="gap-1.5"><Play className="h-3.5 w-3.5" />סרטונים</TabsTrigger>
              <TabsTrigger value="guide" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />מדריכים</TabsTrigger>
              <TabsTrigger value="ideas" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />רעיונות</TabsTrigger>
              <TabsTrigger value="inspiration" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />השראה</TabsTrigger>
            </TabsList>

            <TabsContent value="video">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resources.filter((r) => r.type === "video").map((r) => (
                  <ResourceCard key={r.url} {...r} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="guide">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resources.filter((r) => r.type !== "video").map((r) => (
                  <ResourceCard key={r.url} {...r} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ideas">
              <p className="mb-6 text-center text-sm text-muted-foreground">
                לא יודעים מאיפה להתחיל? הנה רשימה של פרויקטים פשוטים ומגניבים
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
                {projectIdeas.map((idea) => (
                  <a
                    key={idea.title}
                    href={idea.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:glow-primary"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {idea.difficulty}
                      </span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <h3 className="mb-1.5 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                      {idea.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{idea.description}</p>
                  </a>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="inspiration">
              <p className="mb-6 text-center text-sm text-muted-foreground">
                היכרות עם משפיענים, מהנדסים ויוצרים שמובילים את עולם ה-Maker
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
                {inspirations.map((person) => (
                  <a
                    key={person.name}
                    href={person.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:glow-primary"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
                          {person.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-primary/80">{person.role}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{person.description}</p>
                  </a>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Maker Space – אוניברסיטת בר אילן &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
