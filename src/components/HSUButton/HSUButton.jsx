import "./HSUButton.css";

export default function HSUButton({
  children,
  variant = "gold",
  size = "medium",
  fullWidth = false,
  className = "",
  type = "button",
  disabled = false,
  ...buttonProps
}) {
  const classes = [
    "hsu-button",
    `hsu-button--${variant}`,
    `hsu-button--${size}`,
    fullWidth ? "hsu-button--full-width" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled}
      {...buttonProps}
    >
      <span className="hsu-button__content">{children}</span>
    </button>
  );
}