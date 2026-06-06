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
  };
  message?: string;
}
