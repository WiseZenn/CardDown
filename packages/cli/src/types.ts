export interface OutputResult {
  status: "success" | "error";
  images: {
    cover: string | null;
    content: string[];
  };
  metadata: {
    input_file: string;
    output_path: string;
    theme_used: string;
    scale: number;
    page_count: number;
    duration_seconds: number;
    fonts_missing: string[];
    /**
     * Degradations accepted during pagination, e.g. a block taller or wider
     * than one card. Present so a caller never has to guess whether the
     * exported images are complete.
     */
    warnings: string[];
    /** Which browser actually rendered the cards. */
    browser: string;
  };
  message?: string;
}
