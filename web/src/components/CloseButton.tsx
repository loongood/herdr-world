import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useT } from "../i18n";
import "./CloseButton.css";

type CloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children" | "type"
> & {
  label?: string;
  variant?: "dialog" | "toast";
};

export function CloseButton({
  label,
  variant = "dialog",
  className,
  title,
  ...buttonProps
}: CloseButtonProps) {
  const t = useT();
  const resolvedLabel = label ?? t("common.close");
  const classes = ["close-button", `close-button-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type="button"
      className={classes}
      aria-label={resolvedLabel}
      title={title ?? resolvedLabel}
    >
      <X
        size={variant === "toast" ? 15 : 17}
        strokeWidth={2.2}
        aria-hidden="true"
      />
    </button>
  );
}
