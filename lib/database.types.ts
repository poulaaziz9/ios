
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "achievements": {
                  Row: {
                    "created_at": string,"criteria": NonNullable<Json>,"description": string | null,"icon": string | null,"id": string,"name": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string | null,"icon"?: string | null,"id"?: string,"name": string,"service_id": string
                  }
                  Update: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"description"?: string | null,"icon"?: string | null,"id"?: string,"name"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "achievements_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"church_roles": {
                  Row: {
                    "church_id": string,"created_at": string,"id": string,"role": Database["public"]['Enums']["church_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["church_role"],"user_id": string
                  }
                  Update: {
                    "church_id"?: string,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["church_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "church_roles_church_id_fkey"
      columns: ["church_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "church_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"churches": {
                  Row: {
                    "address": string | null,"created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "churches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"service_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"service_id": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"service_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "classes_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"competition_entries": {
                  Row: {
                    "answers": NonNullable<Json>,"competition_id": string,"created_at": string,"id": string,"score": number,"submitted_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"competition_id": string,"created_at"?: string,"id"?: string,"score"?: number,"submitted_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"competition_id"?: string,"created_at"?: string,"id"?: string,"score"?: number,"submitted_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_entries_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "competition_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"competition_questions": {
                  Row: {
                    "competition_id": string,"correct_index": number,"created_at": string,"id": string,"options": NonNullable<Json>,"points": number,"question": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "competition_id": string,"correct_index": number,"created_at"?: string,"id"?: string,"options": NonNullable<Json>,"points"?: number,"question": string,"sort_order"?: number
                  }
                  Update: {
                    "competition_id"?: string,"correct_index"?: number,"created_at"?: string,"id"?: string,"options"?: NonNullable<Json>,"points"?: number,"question"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "competition_questions_competition_id_fkey"
      columns: ["competition_id"]
isOneToOne: false
      referencedRelation: "competitions"
      referencedColumns: ["id"]
    }
                  ]
                },"competitions": {
                  Row: {
                    "class_id": string | null,"created_at": string,"description": string | null,"ends_at": string | null,"id": string,"is_published": boolean,"max_points": number,"service_id": string,"starts_at": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id"?: string | null,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_points"?: number,"service_id": string,"starts_at"?: string | null,"title": string
                  }
                  Update: {
                    "class_id"?: string | null,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_points"?: number,"service_id"?: string,"starts_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "competitions_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "competitions_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"gift_redemptions": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"gift_id": string,"id": string,"status": Database["public"]['Enums']["redemption_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"gift_id": string,"id"?: string,"status"?: Database["public"]['Enums']["redemption_status"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"gift_id"?: string,"id"?: string,"status"?: Database["public"]['Enums']["redemption_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gift_redemptions_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gift_redemptions_gift_id_fkey"
      columns: ["gift_id"]
isOneToOne: false
      referencedRelation: "gifts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gift_redemptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gifts": {
                  Row: {
                    "cost_points": number,"created_at": string,"id": string,"image_url": string | null,"is_active": boolean,"name": string,"service_id": string,"stock": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_points": number,"created_at"?: string,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name": string,"service_id": string,"stock"?: number | null
                  }
                  Update: {
                    "cost_points"?: number,"created_at"?: string,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"service_id"?: string,"stock"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gifts_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"join_codes": {
                  Row: {
                    "class_id": string,"code": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"id": string,"is_active": boolean,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_active"?: boolean,"service_id": string
                  }
                  Update: {
                    "class_id"?: string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"is_active"?: boolean,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "join_codes_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "join_codes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "join_codes_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_attendance": {
                  Row: {
                    "created_at": string,"id": string,"meeting_date": string,"present": boolean,"recorded_by": string | null,"served_id": string,"service_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"meeting_date": string,"present"?: boolean,"recorded_by"?: string | null,"served_id": string,"service_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"meeting_date"?: string,"present"?: boolean,"recorded_by"?: string | null,"served_id"?: string,"service_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_attendance_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_attendance_served_id_fkey"
      columns: ["served_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_attendance_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"meetings": {
                  Row: {
                    "class_id": string | null,"created_at": string,"created_by": string | null,"details": string | null,"id": string,"meeting_date": string,"service_id": string,"speaker_id": string | null,"start_time": string | null,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: string | null,"id"?: string,"meeting_date": string,"service_id": string,"speaker_id"?: string | null,"start_time"?: string | null,"topic": string
                  }
                  Update: {
                    "class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"details"?: string | null,"id"?: string,"meeting_date"?: string,"service_id"?: string,"speaker_id"?: string | null,"start_time"?: string | null,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meetings_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_speaker_id_fkey"
      columns: ["speaker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"point_rules": {
                  Row: {
                    "created_at": string,"points": number,"reason": Database["public"]['Enums']["point_reason"],"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"points": number,"reason": Database["public"]['Enums']["point_reason"],"service_id": string
                  }
                  Update: {
                    "created_at"?: string,"points"?: number,"reason"?: Database["public"]['Enums']["point_reason"],"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "point_rules_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"points_ledger": {
                  Row: {
                    "class_id": string | null,"created_at": string,"created_by": string | null,"id": string,"note": string | null,"points": number,"reason": Database["public"]['Enums']["point_reason"],"service_id": string,"source_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"points": number,"reason": Database["public"]['Enums']["point_reason"],"service_id": string,"source_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"points"?: number,"reason"?: Database["public"]['Enums']["point_reason"],"service_id"?: string,"source_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_ledger_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "points_ledger_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string | null,"body": string,"class_id": string | null,"created_at": string,"id": string,"image_url": string | null,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"class_id"?: string | null,"created_at"?: string,"id"?: string,"image_url"?: string | null,"service_id": string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"class_id"?: string | null,"created_at"?: string,"id"?: string,"image_url"?: string | null,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "posts_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"prep_attendance": {
                  Row: {
                    "checked_in_at": string,"created_at": string,"id": string,"servant_id": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_in_at"?: string,"created_at"?: string,"id"?: string,"servant_id": string,"session_id": string
                  }
                  Update: {
                    "checked_in_at"?: string,"created_at"?: string,"id"?: string,"servant_id"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prep_attendance_servant_id_fkey"
      columns: ["servant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prep_attendance_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "prep_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"prep_sessions": {
                  Row: {
                    "created_at": string,"id": string,"service_id": string,"session_date": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"service_id": string,"session_date": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"service_id"?: string,"session_date"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prep_sessions_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"is_super_admin": boolean,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"is_super_admin"?: boolean,"phone"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"is_super_admin"?: boolean,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"servant_assignments": {
                  Row: {
                    "created_at": string,"id": string,"servant_id": string,"served_id": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"servant_id": string,"served_id": string,"service_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"servant_id"?: string,"served_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "servant_assignments_servant_id_fkey"
      columns: ["servant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servant_assignments_served_id_fkey"
      columns: ["served_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servant_assignments_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"service_members": {
                  Row: {
                    "class_id": string | null,"created_at": string,"id": string,"role": Database["public"]['Enums']["member_role"],"service_id": string,"status": Database["public"]['Enums']["member_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id"?: string | null,"created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["member_role"],"service_id": string,"status"?: Database["public"]['Enums']["member_status"],"user_id": string
                  }
                  Update: {
                    "class_id"?: string | null,"created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"service_id"?: string,"status"?: Database["public"]['Enums']["member_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_members_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "service_members_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "church_id": string,"created_at": string,"description": string | null,"id": string,"logo_url": string | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "church_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"logo_url"?: string | null,"name": string
                  }
                  Update: {
                    "church_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"logo_url"?: string | null,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_church_id_fkey"
      columns: ["church_id"]
isOneToOne: false
      referencedRelation: "churches"
      referencedColumns: ["id"]
    }
                  ]
                },"user_achievements": {
                  Row: {
                    "achievement_id": string,"created_at": string,"earned_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievement_id": string,"created_at"?: string,"earned_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "achievement_id"?: string,"created_at"?: string,"earned_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_achievements_achievement_id_fkey"
      columns: ["achievement_id"]
isOneToOne: false
      referencedRelation: "achievements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_achievements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"visits": {
                  Row: {
                    "created_at": string,"id": string,"notes": string | null,"servant_id": string,"served_id": string,"service_id": string,"visit_type": Database["public"]['Enums']["visit_type"],"visited_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"servant_id": string,"served_id": string,"service_id": string,"visit_type": Database["public"]['Enums']["visit_type"],"visited_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"servant_id"?: string,"served_id"?: string,"service_id"?: string,"visit_type"?: Database["public"]['Enums']["visit_type"],"visited_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_servant_id_fkey"
      columns: ["servant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_served_id_fkey"
      columns: ["served_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_class_leaderboard": {
                  Row: {
                    "avatar_url": string | null,"class_id": string | null,"full_name": string,"rank": number | null,"role": Database["public"]['Enums']["member_role"],"service_id": string,"total_points": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "service_members_class_id_service_id_fkey"
      columns: ["class_id","service_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id","service_id"]
    },{
      foreignKeyName: "service_members_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"v_service_leaderboard": {
                  Row: {
                    "avatar_url": string | null,"full_name": string,"rank": number | null,"role": Database["public"]['Enums']["member_role"],"service_id": string,"total_points": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "service_members_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "achievement_counts":
{ Args: { "p_service": string }; Returns: {
              "achievement_id": string,"earned": number
            }[]
                           },
"achievement_progress":
{ Args: { "p_service": string,"p_type": string,"p_user": string }; Returns: number
                           },
"achievement_service_id":
{ Args: { "p_achievement": string }; Returns: string
                           },
"available_points":
{ Args: { "p_service": string,"p_user": string }; Returns: number
                           },
"award_points":
{ Args: { "p_note"?: string,"p_points": number,"p_reason"?: Database["public"]['Enums']["point_reason"],"p_service": string,"p_user": string }; Returns: string
                           },
"award_points_many":
{ Args: { "p_note"?: string,"p_points": number,"p_reason"?: Database["public"]['Enums']["point_reason"],"p_service": string,"p_users": (string)[] }; Returns: number
                           },
"cairo_end_of_day":
{ Args: { "p_date": string }; Returns: string
                           },
"cairo_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_see_church":
{ Args: { "p_church": string }; Returns: boolean
                           },
"can_see_class":
{ Args: { "p_class": string,"p_service": string }; Returns: boolean
                           },
"can_see_competition":
{ Args: { "p_competition": string }; Returns: boolean
                           },
"can_see_profile":
{ Args: { "p_user": string }; Returns: boolean
                           },
"can_take_attendance":
{ Args: { "p_service": string }; Returns: boolean
                           },
"check_in_prep":
{ Args: { "p_session": string }; Returns: boolean
                           },
"church_admins":
{ Args: { "p_church": string }; Returns: {
              "created_at": string,"full_name": string,"phone": string,"user_id": string
            }[]
                           },
"church_servants":
{ Args: { "p_church": string }; Returns: {
              "full_name": string,"in_pool": boolean,"phone": string,"service_ids": (string)[],"user_id": string
            }[]
                           },
"competition_answer_key":
{ Args: { "p_competition": string }; Returns: {
              "correct_index": number,"question_id": string
            }[]
                           },
"competition_service_id":
{ Args: { "p_competition": string }; Returns: string
                           },
"create_join_code":
{ Args: { "p_class": string,"p_expires_on"?: string }; Returns: {
              "class_id": string,
"code": string,
"created_at": string,
"created_by": string | null,
"expires_at": string | null,
"id": string,
"is_active": boolean,
"service_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "join_codes"
        isOneToOne: true
        isSetofReturn: false
      } },
"decide_redemption":
{ Args: { "p_redemption": string,"p_status": Database["public"]['Enums']["redemption_status"] }; Returns: undefined
                           },
"evaluate_achievements":
{ Args: { "p_service": string,"p_user": string }; Returns: number
                           },
"find_user_by_phone":
{ Args: { "p_phone": string }; Returns: {
              "full_name": string,"id": string
            }[]
                           },
"generate_join_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"gift_service_id":
{ Args: { "p_gift": string }; Returns: string
                           },
"has_service_role":
{ Args: { "p_role": Database["public"]['Enums']["member_role"],"p_service": string }; Returns: boolean
                           },
"is_active_member":
{ Args: { "p_role": Database["public"]['Enums']["member_role"],"p_service": string,"p_user": string }; Returns: boolean
                           },
"is_assigned_servant":
{ Args: { "p_served": string,"p_service": string }; Returns: boolean
                           },
"is_church_admin":
{ Args: { "p_church": string }; Returns: boolean
                           },
"is_service_admin":
{ Args: { "p_service": string }; Returns: boolean
                           },
"is_service_member":
{ Args: { "p_service": string }; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_code_preview":
{ Args: { "p_code": string }; Returns: {
              "already_member": boolean,"church_name": string,"class_name": string,"service_id": string,"service_name": string
            }[]
                           },
"join_with_code":
{ Args: { "p_code": string }; Returns: string
                           },
"ledger_add":
{ Args: { "p_note"?: string,"p_points": number,"p_reason": Database["public"]['Enums']["point_reason"],"p_service": string,"p_source"?: string,"p_user": string }; Returns: string
                           },
"log_visit":
{ Args: { "p_notes"?: string,"p_served": string,"p_service": string,"p_type": Database["public"]['Enums']["visit_type"],"p_visited_at"?: string }; Returns: string
                           },
"mark_prep_attendance":
{ Args: { "p_present": boolean,"p_servant": string,"p_session": string }; Returns: undefined
                           },
"meeting_attendance_sheet":
{ Args: { "p_date": string,"p_service": string }; Returns: {
              "avatar_url": string,"class_id": string,"full_name": string,"present": boolean,"served_id": string
            }[]
                           },
"meeting_refs_ok":
{ Args: { "p_class": string,"p_service": string,"p_speaker": string }; Returns: boolean
                           },
"member_class_id":
{ Args: { "p_service": string,"p_user": string }; Returns: string
                           },
"my_assigned":
{ Args: { "p_service": string }; Returns: {
              "avatar_url": string,"class_id": string,"class_name": string,"full_name": string,"last_visit_at": string,"last_visit_type": Database["public"]['Enums']["visit_type"],"phone": string,"served_id": string,"visits_count": number
            }[]
                           },
"my_available_points":
{ Args: { "p_service": string }; Returns: number
                           },
"my_points":
{ Args: { "p_service": string }; Returns: {
              "class_id": string,"class_rank": number,"class_total": number,"role": Database["public"]['Enums']["member_role"],"service_rank": number,"service_total": number
            }[]
                           },
"normalize_join_code":
{ Args: { "p_code": string }; Returns: string
                           },
"prep_attendance_sheet":
{ Args: { "p_session": string }; Returns: {
              "checked_in_at": string,"full_name": string,"present": boolean,"servant_id": string
            }[]
                           },
"prep_session_service_id":
{ Args: { "p_session": string }; Returns: string
                           },
"recent_meetings":
{ Args: { "p_service": string }; Returns: {
              "meeting_date": string,"present_count": number
            }[]
                           },
"redeem_gift":
{ Args: { "p_gift": string }; Returns: string
                           },
"regenerate_join_code":
{ Args: { "p_code_id": string }; Returns: string
                           },
"remove_church_servant":
{ Args: { "p_church": string,"p_user": string }; Returns: undefined
                           },
"reverse_points":
{ Args: { "p_entry": string,"p_note"?: string }; Returns: string
                           },
"rule_points":
{ Args: { "p_reason": Database["public"]['Enums']["point_reason"],"p_service": string }; Returns: number
                           },
"save_competition":
{ Args: { "p_class": string,"p_description": string,"p_ends_local": string,"p_id": string,"p_max_points": number,"p_service": string,"p_starts_local": string,"p_title": string }; Returns: string
                           },
"search_users":
{ Args: { "p_query": string }; Returns: {
              "full_name": string,"id": string,"phone": string
            }[]
                           },
"service_church_id":
{ Args: { "p_service": string }; Returns: string
                           },
"service_roster":
{ Args: { "p_service": string }; Returns: {
              "avatar_url": string,"class_id": string,"full_name": string,"joined_at": string,"member_id": string,"phone": string,"role": Database["public"]['Enums']["member_role"],"status": Database["public"]['Enums']["member_status"],"user_id": string
            }[]
                           },
"set_join_code_expiry":
{ Args: { "p_code_id": string,"p_expires_on": string }; Returns: undefined
                           },
"set_meeting_attendance":
{ Args: { "p_date": string,"p_present": (string)[],"p_service": string }; Returns: number
                           },
"set_servant_services":
{ Args: { "p_church": string,"p_services": (string)[],"p_user": string }; Returns: undefined
                           },
"submit_competition":
{ Args: { "p_answers": Json,"p_competition": string }; Returns: {
              "correct": number,"score": number,"total": number
            }[]
                           },
"try_uuid":
{ Args: { "p_text": string }; Returns: string
                           },
"visible_phone":
{ Args: { "p_user": string }; Returns: string
                           },
"visit_overview":
{ Args: { "p_service": string }; Returns: {
              "class_id": string,"full_name": string,"last_visit_at": string,"servant_id": string,"servant_name": string,"served_id": string
            }[]
                           }
          }
          Enums: {
            "church_role": "church_admin"|"servant","member_role": "service_admin"|"servant"|"served","member_status": "pending"|"active"|"removed","point_reason": "competition"|"visit"|"preparation"|"attendance"|"manual"|"gift_redemption"|"achievement","redemption_status": "requested"|"approved"|"delivered"|"rejected","visit_type": "home"|"call"|"message"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "church_role": ["church_admin", "servant"],"member_role": ["service_admin", "servant", "served"],"member_status": ["pending", "active", "removed"],"point_reason": ["competition", "visit", "preparation", "attendance", "manual", "gift_redemption", "achievement"],"redemption_status": ["requested", "approved", "delivered", "rejected"],"visit_type": ["home", "call", "message", "other"]
          }
        }
} as const
