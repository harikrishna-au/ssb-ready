"use client";

import { createTheme } from "@mui/material/styles";

/** ReadyKadet brand on Material UI. Colours mirror the CSS tokens in globals.css. */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  palette: {
    mode: "dark",
    primary: { main: "#4b7bf5", contrastText: "#ffffff" },
    secondary: { main: "#f5a623", contrastText: "#0a0b0f" },
    error: { main: "#ff5c6b" },
    background: { default: "#0a0b0f", paper: "#1c1e2a" },
    text: { primary: "#edeef2", secondary: "#8b8fa8" },
    divider: "rgba(255,255,255,0.1)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 },
    h1: { fontFamily: "var(--font-display), system-ui, sans-serif" },
    h2: { fontFamily: "var(--font-display), system-ui, sans-serif" },
    h3: { fontFamily: "var(--font-display), system-ui, sans-serif" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, minHeight: 44, paddingInline: 24 }, sizeSmall: { minHeight: 36, paddingInline: 16 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)" } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 6, backgroundColor: "rgba(255,255,255,0.1)" }, bar: { borderRadius: 999 } } },
    MuiTab: { styleOverrides: { root: { textTransform: "uppercase", fontWeight: 800, minHeight: 44 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 14, backgroundColor: "rgba(28,30,42,0.6)" } } },
  },
});
