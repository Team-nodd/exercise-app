# TrainerRoad API Integration Analysis

## Overview
This document analyzes the TrainerRoad API data structure and proposes an integration strategy for the FitTracker fitness app.

## TrainerRoad API Data Structure

### Sample API Response
```json
{
  "Id": 370386784,
  "CanEstimateTss": false,
  "ClassificationType": 0,
  "ExpectedIntensityFactor": 68,
  "ExpectedKj": 582,
  "IntensityFactor": 0.673469387755102,
  "IsCutShort": false,
  "IsIndoorSwim": false,
  "Kj": 580,
  "OpenType": 0,
  "Progression": {
    "Id": 16,
    "Delta": 0,
    "Level": 1
  },
  "SurveyOptionText": "Training Fatigue",
  "WorkoutId": 355749,
  "Guid": "bfbdeed0-b0aa-480e-9dcf-ffb90719b2bf",
  "Duration": 3600,
  "ExpectedTss": 46,
  "HasGpsData": false,
  "IsExternal": false,
  "Name": "Colosseum -2",
  "Processed": "2025-08-15T01:09:46.6584611",
  "Source": null,
  "Started": "2025-08-15T10:08:54",
  "Tss": 45,
  "Type": 1
}
```

## Current FitTracker Schema Analysis

### Existing Tables That Can Accommodate TrainerRoad Data

1. **workouts** table:
   - `duration_minutes` ✅ (map from Duration/60)
   - `target_tss` ✅ (map from ExpectedTss)
   - `completed` ✅ (always true for imported activities)
   - `completed_at` ✅ (map from Started)
   - `workout_type` ✅ ("cardio" for all TrainerRoad activities)

2. **cardio_exercises** table:
   - `name` ✅ (map from Name)
   - `target_tss` ✅ (map from ExpectedTss)
   - `duration_minutes` ✅ (map from Duration/60)

## Required Database Schema Extensions

### New Table: `external_activities`
```sql
CREATE TABLE public.external_activities (
  id                    bigserial PRIMARY KEY,
  user_id               uuid NOT NULL,
  external_id           text NOT NULL,        -- TrainerRoad Id
  external_source       text NOT NULL,        -- "trainerroad"
  external_guid         text,                 -- TrainerRoad Guid
  workout_id            bigint,               -- Link to our workouts table
  
  -- TrainerRoad specific fields
  name                  text NOT NULL,
  duration_seconds      integer NOT NULL,
  expected_tss          integer,
  actual_tss            integer,
  expected_kj           integer,
  actual_kj             integer,
  intensity_factor      decimal(5,3),
  expected_intensity    integer,
  is_cut_short          boolean DEFAULT false,
  has_gps_data          boolean DEFAULT false,
  survey_option_text    text,
  classification_type   integer,
  
  -- Progression data (JSON for flexibility)
  progression_data      jsonb,
  
  -- Timestamps
  started_at            timestamptz NOT NULL,
  processed_at          timestamptz NOT NULL,
  sync_at              timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT fk_external_activities_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_activities_workout FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE SET NULL,
  CONSTRAINT unique_external_activity UNIQUE (external_source, external_id, user_id)
);
```

### Extend Existing Tables

#### Add to `users` table:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainerroad_username text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_trainerroad_sync timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainerroad_sync_enabled boolean DEFAULT false;
```

#### Add to `workouts` table:
```sql
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS external_activity_id bigint;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS actual_tss integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS energy_kj integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS intensity_factor decimal(5,3);

-- Add foreign key constraint
ALTER TABLE public.workouts ADD CONSTRAINT fk_workouts_external_activity 
  FOREIGN KEY (external_activity_id) REFERENCES public.external_activities(id) ON DELETE SET NULL;
```

## Data Mapping Strategy

### TrainerRoad → FitTracker Mapping

| TrainerRoad Field | FitTracker Field | Transformation |
|------------------|------------------|----------------|
| `Id` | `external_activities.external_id` | Direct string mapping |
| `Name` | `external_activities.name` | Direct mapping |
| `Duration` | `external_activities.duration_seconds` | Direct mapping (seconds) |
| `Duration` | `workouts.duration_minutes` | `Duration / 60` |
| `ExpectedTss` | `external_activities.expected_tss` | Direct mapping |
| `Tss` | `external_activities.actual_tss` | Direct mapping |
| `ExpectedKj` | `external_activities.expected_kj` | Direct mapping |
| `Kj` | `external_activities.actual_kj` | Direct mapping |
| `IntensityFactor` | `external_activities.intensity_factor` | Direct mapping |
| `Started` | `external_activities.started_at` | Parse ISO date |
| `Processed` | `external_activities.processed_at` | Parse ISO date |
| `Guid` | `external_activities.external_guid` | Direct mapping |
| `Type` | `workouts.workout_type` | Map `1` → "cardio" |
| `Progression` | `external_activities.progression_data` | Store as JSONB |

## Integration Implementation Strategy

### Phase 1: Database Setup (Non-disruptive)
1. Create `external_activities` table
2. Add new columns to existing tables
3. Create indexes for performance
4. Set up RLS policies

### Phase 2: API Integration Layer
1. Create TrainerRoad API client service
2. Implement data sync service
3. Add user settings for sync configuration
4. Create sync status tracking

### Phase 3: UI Integration
1. Add TrainerRoad sync settings to user configuration
2. Display imported activities in workout history
3. Show sync status and last sync time
4. Add manual sync trigger

### Phase 4: Advanced Features
1. Automatic workout creation from TrainerRoad activities
2. TSS and training load analytics
3. Progression tracking from TrainerRoad data
4. Workout recommendations based on TrainerRoad history

## Security Considerations

1. **API Key Storage**: Store TrainerRoad usernames (public), not API keys
2. **Data Privacy**: User must explicitly enable sync
3. **Rate Limiting**: Implement proper rate limiting for TrainerRoad API calls
4. **Error Handling**: Graceful handling of API failures
5. **Data Validation**: Validate all incoming TrainerRoad data

## Implementation Files

### Database Migration
- `supabase/migrations/20250101000000_add_trainerroad_integration.sql`

### API Services
- `src/lib/trainerroad/client.ts` - TrainerRoad API client
- `src/lib/trainerroad/sync.ts` - Data synchronization service
- `src/lib/trainerroad/types.ts` - TypeScript types

### UI Components
- `src/components/settings/trainerroad-sync-settings.tsx`
- `src/components/dashboard/external-activities.tsx`

### API Routes
- `src/app/api/trainerroad/sync/route.ts` - Manual sync endpoint
- `src/app/api/trainerroad/webhook/route.ts` - Webhook for automatic sync

## Next Steps

1. Create database migration file
2. Implement basic TrainerRoad API client
3. Add sync settings to user configuration page
4. Test with sample data
5. Implement full sync workflow
