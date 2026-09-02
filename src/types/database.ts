/**
 * Supabase Database Schema Types for Shayona Invoice
 * Strictly typed definitions matching PostgreSQL tables and relations.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PartyType = 'CUSTOMER' | 'BUYER';
export type AppLanguage = 'en' | 'gu';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          shop_name: string;
          language: AppLanguage;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          shop_name?: string;
          language?: AppLanguage;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          shop_name?: string;
          language?: AppLanguage;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      buyers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          invoice_number: string;
          party_type: PartyType;
          party_id: string;
          invoice_date: string;
          total_amount: number; // in Paise
          paid_amount: number; // in Paise
          remaining_amount: number; // in Paise
          notes: string | null;
          pdf_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          invoice_number: string;
          party_type: PartyType;
          party_id: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          remaining_amount?: number;
          notes?: string | null;
          pdf_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          invoice_number?: string;
          party_type?: PartyType;
          party_id?: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          remaining_amount?: number;
          notes?: string | null;
          pdf_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          item_name: string;
          quantity: number;
          rate: number; // in Paise
          amount: number; // in Paise
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          item_name: string;
          quantity: number;
          rate: number;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          item_name?: string;
          quantity?: number;
          rate?: number;
          amount?: number;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          invoice_id: string;
          amount: number; // in Paise
          payment_date: string; // YYYY-MM-DD
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          invoice_id: string;
          amount: number; // in Paise
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          invoice_id?: string;
          amount?: number;
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          expense_date: string; // YYYY-MM-DD
          amount: number; // in Paise
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expense_date?: string;
          amount: number; // in Paise
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expense_date?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbCustomer = Database['public']['Tables']['customers']['Row'];
export type DbBuyer = Database['public']['Tables']['buyers']['Row'];
export type DbInvoice = Database['public']['Tables']['invoices']['Row'];
export type DbInvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type DbPayment = Database['public']['Tables']['payments']['Row'];
export type DbExpense = Database['public']['Tables']['expenses']['Row'];
