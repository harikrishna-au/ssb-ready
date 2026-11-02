"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import Link from "next/link";

type Props = Pick<ButtonProps, "variant" | "color" | "size" | "sx" | "startIcon" | "endIcon" | "children" | "className" | "fullWidth" | "disabled" | "aria-label"> & {
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/** Material UI button that navigates with next/link. */
export function LinkButton({ href, ...rest }: Props) {
  return <Button component={Link} href={href} {...rest} />;
}
