import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section className="py-28 md:py-36 bg-primary">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-display text-primary-foreground leading-tight mb-6">
            Ready to build something{" "}
            <span className="italic text-secondary">remarkable?</span>
          </h2>
          <p className="text-primary-foreground/70 font-body text-lg mb-10 font-light max-w-lg mx-auto">
            Let's collaborate and bring your vision to life. No fluff, no
            friction — just great work, delivered.
          </p>
          <Button variant="hero" size="xl">
            Start a Project
            <ArrowRight className="ml-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
