export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "admin" | "client";
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "admin" | "client";
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          role?: "admin" | "client";
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          price: number;
          category_id: number | null;
          images: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          name: string;
          description?: string | null;
          price: number;
          category_id?: number | null;
          images?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          category_id?: number | null;
          images?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      product_variants: {
        Row: {
          id: number;
          product_id: number;
          size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
          stock: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          product_id: number;
          size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
          stock?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stock?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: number;
          user_id: string | null;
          status: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
          total: number;
          delivery_type: "pickup" | "delivery";
          mp_payment_id: string | null;
          mp_preference_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          user_id?: string | null;
          status?: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
          total: number;
          delivery_type: "pickup" | "delivery";
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: number;
          order_id: number;
          product_id: number;
          variant_id: number;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: never;
          order_id: number;
          product_id: number;
          variant_id: number;
          quantity: number;
          unit_price: number;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      shipping_addresses: {
        Row: {
          id: number;
          order_id: number;
          full_name: string;
          phone: string;
          street: string;
          number: string;
          floor_apt: string | null;
          localidad: string;
          provincia: string;
          codigo_postal: string;
          notes: string | null;
        };
        Insert: {
          id?: never;
          order_id: number;
          full_name: string;
          phone: string;
          street: string;
          number: string;
          floor_apt?: string | null;
          localidad: string;
          provincia: string;
          codigo_postal: string;
          notes?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      mark_order_paid: {
        Args: { p_order_id: number; p_payment_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "admin" | "client";
      product_size: "XS" | "S" | "M" | "L" | "XL" | "XXL";
      order_status: "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";
      delivery_type: "pickup" | "delivery";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Helpers de tipos para uso en componentes
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type ShippingAddress = Database["public"]["Tables"]["shipping_addresses"]["Row"];

export type ProductSize = Database["public"]["Enums"]["product_size"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type DeliveryType = Database["public"]["Enums"]["delivery_type"];

export type ProductWithVariants = Product & {
  variants: ProductVariant[];
  category: Category | null;
};
