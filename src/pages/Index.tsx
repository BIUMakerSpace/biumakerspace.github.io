import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-maker.jpg";
import ResourceCard from "@/components/ResourceCard";
import { publicAsset } from "@/config";
import { features, inspirations, projectIdeas, resources } from "@/content/home";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDown, Play, BookOpen, ExternalLink, Sparkles, Rocket, ShoppingBag, FileText, Clock, DoorOpen, Download, Video } from "lucide-react";


const Index = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[80vh] overflow-hidden md:h-[calc(100vh-3.5rem)]">
        <img
          src={heroImage}
          alt="Maker Space workbench with Arduino and electronics"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-5 py-16 text-center md:h-full md:py-0">
          <div className="animate-fade-in-up w-full max-w-xl">
            <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary sm:text-sm">
              אוניברסיטת בר אילן
            </span>
            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
              <span className="text-gradient">Maker Space</span>
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg md:text-xl">
              המרחב שלכם ליצור, לבנות ולחדש.
              <br />
              מהרעיון למציאות – עם הכלים, הידע והקהילה.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center" dir="rtl">
              <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/catalog">
                  <ShoppingBag className="h-4 w-4" />
                  השאלת ציוד
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                <Link to="/requests">
                  <FileText className="h-4 w-4" />
                  הדפסת תלת מימד
                </Link>
              </Button>
            </div>

            <div className="mt-6 sm:mt-8" dir="rtl">
              <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground/80 sm:text-xs">
                חומרי לימוד
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Button asChild size="sm" variant="outline" className="w-full justify-center gap-1.5 bg-background/70 text-xs backdrop-blur sm:w-auto">
                  <a href={publicAsset("opening_meeting.pdf")} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    מצגת מפגש הפתיחה
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full justify-center gap-1.5 bg-background/70 text-xs backdrop-blur sm:w-auto">
                  <a href="https://gamma.app/docs/-tkm32divpo9tsdr?mode=doc" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-3.5 w-3.5" />
                    מבוא לארדואינו – הפרויקט הראשון
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full justify-center gap-1.5 bg-background/70 text-xs backdrop-blur sm:w-auto">
                  <a href="https://biu-ac-il.zoom.us/rec/share/bExVxbRRpgEOeDesnxC7Zf-kKp33QrqSU-4zm9lO_hZcS1tanYT5Y3OAlZEFcAM.eeOlkhOwfrJSzlv3?from=hub" target="_blank" rel="noopener noreferrer">
                    <Video className="h-3.5 w-3.5" />
                    מבוא לארדואינו (הקלטה)
                  </a>
                </Button>
              </div>
            </div>


          </div>
          <a
            href="#resources"
            className="mt-10 hidden animate-bounce text-muted-foreground transition-colors hover:text-primary md:mt-12 md:block"
          >
            <ArrowDown className="h-6 w-6" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border py-10 md:py-20">
        <div className="container mx-auto max-w-5xl px-5 md:px-6">
          <div className="grid grid-cols-3 gap-3 md:gap-8" dir="rtl">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary md:mb-4 md:h-14 md:w-14">
                  <f.icon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <h3 className="mb-1 text-xs font-bold leading-tight text-foreground sm:text-sm md:mb-2 md:text-lg">{f.title}</h3>
                <p className="hidden text-sm text-muted-foreground md:block">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Opening Hours */}
      <section className="border-b border-border bg-muted/30 py-12 md:py-20" dir="rtl">
        <div className="container mx-auto max-w-5xl px-5 md:px-6">
          <div className="grid gap-6 md:grid-cols-2 md:gap-10">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                שעות פעילות עם <span className="text-gradient">מדריכים</span>
              </h2>
              <p className="mb-5 text-base leading-relaxed text-muted-foreground">
                מדריכים נמצאים במרחב וזמינים לעזרה, ייעוץ והדרכה בימים הבאים:
              </p>
              <ul className="space-y-3">
                {[
                  { day: "ראשון", hours: "18:00 – 20:00" },
                  { day: "שלישי", hours: "18:00 – 20:00" },
                  { day: "חמישי", hours: "18:00 – 20:00" },
                ].map((slot) => (
                  <li
                    key={slot.day}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <span className="text-base font-bold text-foreground">יום {slot.day}</span>
                    <span className="font-mono text-base text-primary">{slot.hours}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DoorOpen className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                המרחב <span className="text-gradient">פתוח תמיד</span>
              </h2>
              <p className="mb-4 text-base leading-relaxed text-muted-foreground">
                גם מחוץ לשעות עם המדריכים, סטודנטים מוזמנים להגיע ולעבוד במרחב בכל זמן שנוח להם.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                בואו ליצור, להתנסות ולבנות — בקצב שלכם.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="py-12 md:py-20">
        <div className="container mx-auto max-w-5xl px-5 md:px-6">
          <div className="mb-8 text-center md:mb-12">
            <h2 className="mb-3 text-2xl font-black text-foreground sm:text-3xl md:text-4xl">
              חומרי לימוד <span className="text-gradient">ומשאבים</span>
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              סרטונים, מדריכים, רעיונות לפרויקטים והשראה מיוצרים בעולם
            </p>
          </div>
          <Tabs defaultValue="video" dir="rtl">
            <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-2xl grid-cols-2 gap-1 sm:flex sm:w-fit sm:flex-wrap">
              <TabsTrigger value="video" className="gap-1.5 py-2"><Play className="h-3.5 w-3.5" />סרטונים</TabsTrigger>
              <TabsTrigger value="guide" className="gap-1.5 py-2"><BookOpen className="h-3.5 w-3.5" />מדריכים</TabsTrigger>
              <TabsTrigger value="ideas" className="gap-1.5 py-2"><Rocket className="h-3.5 w-3.5" />רעיונות</TabsTrigger>
              <TabsTrigger value="inspiration" className="gap-1.5 py-2"><Sparkles className="h-3.5 w-3.5" />השראה</TabsTrigger>
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
                    className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:glow-primary sm:p-5"
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
                    className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:glow-primary sm:p-6"
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
    </>
  );
};

export default Index;
