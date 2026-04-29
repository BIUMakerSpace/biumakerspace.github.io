import { Play, FileText, BookOpen, ExternalLink, Wrench } from "lucide-react";

interface ResourceCardProps {
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "pdf" | "project";
  isHebrew?: boolean;
  embedDisabled?: boolean;
  thumbnail?: string;
}

const typeConfig = {
  video: { icon: Play, label: "סרטון" },
  article: { icon: BookOpen, label: "מדריך" },
  pdf: { icon: FileText, label: "PDF" },
  project: { icon: Wrench, label: "פרויקט" },
};

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  return match ? match[1] : null;
}

const ResourceCard = ({ title, description, url, type, isHebrew, embedDisabled, thumbnail }: ResourceCardProps) => {
  const { icon: Icon, label } = typeConfig[type];
  const youtubeId = type === "video" ? getYouTubeId(url) : null;
  const thumbSrc = thumbnail ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden transition-all duration-300 hover:border-primary/50 hover:glow-primary">
      {youtubeId && !embedDisabled && (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}
      {type === "video" && embedDisabled && thumbSrc && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-video w-full overflow-hidden"
        >
          <img
            src={thumbSrc}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
              <Play className="h-6 w-6" />
            </div>
          </div>
        </a>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Icon className="h-3 w-3" />
            {label}
            {isHebrew && <span className="text-primary">• עברית</span>}
          </span>
          <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <h3 className="mb-1.5 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </a>
    </div>
  );
};

export default ResourceCard;
