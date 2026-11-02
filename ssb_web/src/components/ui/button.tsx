"use client";

import MuiButton, { type ButtonProps } from "@mui/material/Button";

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type Size = "default" | "sm" | "lg" | "xs";

/** Material UI button with the old shadcn-style variant names, so existing call sites keep working. */
export function Button({ variant = "default", size = "default", ...props }: Omit<ButtonProps, "variant" | "size"> & { variant?: Variant; size?: Size }) {
  const mui: Pick<ButtonProps, "variant" | "color"> =
    variant === "outline" ? { variant: "outlined", color: "inherit" }
    : variant === "secondary" ? { variant: "contained", color: "secondary" }
    : variant === "ghost" || variant === "link" ? { variant: "text", color: "primary" }
    : variant === "destructive" ? { variant: "outlined", color: "error" }
    : { variant: "contained", color: "primary" };
  return <MuiButton {...mui} size={size === "sm" || size === "xs" ? "small" : size === "lg" ? "large" : "medium"} {...props} />;
}
