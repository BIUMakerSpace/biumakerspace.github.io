const Footer = () => {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <a href="/" className="font-display text-lg text-foreground">
          Studio<span className="text-secondary">.</span>
        </a>
        <p className="text-muted-foreground font-body text-sm">
          © {new Date().getFullYear()} Studio. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
