// Generated from supabase/migrations by scripts/generate-database-types.mjs.
// Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
// after a local Supabase database is available, or run npm run db:types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          store_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          product_id: string
          store_id: string
          position: number
          created_at: string
        }
        Insert: {
          collection_id: string
          product_id: string
          store_id: string
          position?: number
          created_at?: string
        }
        Update: {
          collection_id?: string
          product_id?: string
          store_id?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          store_id: string
          title: string
          slug: string
          description: string
          status: Database["public"]["Enums"]["collection_status"]
          image_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          title: string
          slug: string
          description?: string
          status?: Database["public"]["Enums"]["collection_status"]
          image_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          title?: string
          slug?: string
          description?: string
          status?: Database["public"]["Enums"]["collection_status"]
          image_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          store_id: string
          customer_id: string
          name: string
          line1: string
          line2: string | null
          city: string
          region: string | null
          postal_code: string | null
          country: string
          phone: string | null
          is_default_shipping: boolean
          is_default_billing: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          customer_id: string
          name?: string
          line1: string
          line2?: string | null
          city: string
          region?: string | null
          postal_code?: string | null
          country?: string
          phone?: string | null
          is_default_shipping?: boolean
          is_default_billing?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          customer_id?: string
          name?: string
          line1?: string
          line2?: string | null
          city?: string
          region?: string | null
          postal_code?: string | null
          country?: string
          phone?: string | null
          is_default_shipping?: boolean
          is_default_billing?: boolean
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          store_id: string
          email: string
          name: string
          phone: string | null
          notes: string
          tags: string[]
          accepts_marketing: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          email: string
          name?: string
          phone?: string | null
          notes?: string
          tags?: string[]
          accepts_marketing?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          email?: string
          name?: string
          phone?: string | null
          notes?: string
          tags?: string[]
          accepts_marketing?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      discount_usages: {
        Row: {
          id: string
          store_id: string
          discount_id: string
          order_id: string
          customer_id: string | null
          amount_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          discount_id: string
          order_id: string
          customer_id?: string | null
          amount_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          discount_id?: string
          order_id?: string
          customer_id?: string | null
          amount_cents?: number
          created_at?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          id: string
          store_id: string
          code: string
          description: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
          starts_at: string | null
          ends_at: string | null
          minimum_subtotal_cents: number
          usage_limit: number | null
          usage_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          code: string
          description?: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
          starts_at?: string | null
          ends_at?: string | null
          minimum_subtotal_cents?: number
          usage_limit?: number | null
          usage_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          code?: string
          description?: string
          type?: Database["public"]["Enums"]["discount_type"]
          value?: number
          starts_at?: string | null
          ends_at?: string | null
          minimum_subtotal_cents?: number
          usage_limit?: number | null
          usage_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          variant_id: string
          store_id: string
          on_hand: number
          reserved: number
          updated_at: string
        }
        Insert: {
          variant_id: string
          store_id: string
          on_hand?: number
          reserved?: number
          updated_at?: string
        }
        Update: {
          variant_id?: string
          store_id?: string
          on_hand?: number
          reserved?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          id: string
          store_id: string
          variant_id: string
          delta: number
          reason: Database["public"]["Enums"]["inventory_reason"]
          reference_type: string | null
          reference_id: string | null
          note: string
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          variant_id: string
          delta: number
          reason: Database["public"]["Enums"]["inventory_reason"]
          reference_type?: string | null
          reference_id?: string | null
          note?: string
          actor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          variant_id?: string
          delta?: number
          reason?: Database["public"]["Enums"]["inventory_reason"]
          reference_type?: string | null
          reference_id?: string | null
          note?: string
          actor_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          store_id: string
          email: string
          role: Database["public"]["Enums"]["member_role"]
          token_hash: string
          status: Database["public"]["Enums"]["invitation_status"]
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          email: string
          role?: Database["public"]["Enums"]["member_role"]
          token_hash: string
          status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          email?: string
          role?: Database["public"]["Enums"]["member_role"]
          token_hash?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          store_id: string
          user_id: string | null
          title: string
          body: string
          href: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id?: string | null
          title: string
          body?: string
          href?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string | null
          title?: string
          body?: string
          href?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          store_id: string
          order_id: string
          variant_id: string | null
          product_title: string
          variant_title: string
          sku: string
          quantity: number
          unit_price_cents: number
          discount_cents: number
          tax_cents: number
          total_cents: number
          created_at: string
          product_type: string
          reserved_quantity: number
          fulfilled_quantity: number
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          variant_id?: string | null
          product_title: string
          variant_title?: string
          sku: string
          quantity: number
          unit_price_cents: number
          discount_cents?: number
          tax_cents?: number
          total_cents: number
          created_at?: string
          product_type?: string
          reserved_quantity?: number
          fulfilled_quantity?: number
        }
        Update: {
          id?: string
          store_id?: string
          order_id?: string
          variant_id?: string | null
          product_title?: string
          variant_title?: string
          sku?: string
          quantity?: number
          unit_price_cents?: number
          discount_cents?: number
          tax_cents?: number
          total_cents?: number
          created_at?: string
          product_type?: string
          reserved_quantity?: number
          fulfilled_quantity?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          order_number: string
          email: string
          currency: string
          status: Database["public"]["Enums"]["order_status"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          subtotal_cents: number
          discount_cents: number
          shipping_cents: number
          tax_cents: number
          total_cents: number
          shipping_address: Json
          placed_at: string
          cancelled_at: string | null
          created_at: string
          updated_at: string
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          store_id: string
          customer_id?: string | null
          order_number: string
          email: string
          currency?: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          subtotal_cents?: number
          discount_cents?: number
          shipping_cents?: number
          tax_cents?: number
          total_cents?: number
          shipping_address?: Json
          placed_at?: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
          idempotency_key?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          customer_id?: string | null
          order_number?: string
          email?: string
          currency?: string
          status?: Database["public"]["Enums"]["order_status"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          subtotal_cents?: number
          discount_cents?: number
          shipping_cents?: number
          tax_cents?: number
          total_cents?: number
          shipping_address?: Json
          placed_at?: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
          idempotency_key?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          store_id: string
          order_id: string
          amount_cents: number
          status: Database["public"]["Enums"]["payment_status"]
          provider: string
          provider_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          amount_cents: number
          status?: Database["public"]["Enums"]["payment_status"]
          provider?: string
          provider_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          order_id?: string
          amount_cents?: number
          status?: Database["public"]["Enums"]["payment_status"]
          provider?: string
          provider_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          store_id: string
          product_id: string
          variant_id: string | null
          storage_path: string
          alt_text: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          variant_id?: string | null
          storage_path: string
          alt_text?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          variant_id?: string | null
          storage_path?: string
          alt_text?: string | null
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          store_id: string
          product_id: string
          title: string
          sku: string
          barcode: string | null
          price_cents: number
          cost_cents: number | null
          weight_grams: number | null
          position: number
          low_stock_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          title?: string
          sku: string
          barcode?: string | null
          price_cents?: number
          cost_cents?: number | null
          weight_grams?: number | null
          position?: number
          low_stock_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          title?: string
          sku?: string
          barcode?: string | null
          price_cents?: number
          cost_cents?: number | null
          weight_grams?: number | null
          position?: number
          low_stock_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          store_id: string
          title: string
          slug: string
          description: string
          status: Database["public"]["Enums"]["product_status"]
          vendor: string | null
          product_type: string | null
          tags: string[]
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          title: string
          slug: string
          description?: string
          status?: Database["public"]["Enums"]["product_status"]
          vendor?: string | null
          product_type?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          title?: string
          slug?: string
          description?: string
          status?: Database["public"]["Enums"]["product_status"]
          vendor?: string | null
          product_type?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          notification_preferences: Json
          email: string
        }
        Insert: {
          id: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          notification_preferences?: Json
          email?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          notification_preferences?: Json
          email?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          id: string
          store_id: string
          order_id: string
          payment_id: string | null
          amount_cents: number
          reason: string
          status: Database["public"]["Enums"]["refund_status"]
          processed_by: string | null
          created_at: string
          updated_at: string
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          payment_id?: string | null
          amount_cents: number
          reason?: string
          status?: Database["public"]["Enums"]["refund_status"]
          processed_by?: string | null
          created_at?: string
          updated_at?: string
          idempotency_key?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          order_id?: string
          payment_id?: string | null
          amount_cents?: number
          reason?: string
          status?: Database["public"]["Enums"]["refund_status"]
          processed_by?: string | null
          created_at?: string
          updated_at?: string
          idempotency_key?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          id: string
          store_id: string
          return_id: string
          order_item_id: string
          quantity: number
          refund_cents: number
          restock: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          return_id: string
          order_item_id: string
          quantity: number
          refund_cents?: number
          restock?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          return_id?: string
          order_item_id?: string
          quantity?: number
          refund_cents?: number
          restock?: boolean
          created_at?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          id: string
          store_id: string
          order_id: string
          status: Database["public"]["Enums"]["return_status"]
          reason: string
          decision_note: string
          restock: boolean
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          status?: Database["public"]["Enums"]["return_status"]
          reason?: string
          decision_note?: string
          restock?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["return_status"]
          reason?: string
          decision_note?: string
          restock?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_members: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          currency: string
          timezone: string
          created_at: string
          updated_at: string
          logo_url: string | null
          is_demo: boolean
        }
        Insert: {
          id?: string
          name: string
          slug: string
          currency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
          logo_url?: string | null
          is_demo?: boolean
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          currency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
          logo_url?: string | null
          is_demo?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      inventory_levels: {
        Row: {
          variant_id: string | null
          store_id: string | null
          on_hand: number | null
          reserved: number | null
          available: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      inventory_overview: {
        Row: {
          variant_id: string | null
          store_id: string | null
          product_id: string | null
          sku: string | null
          variant_title: string | null
          product_title: string | null
          low_stock_threshold: number | null
          on_hand: number | null
          reserved: number | null
          available: number | null
          is_low_stock: boolean | null
          updated_at: string | null
        }
        Relationships: []
      }
      inventory_reconciliation: {
        Row: {
          store_id: string | null
          variant_id: string | null
          on_hand: number | null
          recorded_reserved: number | null
          expected_reserved: number | null
          matches: boolean | null
        }
        Relationships: []
      }
      order_reconciliation: {
        Row: {
          store_id: string | null
          order_id: string | null
          order_number: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents: number | null
          items_total_cents: number | null
          total_cents: number | null
          refunded_cents: number | null
          subtotal_matches: boolean | null
          refunds_within_total: boolean | null
          fulfillment_matches: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token_hash: string }
        Returns: string
      }
      add_product_variant: {
        Args: {
          p_store_id: string
          p_product_id: string
          p_title: string
          p_sku: string
          p_barcode: string | null
          p_price_cents: number
          p_cost_cents: number | null
          p_on_hand: number
          p_low_stock_threshold: number
        }
        Returns: string
      }
      adjust_inventory: {
        Args: {
          p_variant_id: string
          p_delta: number
          p_reason:
            | "sale"
            | "reservation"
            | "release"
            | "fulfillment"
            | "return"
            | "restock"
            | "adjustment"
            | "damage"
            | "cancellation"
          p_note: string
        }
        Returns: number
      }
      cancel_order: {
        Args: { p_order_id: string; p_restock: boolean }
        Returns: undefined
      }
      create_order: {
        Args: {
          p_store_id: string
          p_customer_id: string | null
          p_email: string
          p_items: Json
          p_discount_code: string | null
          p_shipping_cents: number
          p_tax_cents: number
          p_mark_paid: boolean
          p_shipping_address: Json
          p_idempotency_key: string | null
        }
        Returns: string
      }
      create_product: {
        Args: {
          p_store_id: string
          p_title: string
          p_slug: string
          p_description: string
          p_status: "draft" | "active" | "archived"
          p_vendor: string | null
          p_product_type: string | null
          p_image_url: string | null
          p_variants: Json
        }
        Returns: string
      }
      create_return: {
        Args: { p_order_id: string; p_reason: string; p_items: Json }
        Returns: string
      }
      create_store: {
        Args: { store_name: string }
        Returns: { id: string; name: string; slug: string }[]
      }
      decide_return: {
        Args: { p_return_id: string; p_approve: boolean; p_note: string }
        Returns: undefined
      }
      duplicate_product: {
        Args: { p_store_id: string; p_product_id: string }
        Returns: string
      }
      fulfill_order: {
        Args: { p_order_id: string; p_items: Json | null }
        Returns: undefined
      }
      join_demo_store: {
        Args: Record<string, never>
        Returns: string
      }
      mark_notifications_read: {
        Args: { p_store_id: string }
        Returns: number
      }
      record_refund: {
        Args: {
          p_order_id: string
          p_amount_cents: number
          p_reason: string
        }
        Returns: string
      }
      record_refund_once: {
        Args: {
          p_order_id: string
          p_amount_cents: number
          p_reason: string
          p_idempotency_key: string | null
        }
        Returns: string
      }
      redeem_discount: {
        Args: { p_store_id: string; p_code: string; p_order_id: string }
        Returns: { discount_id: string; amount_cents: number }[]
      }
      refund_return: {
        Args: { p_return_id: string; p_restock: boolean }
        Returns: string
      }
      reset_demo_store: {
        Args: Record<string, never>
        Returns: string
      }
      set_collection_products: {
        Args: { p_collection_id: string; p_product_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      collection_status: "draft" | "active" | "archived"
      discount_type: "percentage" | "fixed_amount"
      fulfillment_status: "unfulfilled" | "partially_fulfilled" | "fulfilled" | "cancelled"
      inventory_reason: "sale" | "reservation" | "release" | "fulfillment" | "return" | "restock" | "adjustment" | "damage" | "cancellation"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      member_role: "owner" | "admin" | "manager" | "staff" | "viewer"
      member_status: "active" | "suspended"
      order_status: "pending" | "processing" | "fulfilled" | "cancelled"
      payment_status: "pending" | "authorized" | "paid" | "partially_refunded" | "refunded" | "voided"
      product_status: "draft" | "active" | "archived"
      refund_status: "pending" | "completed" | "failed" | "cancelled"
      return_status: "requested" | "approved" | "rejected" | "received" | "refunded" | "closed"
    }
    CompositeTypes: Record<string, never>
  }
}
