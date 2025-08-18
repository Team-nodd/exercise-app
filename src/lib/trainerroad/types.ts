// TrainerRoad API Types

export interface TrainerRoadProgression {
  Id: number
  Text: string
  MemberId: number
  Updated: string
  TranslationsUpdated?: string
}

export interface TrainerRoadWorkoutProgression {
  Id: number
  Delta: number
  Level: number
}

export interface TrainerRoadWorkout {
  Id: number
  MemberId: number
  Duration: number // minutes
  FirstPublishDate: string
  GoalDescription: string
  AverageFtpPercent: number
  IntensityFactor: number // as percentage (e.g., 82 for 0.82)
  ExternalProviderType?: string
  Kj: number
  PicUrl: string
  Tss: number
  WorkoutDescription: string
  WorkoutAlternateDescription?: string
  WorkoutName: string
  WorkoutTypeId: number
  WorkoutLabelId: number
  IsOutside: boolean
  IndoorAlternativeId?: number
  Progression: TrainerRoadProgression
  ProgressionId: number
  ProgressionLevel: number
}

export interface TrainerRoadActivity {
  Id: number
  CanEstimateTss: boolean
  ClassificationType: number
  ExpectedIntensityFactor: number
  ExpectedKj: number
  IntensityFactor: number
  IsCutShort: boolean
  IsIndoorSwim: boolean
  Kj: number
  OpenType: number
  Progression: TrainerRoadWorkoutProgression
  SurveyOptionText: string
  WorkoutId: number
  Guid: string
  Duration: number // seconds
  ExpectedTss: number
  HasGpsData: boolean
  IsExternal: boolean
  Name: string
  Processed: string // ISO date string
  Source: string | null
  Started: string // ISO date string
  Tss: number
  Type: number // 1 = cardio workout
}

// Our internal representation after mapping
export interface ExternalActivity {
  id?: number
  user_id: string
  external_id: string
  external_source: 'trainerroad'
  external_guid?: string
  workout_id?: number
  
  // Core activity data
  name: string
  duration_seconds: number
  expected_tss?: number
  actual_tss?: number
  expected_kj?: number
  actual_kj?: number
  intensity_factor?: number
  expected_intensity?: number
  
  // Activity flags
  is_cut_short: boolean
  has_gps_data: boolean
  is_indoor_swim: boolean
  is_external: boolean
  can_estimate_tss: boolean
  
  // Additional data
  survey_option_text?: string
  classification_type?: number
  open_type?: number
  activity_type?: number
  source?: string
  
  // Progression data
  progression_data?: TrainerRoadProgression
  
  // Timestamps
  started_at: string
  processed_at: string
  sync_at?: string
  created_at?: string
  updated_at?: string
}

// User sync settings
export interface TrainerRoadSyncSettings {
  trainerroad_username?: string
  last_trainerroad_sync?: string
  trainerroad_sync_enabled: boolean
}

// Sync status and results
export interface SyncResult {
  success: boolean
  activities_imported: number
  activities_updated: number
  errors: string[]
  last_sync: string
}

export interface SyncStatus {
  is_syncing: boolean
  last_sync?: string
  last_result?: SyncResult
}

// API response types
export type TrainerRoadActivitiesResponse = TrainerRoadActivity[]
export type TrainerRoadWorkoutsResponse = TrainerRoadWorkout[]

// Mapping functions
export const mapTrainerRoadToExternalActivity = (
  trActivity: TrainerRoadActivity,
  userId: string
): ExternalActivity => ({
  user_id: userId,
  external_id: trActivity.Id.toString(),
  external_source: 'trainerroad',
  external_guid: trActivity.Guid,
  
  name: trActivity.Name,
  duration_seconds: trActivity.Duration,
  expected_tss: trActivity.ExpectedTss,
  actual_tss: trActivity.Tss,
  expected_kj: trActivity.ExpectedKj,
  actual_kj: trActivity.Kj,
  intensity_factor: trActivity.IntensityFactor,
  expected_intensity: trActivity.ExpectedIntensityFactor,
  
  is_cut_short: trActivity.IsCutShort,
  has_gps_data: trActivity.HasGpsData,
  is_indoor_swim: trActivity.IsIndoorSwim,
  is_external: trActivity.IsExternal,
  can_estimate_tss: trActivity.CanEstimateTss,
  
  survey_option_text: trActivity.SurveyOptionText,
  classification_type: trActivity.ClassificationType,
  open_type: trActivity.OpenType,
  activity_type: trActivity.Type,
  source: trActivity.Source,
  
  progression_data: trActivity.Progression,
  
  started_at: trActivity.Started,
  processed_at: trActivity.Processed,
})

// Convert external activity to workout format
export const mapExternalActivityToWorkout = (
  activity: ExternalActivity,
  programId: number
) => ({
  program_id: programId,
  user_id: activity.user_id,
  name: `${activity.name} (TrainerRoad)`,
  workout_type: 'cardio' as const,
  duration_minutes: Math.round(activity.duration_seconds / 60),
  target_tss: activity.expected_tss,
  target_ftp: null, // TrainerRoad doesn't provide FTP directly
  completed: true,
  completed_at: activity.started_at,
  external_activity_id: activity.id,
  actual_tss: activity.actual_tss,
  energy_kj: activity.actual_kj,
  intensity_factor: activity.intensity_factor,
  notes: activity.survey_option_text ? `Survey: ${activity.survey_option_text}` : null,
})

export default {
  mapTrainerRoadToExternalActivity,
  mapExternalActivityToWorkout,
}
