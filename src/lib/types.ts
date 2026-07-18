export type PollStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "paused"
  | "closed"
  | "archived";

export type ResultsVisibility = "private" | "live" | "published";

export type Poll = {
  id: string;
  slug: string;
  internal_name: string;
  title: string;
  question: string;
  description: string | null;
  status: PollStatus;
  results_visibility: ResultsVisibility;
  starts_at: string | null;
  ends_at: string | null;
  disclaimer: string;
  methodology: string | null;
  privacy_notice: string;
  public_notice: string | null;
  suspension_message: string | null;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  poll_type?: string;
  electorate_name?: string | null;
  electorate_code?: string | null;
  electorate_type?: "general" | "maori" | null;
};

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  short_label: string | null;
  description: string | null;
  logo_url: string | null;
  colour_hex: string | null;
  website_url: string | null;
  display_order: number;
  is_active: boolean;
  party_key?: string | null;
};
