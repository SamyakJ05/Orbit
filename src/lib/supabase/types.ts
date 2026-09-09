/**
 * Minimal hand-written types for the `trips` table, matching supabase/schema.sql.
 * Regenerate with `npx supabase gen types typescript` once the CLI is linked
 * to your project if the schema grows.
 */
export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          user_id: string;
          mode: 'flight' | 'train' | 'roadtrip' | 'bike';
          origin_name: string;
          origin_code: string | null;
          origin_lat: number;
          origin_lng: number;
          origin_city: string;
          origin_country: string;
          destination_name: string;
          destination_code: string | null;
          destination_lat: number;
          destination_lng: number;
          destination_city: string;
          destination_country: string;
          departure_time: string;
          arrival_time: string;
          distance_km: number;
          duration_minutes: number;
          carrier_or_flight_no: string | null;
          co_travelers: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: 'flight' | 'train' | 'roadtrip' | 'bike';
          origin_name: string;
          origin_code?: string | null;
          origin_lat: number;
          origin_lng: number;
          origin_city: string;
          origin_country: string;
          destination_name: string;
          destination_code?: string | null;
          destination_lat: number;
          destination_lng: number;
          destination_city: string;
          destination_country: string;
          departure_time: string;
          arrival_time: string;
          distance_km: number;
          duration_minutes: number;
          carrier_or_flight_no?: string | null;
          co_travelers?: string[];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
