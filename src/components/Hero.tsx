import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Modern workspace with warm lighting"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-foreground/50" />
      </div>

      <div className="container relative z-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-secondary font-body text-sm tracking-[0.3em] uppercase mb-6"
          >
            Design · Build · Launch
          </motion.p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display text-primary-foreground leading-[0.95] mb-8">
            Craft your
            <br />
            <span className="italic text-secondary">next big</span>
            <br />
            idea.
          </h1>

          <p className="text-primary-foreground/80 font-body text-lg md:text-xl max-w-lg mb-10 font-light leading-relaxed">
            We help visionary teams turn ambitious concepts into beautifully
            executed digital experiences.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button variant="hero" size="xl">
              Get Started
              <ArrowRight className="ml-1" />
            </Button>
            <Button variant="hero-outline" size="xl" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-foreground">
              Learn More
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
