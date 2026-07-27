import "./HSUTypography.css";

export default function HSUTypography({
  as: Component = "p",
  variant = "body",
  className = "",
  children,
  ...props
}) {
  return (
    <Component
      className={`hsu-typography hsu-typography--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}