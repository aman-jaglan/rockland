type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  hover?: boolean;
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
}: CardProps) {
  const baseStyles =
    "rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900";

  const hoverStyles = hover
    ? "transition-shadow duration-150 hover:shadow-md"
    : "";

  const combinedClassName = `${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${className}`;

  return <div className={combinedClassName}>{children}</div>;
}

export function CardHeader({ children, className = "" }: CardSectionProps) {
  const baseStyles = "border-b border-gray-200 pb-4 dark:border-gray-700";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: CardSectionProps) {
  const baseStyles = "py-4";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardSectionProps) {
  const baseStyles =
    "border-t border-gray-200 pt-4 dark:border-gray-700";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}
