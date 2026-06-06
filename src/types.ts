export interface PageDimensions {
  width: number;
  height: number;
  padding: number;
}

export const DEFAULTS: PageDimensions = {
  width: 1080,
  height: 1440,
  padding: 48,
};

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
