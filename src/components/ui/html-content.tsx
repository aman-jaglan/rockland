"use client";

import { useMemo } from "react";

interface HtmlContentProps {
  html: string;
  className?: string;
}

/**
 * Safely renders HTML content by converting common HTML entities
 * and basic HTML tags to React elements.
 *
 * Handles:
 * - HTML entities (&nbsp;, &amp;, etc.)
 * - Basic tags (<p>, <br>, <strong>, <em>, <ul>, <li>, <a>)
 * - Strips unsafe tags/scripts
 */
export function HtmlContent({ html, className = "" }: HtmlContentProps) {
  const cleanedContent = useMemo(() => {
    if (!html) return "";

    // Decode HTML entities
    let text = html
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .replace(/&bull;/g, "•")
      .replace(/&middot;/g, "·")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

    // Remove script tags and their content
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    // Remove style tags and their content
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // Convert <br> and <br/> to newlines
    text = text.replace(/<br\s*\/?>/gi, "\n");

    // Convert </p> to double newlines
    text = text.replace(/<\/p>/gi, "\n\n");

    // Convert list items
    text = text.replace(/<li[^>]*>/gi, "\n• ");
    text = text.replace(/<\/li>/gi, "");

    // Remove opening tags for allowed elements
    text = text.replace(/<p[^>]*>/gi, "");
    text = text.replace(/<ul[^>]*>/gi, "\n");
    text = text.replace(/<\/ul>/gi, "\n");
    text = text.replace(/<ol[^>]*>/gi, "\n");
    text = text.replace(/<\/ol>/gi, "\n");
    text = text.replace(/<div[^>]*>/gi, "\n");
    text = text.replace(/<\/div>/gi, "\n");

    // Keep text from strong/em tags
    text = text.replace(/<strong[^>]*>/gi, "");
    text = text.replace(/<\/strong>/gi, "");
    text = text.replace(/<b[^>]*>/gi, "");
    text = text.replace(/<\/b>/gi, "");
    text = text.replace(/<em[^>]*>/gi, "");
    text = text.replace(/<\/em>/gi, "");
    text = text.replace(/<i[^>]*>/gi, "");
    text = text.replace(/<\/i>/gi, "");

    // Extract link text (remove href)
    text = text.replace(/<a[^>]*>([^<]*)<\/a>/gi, "$1");

    // Remove any remaining HTML tags
    text = text.replace(/<[^>]+>/g, "");

    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, "\n\n");

    // Trim whitespace
    text = text.trim();

    return text;
  }, [html]);

  if (!cleanedContent) {
    return null;
  }

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {cleanedContent}
    </div>
  );
}
