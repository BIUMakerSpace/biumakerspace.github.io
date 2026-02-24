import { motion } from "framer-motion";
import { Sparkles, Layers, Zap } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Thoughtful Design",
    description:
      "Every pixel is intentional. We craft interfaces that feel intuitive and look stunning.",
  },
  {
    icon: Layers,
    title: "Scalable Systems",
    description:
      "Built on robust foundations that grow with your ambition, from MVP to enterprise.",
  },
  {
    icon: Zap,
    title: "Rapid Delivery",
    description:
      "Move fast without breaking things. Our process is lean, iterative, and transparent.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const Features = () => {
  return (
    <section className="py-28 md:py-36 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-secondary font-body text-sm tracking-[0.3em] uppercase mb-4">
            What we do
          </p>
          <h2 className="text-4xl md:text-5xl font-display text-foreground leading-tight">
            Everything you need to <span className="italic">ship great work.</span>
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-8 rounded-2xl bg-card border border-border hover:border-secondary/40 transition-colors duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-display text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-body font-light leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
