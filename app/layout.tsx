import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DocuFlow — AI Document Workspace",
    template: "%s | DocuFlow",
  },
  description:
    "DocuFlow is an AI-powered document workspace for managing, editing, searching, analyzing, and understanding your documents.",
  keywords: [
    "PDF tools",
    "PDF editor",
    "AI document assistant",
    "document management",
    "PDF merger",
    "PDF splitter",
    "document summarizer",
    "OCR",
    "AI document workspace",
  ],
  authors: [
    {
      name: "DocuFlow",
    },
  ],
  creator: "DocuFlow",
  applicationName: "DocuFlow",
  generator: "Next.js",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "DocuFlow — AI Document Workspace",
    description:
      "Upload, manage, edit, search, and understand your documents from one intelligent workspace.",
    type: "website",
    siteName: "DocuFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "DocuFlow — AI Document Workspace",
    description:
      "A modern workspace for managing and understanding your documents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}