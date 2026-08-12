/**
 * Tipos do banco.
 * PENDÊNCIA: regenerar com `npm run types` depois de rodar as migrations,
 * assim eles ficam sempre colados no schema real.
 * Estes aqui são escritos à mão para o projeto compilar antes disso.
 */

export type Locale = string; // 'pt-BR' | 'en' | 'es' ...
export type I18nText = Record<Locale, string>;

export type MembershipRole = "owner" | "admin" | "staff";
export type TagKind = "allergen" | "diet" | "other";
export type TagMode = "contains" | "may_contain";
export type SubscriptionStatus =
  | "trialing" | "active" | "past_due" | "canceled" | "incomplete";
export type MenuEventType =
  | "menu_view" | "item_view" | "filter_use" | "qr_scan" | "locale_switch";

export type Tema = "terracota" | "vinho" | "oliva" | "noturno" | "custom";

export interface Plan {
  id: string; code: string; name: string; tagline: string | null;
  price_cents: number; interval: "month" | "year"; trial_days: number;
  max_menus: number | null; max_items: number | null; max_tables: number | null;
  max_locales: number; features: Record<string, boolean>; sort_order: number;
  is_public: boolean;
}

export interface Restaurant {
  id: string; slug: string; name: string; description: string | null;
  logo_url: string | null; cover_url: string | null;
  theme: Tema; brand_color: string | null;
  whatsapp: string | null; phone: string | null; instagram: string | null;
  address: Record<string, unknown> | null;
  timezone: string; currency: string;
  locales: Locale[]; default_locale: Locale;
  service_fee_percent: number | null; couvert_cents: number | null;
  allergen_disclaimer: string;
  is_published: boolean; published_at: string | null;
}

export interface Subscription {
  id: string; restaurant_id: string; plan_id: string;
  status: SubscriptionStatus;
  provider_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Category {
  id: string; restaurant_id: string; name: I18nText;
  description: I18nText | null; icon: string | null;
  sort_order: number; is_active: boolean;
}

export interface Item {
  id: string; restaurant_id: string; category_id: string | null;
  name: I18nText; description: I18nText | null;
  base_price: number | null;
  image_url: string | null; image_alt: I18nText | null;
  is_available: boolean;
  unavailable_until: string | null;
  unavailable_reason: string | null;
  is_featured: boolean;
  prep_time_min: number | null; spicy_level: number | null;
  sort_order: number;
}

export interface ItemVariant {
  id: string; item_id: string; name: I18nText;
  price_delta: number; is_default: boolean; is_available: boolean;
  sort_order: number;
}

export interface Tag {
  id: string; restaurant_id: string | null; slug: string;
  label: I18nText; kind: TagKind; icon: string; color: string | null;
  is_regulated: boolean; sort_order: number;
}

export interface Menu {
  id: string; restaurant_id: string; slug: string;
  name: I18nText; description: I18nText | null;
  is_active: boolean;
  available_from: string | null; available_to: string | null;
  sort_order: number;
}

export interface MenuDay {
  id: string; menu_id: string; weekday: number;
  start_time: string | null; end_time: string | null;
}

export interface RestaurantTable {
  id: string; restaurant_id: string; label: string; qr_token: string;
  menu_id: string | null; capacity: number | null; zone: string | null;
  is_active: boolean; sort_order: number;
}

/* ---- Formato devolvido pela RPC get_public_menu ---- */

export interface PublicItemTag { tag_id: string; mode: TagMode }

export interface PublicVariant {
  id: string; name: I18nText; price_delta: number;
  is_default: boolean; is_available: boolean;
}

export interface PublicItem {
  id: string; name: I18nText; description: I18nText | null;
  price: number; image_url: string | null; image_alt: I18nText | null;
  category_id: string | null; is_featured: boolean;
  prep_time_min: number | null; spicy_level: number | null;
  is_available: boolean;
  unavailable_until: string | null; unavailable_reason: string | null;
  variants: PublicVariant[]; tags: PublicItemTag[];
}

export interface PublicMenu {
  id: string; slug: string; name: I18nText; description: I18nText | null;
  available_from: string | null; available_to: string | null;
  days: { weekday: number; start_time: string | null; end_time: string | null }[];
  items: PublicItem[];
}

export interface PublicMenuPayload {
  restaurant: Restaurant;
  tags: Tag[];
  menus: PublicMenu[];
  categories: Category[];
}
