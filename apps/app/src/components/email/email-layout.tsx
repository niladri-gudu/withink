import * as React from "react";

/**
 * Shared shell + style kit for all transactional emails.
 *
 * Colors mirror the app's light theme from @withink/tokens theme.css,
 * converted to email-safe hex (email clients don't support oklch()).
 * Amber (--accent) is the single accent: wordmark dot, badges, chips.
 */

export const emailColors = {
  background: "#fef7ee", // --background (cream paper)
  card: "#fefbf8", // --card
  foreground: "#2a1b11", // --foreground (brown ink)
  muted: "#f1eae0", // --secondary / --muted
  mutedForeground: "#5e534a", // --muted-foreground
  subtleForeground: "#98897a",
  border: "#e4ddd3", // --border
  accent: "#e4ac59", // --accent (warm amber)
  accentSoft: "#fae5c3",
} as const;

export const emailFonts = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

const main: React.CSSProperties = {
  backgroundColor: emailColors.background,
  backgroundImage: `linear-gradient(${emailColors.background}, ${emailColors.muted})`,
  fontFamily: emailFonts.sans,
  padding: "40px 20px",
};

const container: React.CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: emailColors.card,
  border: `1px solid ${emailColors.border}`,
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 1px 2px rgba(42, 27, 17, 0.05)",
};

const logo: React.CSSProperties = {
  margin: "0 0 28px 0",
  fontFamily: emailFonts.serif,
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "-0.5px",
  lineHeight: 1,
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: emailColors.foreground,
  margin: "0 0 12px 0",
  letterSpacing: "-0.5px",
  lineHeight: 1.25,
};

const text: React.CSSProperties = {
  fontSize: "15px",
  color: emailColors.mutedForeground,
  lineHeight: 1.65,
  margin: "0 0 12px 0",
};

const buttonContainer: React.CSSProperties = {
  margin: "28px 0",
};

const button: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: emailColors.foreground,
  color: emailColors.card,
  fontFamily: emailFonts.sans,
  fontWeight: 600,
  fontSize: "14px",
  padding: "13px 30px",
  borderRadius: "10px",
  textDecoration: "none",
};

const hint: React.CSSProperties = {
  fontSize: "13px",
  color: emailColors.subtleForeground,
  lineHeight: 1.6,
  margin: "0 0 24px 0",
};

const bullet: React.CSSProperties = {
  fontSize: "15px",
  color: emailColors.mutedForeground,
  lineHeight: 1.65,
  margin: "0 0 8px 0",
  paddingLeft: "4px",
};

const bulletDot: React.CSSProperties = {
  color: emailColors.accent,
};

const divider: React.CSSProperties = {
  borderTop: `1px solid ${emailColors.border}`,
  margin: "28px 0 16px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: emailColors.subtleForeground,
  lineHeight: 1.6,
  margin: 0,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
  color: emailColors.mutedForeground,
  backgroundColor: emailColors.accentSoft,
  border: `1px solid ${emailColors.accent}`,
  borderRadius: "999px",
  padding: "4px 12px",
};

const codeChip: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: emailColors.accentSoft,
  border: `1px solid ${emailColors.accent}`,
  color: emailColors.foreground,
  fontFamily: emailFonts.sans,
  fontWeight: 700,
  fontSize: "30px",
  letterSpacing: "10px",
  padding: "14px 24px 14px 34px",
  borderRadius: "12px",
  textAlign: "center" as const,
};

export const emailStyles = {
  main,
  container,
  logo,
  heading,
  text,
  buttonContainer,
  button,
  hint,
  bullet,
  bulletDot,
  divider,
  footer,
  badge,
  codeChip,
} as const;

interface EmailLayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Renders the paper card every email lives inside: cream backdrop,
 * wordmark up top, footer note pinned below a divider at the bottom.
 */
export function EmailLayout({ children, footer }: EmailLayoutProps) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={main}>
          <div style={container}>
            <p style={logo}>
              withink<span style={{ color: emailColors.accent }}>.</span>
            </p>
            {children}
            <div style={divider} />
            <p style={emailStyles.footer}>
              {footer ?? "Written quietly, kept privately — withink.me"}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
