import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="font-display text-xl text-foreground">
          Studio<span className="text-secondary">.</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 font-body text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Work</a>
          <a href="#" className="hover:text-foreground transition-colors">Services</a>
          <a href="#" className="hover:text-foreground transition-colors">About</a>
          <a href="#" className="text-foreground font-medium">Contact</a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden border-t border-border bg-background"
        >
          <div className="container py-6 flex flex-col gap-4 font-body text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Work</a>
            <a href="#" className="hover:text-foreground transition-colors">Services</a>
            <a href="#" className="hover:text-foreground transition-colors">About</a>
            <a href="#" className="text-foreground font-medium">Contact</a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
