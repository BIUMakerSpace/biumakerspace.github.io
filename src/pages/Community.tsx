import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, MessagesSquare, MessageCircle, ArrowLeft } from "lucide-react";

const WHATSAPP_URL = "https://chat.whatsapp.com/CfS0h6wH15CCzIdKOoyQ2z?mode=gi_t";

type CardItem = {
  title: string;
  description: string;
  cta: string;
  icon: typeof BookOpen;
  href: string;
  external?: boolean;
  accent: string;
};

const items: CardItem[] = [
  {
    title: "בלוג",
    description: "מאמרים, מדריכים וסיפורים מהמייקרספייס.",
    cta: "קראו את הבלוג",
    icon: BookOpen,
    href: "/blog",
    accent: "text-primary",
  },
  {
    title: "פורום",
    description: "שאלות, דיונים ועזרה מהקהילה.",
    cta: "אל הפורום",
    icon: MessagesSquare,
    href: "/forum",
    accent: "text-primary",
  },
  {
    title: "וואטסאפ",
    description: "הצטרפו לקבוצת הוואטסאפ לעדכונים בזמן אמת.",
    cta: "הצטרפו לקבוצה",
    icon: MessageCircle,
    href: WHATSAPP_URL,
    external: true,
    accent: "text-[#25D366]",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } },
};

const Community = () => {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      {/* Hero */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="mb-14 max-w-3xl md:mb-20"
      >
        <motion.p
          variants={item}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary"
        >
          הקהילה
        </motion.p>
        <motion.h1
          variants={item}
          className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl"
        >
          מקום אחד <br />
          לכל מי שיוצר.
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          בין אם אתם מחפשים השראה, צריכים עזרה עם פרויקט, או רוצים פשוט להתעדכן —
          כאן תמצאו את הקהילה של המייקרספייס.
        </motion.p>
      </motion.div>

      {/* Cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="grid gap-6 md:grid-cols-3"
      >
        {items.map((it) => {
          const Icon = it.icon;
          const inner = (
            <motion.div
              variants={item}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-primary/0 transition-colors group-hover:bg-primary" />

              <div className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ${it.accent}`}>
                <Icon className="h-7 w-7" />
              </div>

              <h2 className="mb-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                {it.title}
              </h2>
              <p className="mb-8 flex-1 text-base leading-relaxed text-muted-foreground">
                {it.description}
              </p>

              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {it.cta}
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </motion.div>
          );

          return it.external ? (
            <a
              key={it.title}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full"
            >
              {inner}
            </a>
          ) : (
            <Link key={it.title} to={it.href} className="block h-full">
              {inner}
            </Link>
          );
        })}
      </motion.div>
    </main>
  );
};

export default Community;
