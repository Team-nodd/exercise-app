/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useCallback, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, Circle, Dumbbell,  AlertCircle, ArrowLeft, MessageSquare, Send,  Calendar, Zap,  Activity, ChevronDown, Loader2, RefreshCw, CheckCircle2, Clock,  Mail, Save, Timer, Share, Folder, Target } from 'lucide-react';
import type { WorkoutWithDetails, WorkoutExerciseWithDetails, Comment } from '@/types';
import { notificationService } from '@/lib/notifications/notification-service';

import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AppLink } from '../ui/app-link';
import { useSearchParams } from 'next/navigation';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Card as UiCard, CardHeader as UiCardHeader, CardTitle as UiCardTitle, CardContent as UiCardContent } from '@/components/ui/card'
import { Calendar as CalIcon, Zap as ZapIcon, Activity as ActivityIcon, Image as ImageIcon, Map as MapIcon, Gauge as GaugeIcon, BarChart3 as BarChartIcon } from 'lucide-react'

interface WorkoutDetailProps {
  workoutId: string;
  userId: string; // Added userId prop
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function WorkoutDetail({ workoutId, userId }: WorkoutDetailProps) {
  const [workout, setWorkout] = useState<WorkoutWithDetails | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [workoutComments, setWorkoutComments] = useState<Comment[]>([]);
  const [newWorkoutComment, setNewWorkoutComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null); // State to store current user profile
  const [sharing, setSharing] = useState(false);

  // Email dialog states
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [coachEmail, setCoachEmail] = useState<string>('');
  const [coachNotifyEnabled, setCoachNotifyEnabled] = useState(false)

  // State for exercise expansion and editing
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [editingExercises, setEditingExercises] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, {
    sets: number | "";
    reps: number | "";
    weight: number | "";
    rest_seconds: number | "";
  }>>({});
  const [initialEditValues, setInitialEditValues] = useState<Record<string, {
    sets: number | "";
    reps: number | "";
    weight: number | "";
    rest_seconds: number | "";
  }>>({});

  const supabase = createClient();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const from = searchParams?.get('from')
  const programIdParam = searchParams?.get('programId')

  // Cross-tab and cross-device broadcast helper
  const broadcastUpdate = (changes: any) => {
    try {
      const payload = {
        type: 'updated',
        workoutId: Number(workoutId),
        programId: (workout as any)?.program_id ?? workout?.program?.id,
        userId: workout?.user_id,
        changes,
      }
      try {
        const bc = new BroadcastChannel('workouts')
        bc.postMessage(payload)
        bc.close()
      } catch {
        localStorage.setItem('workout-updated', JSON.stringify(payload))
        setTimeout(() => localStorage.removeItem('workout-updated'), 1000)
      }
      try {
        supabase.channel('workouts-live').send({ type: 'broadcast', event: 'workout-updated', payload })
      } catch {}
      // Persist into a small local queue so dashboards can replay on mount
      try {
        const key = 'workout-updates-queue'
        const raw = localStorage.getItem(key)
        const arr = raw ? JSON.parse(raw) : []
        if (Array.isArray(arr)) {
          arr.push({ ...payload, ts: Date.now() })
          // Keep queue bounded
          while (arr.length > 100) arr.shift()
          localStorage.setItem(key, JSON.stringify(arr))
        } else {
          localStorage.setItem(key, JSON.stringify([{ ...payload, ts: Date.now() }]))
        }
      } catch {}
    } catch {}
  }

  // Get current user profile
  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setProfile(profileData);
      }
    }
    fetchProfile();
  }, [supabase]);

  // Fetch coach email when workout is loaded
  useEffect(() => {
    async function fetchCoachEmail() {
      if (workout?.program?.coach_id) {
        const { data: coachData } = await supabase
          .from('users')
          .select('email, workout_completed_email')
          .eq('id', workout.program.coach_id)
          .single();

        if (coachData?.email) setCoachEmail(coachData.email);
        setCoachNotifyEnabled(!!coachData?.workout_completed_email);
      }
    }
    if (workout) fetchCoachEmail();
  }, [workout, supabase]);


  // Debounce pending updates
  const debouncedUpdates = useDebounce(pendingUpdates, 1000);

  // Check if workout is completed
  const isWorkoutCompleted = () => {
    if (workout?.workout_type === 'cardio') {
      return workout.completed;
    } else {
      // For gym workouts, check if all exercises are completed
      return exercises.length > 0 && exercises.every(ex => ex.completed);
    }
  };

  const fetchWorkoutData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch workout details with program (including coach_id) and selected cardio exercise
      const workoutPromise = supabase
        .from('workouts')
        .select(`
          *,
          program:programs(id, name, coach_id, user_id),
          cardio_exercise:cardio_exercises(*)
        `)
        .eq('id', workoutId)
        .single();

      const { data: workoutData, error: workoutError } = await Promise.race([workoutPromise, timeoutPromise]) as any;

      if (workoutError) {
        // Handle specific error for multiple rows
        if (workoutError.code === 'PGRST116') {
          throw new Error('Multiple workouts found with this ID. Please contact support.');
        }
        throw workoutError;
      }

      // Check if user has access to this workout
      if (!workoutData) {
        throw new Error('Workout not found.');
      }

      // Verify user has access (either they own the workout or they're the coach)
      const hasAccess = workoutData.user_id === userId ||
                        (workoutData.program?.coach_id === userId) ||
                        (workoutData.program?.user_id === userId);

      if (!hasAccess) {
        throw new Error('You do not have permission to view this workout.');
      }

      setWorkout(workoutData as WorkoutWithDetails);

      // Fetch workout exercises if it's a gym workout
      if (workoutData.workout_type === 'gym') {
        const exercisesPromise = supabase
          .from('workout_exercises')
          .select(`
            *,
            exercise:exercises(*)
          `)
          .eq('workout_id', workoutId)
          .order('order_in_workout', { ascending: true });

        const { data: exercisesData, error: exercisesError } = await Promise.race([exercisesPromise, timeoutPromise]) as any;

        if (exercisesError) {
          console.error('Error fetching exercises:', exercisesError);
          toast('Failed to load workout exercises');
          return;
        }

        const exercisesList = exercisesData as WorkoutExerciseWithDetails[];
        setExercises(exercisesList);

        // Initialize edit values for all exercises
        const makeParsedWeight = (w: string | null): number | '' => {
          if (!w) return '';
          const match = String(w).match(/[+-]?\d*\.?\d+/);
          if (!match) return '';
          const num = Number.parseFloat(match[0]);
          return Number.isFinite(num) ? num : '';
        };

        const initialMap: Record<string, any> = {};
        exercisesList.forEach(ex => {
          initialMap[ex.id] = {
            sets: ex.sets,
            reps: ex.reps,
            weight: makeParsedWeight(ex.weight ?? null),
            rest_seconds: ex.rest_seconds,
          };
        });
        setEditValues(initialMap);
        setInitialEditValues(initialMap);
      }
    } catch (err: any) {
      console.error('Error fetching workout data:', err);
      setError(err.message || 'Failed to load workout details.');
    } finally {
      setLoading(false);
    }
  }, [workoutId, userId, supabase]);

  // TrainerRoad integration: fetch and display data for completed cardio workouts
  const [trLoading, setTrLoading] = useState(false)
  const [trError, setTrError] = useState<string | null>(null)
  const [trDetails, setTrDetails] = useState<any | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setTrError(null)
        setTrDetails(null)
        if (!workout || workout.workout_type !== 'cardio' || !workout.completed) return
        // Determine window for the day of the workout in UTC boundaries used by TrainerRoad
        // Prefer scheduled day to scope the calendar correctly
        const whenIso = workout.scheduled_date || workout.completed_at

        console.log('whenIso', whenIso)
        if (!whenIso) return
        setTrLoading(true)
        const when = new Date(whenIso)
        // Build local day boundaries to match user's calendar day
        const start = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 0, 0, 0, 0)
        const end = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 23, 59, 59, 999)
        const startStr = start.toISOString()
        const endStr = end.toISOString()

        // 1) Fetch activities for that day
        const actResp = await fetch(`/api/trainerroad/activities/by-date?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&wid=${workout.id}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!actResp.ok) {
          const msg = (await actResp.json().catch(() => ({} as any))).error || 'Failed to fetch TrainerRoad activities'
          throw new Error(msg)
        }
        const acts: any[] = await actResp.json()
        if (!Array.isArray(acts) || acts.length === 0) {
          setTrLoading(false)
          setTrError('No TrainerRoad activity found for this day')
          return
        }
        // Strictly select activities whose local date matches the workout date
        const toDateKey = (isoLike: string | Date) => {
          const d = new Date(isoLike)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const da = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${da}`
        }
        const targetKey = toDateKey(when)
        const sameDayActs = acts.filter((cur) => {
          const iso = (cur.started || cur.Started || cur.processed || cur.Processed) as string
          if (!iso) return false
          return toDateKey(iso) === targetKey
        })
        if (sameDayActs.length === 0) {
          setTrLoading(false)
          setTrError('No TrainerRoad activity found for this day')
          return
        }
        const whenMs = when.getTime()
        const best = sameDayActs.reduce((acc, cur) => {
          const tIso = (cur.started || cur.Started || cur.processed || cur.Processed) as string
          const t = tIso ? new Date(tIso).getTime() : Number.POSITIVE_INFINITY
          const dist = Math.abs(t - whenMs)
          return !acc || dist < acc._dist ? { ...cur, _dist: dist } : acc
        }, null as any)
        const workoutId = best?.workoutId || best?.WorkoutId
        if (!workoutId) {
          setTrLoading(false)
          setTrError('TrainerRoad workout id not found for the activity')
          return
        }

        // 2) Fetch workout information by id
        const infoResp = await fetch(`/api/trainerroad/workout-information?ids=${encodeURIComponent(String(workoutId))}&wid=${workout.id}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!infoResp.ok) {
          const msg = (await infoResp.json().catch(() => ({} as any))).error || 'Failed to fetch TrainerRoad workout info'
          throw new Error(msg)
        }
        const infoArr: any[] = await infoResp.json()
        const info = Array.isArray(infoArr) && infoArr.length > 0 ? infoArr[0] : null
        setTrDetails({ activity: best, workout: info })
        setTrLoading(false)
      } catch (e: any) {
        setTrLoading(false)
        setTrError(e?.message || 'Failed to load TrainerRoad data')
      }
    })()
  }, [workout])

  // Fetch comments for workout
  const fetchComments = useCallback(
    async () => {
      try {
        const { data: workoutCommentsData, error: workoutCommentsError } = await supabase
          .from('comments')
          .select('*, user:users(id, name, role)') // Fetch user role for comments
          .eq('workout_id', workoutId)
          .is('workout_exercise_id', null)
          .order('created_at', { ascending: true });

        if (workoutCommentsError) {
          console.error('Error fetching workout comments:', workoutCommentsError);
          toast('Failed to load workout comments');
        } else {
          setWorkoutComments(workoutCommentsData as Comment[] || []);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast('Failed to load comments');
      }
    },
    [supabase, workoutId],
  );

  // Fetch comments after loading workout/exercises
  useEffect(() => {
    if (workout) {
      fetchComments();
    }
  }, [workout, fetchComments]);

  // Scroll to hashed comment id inside the comments list when available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash) as HTMLElement | null;
    if (el) {
      const scrollParent = (node: HTMLElement | null): HTMLElement | null => {
        let current: HTMLElement | null = node?.parentElement || null;
        while (current) {
          const style = window.getComputedStyle(current);
          const overflowY = style.overflowY;
          const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
          if (canScroll) return current;
          current = current.parentElement;
        }
        return null;
      };

      setTimeout(() => {
        const container = scrollParent(el);
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 + el.clientHeight / 2;
          container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 2000);
      }, 150);
    }
  }, [workoutComments]);

  // If a specific comment id is in the hash but not yet loaded, try to fetch it and append
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.hash.match(/^#comment-(\d+)$/);
    if (!match) return;
    const commentId = Number.parseInt(match[1]);
    if (!commentId) return;

    const exists = workoutComments.some(c => c.id === commentId);
    if (exists) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, user:users(id, name, role)')
          .eq('id', commentId)
          .single();

        if (!cancelled && !error && data && data.workout_id === Number(workoutId)) {
          setWorkoutComments(prev => {
            const next = [...prev, data as any];
            next.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return next;
          });
        }
      } catch {
        // ignore
      }
    })();

    return () => { cancelled = true };
  }, [supabase, workoutId, workoutComments]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  // Auto-save when debounced updates change (only for non-inline flows)
  useEffect(() => {
    if (Object.keys(debouncedUpdates).length > 0) {
      saveUpdates();
    }
  }, [debouncedUpdates]);

  const saveUpdates = async () => {
    if (Object.keys(pendingUpdates).length === 0) return;

    setSaving(true);
    try {
      const updates = Object.entries(pendingUpdates).map(([exerciseId, changes]) => ({
        id: exerciseId,
        ...changes,
      }));

      for (const update of updates) {
        const { id, ...updateData } = update;
        const { error } = await supabase.from('workout_exercises').update(updateData).eq('id', id);

        if (error) {
          console.error('Error updating exercise:', error);
          toast('Failed to save changes');
          return;
        }
      }

      // After saving, propagate updated defaults to future workouts for the same exercises (non-blocking)
      (async () => {
        try {
          if (!workout || workout.workout_type !== 'gym') return;
          const scheduledDate = workout?.scheduled_date;
          const programId = (workout as any)?.program_id ?? workout?.program?.id;
          if (!scheduledDate || !programId) return;

          // Build map of base exercise_id -> latest values to apply
          const latestByExercise: Record<number, { sets: number; reps: number; weight: string | null; rest_seconds: number }> = {};
          for (const { id: rowId } of updates as any[]) {
            const matching = exercises.find((ex) => String(ex.id) === String(rowId));
            if (!matching) continue;
            const vals = editValues[String(rowId)] ?? {
              sets: matching.sets,
              reps: matching.reps,
              weight: matching.weight ?? null,
              rest_seconds: matching.rest_seconds,
            };
            latestByExercise[matching.exercise_id] = {
              sets: Number(vals.sets),
              reps: Number(vals.reps),
              weight: (vals as any).weight === '' ? null : String((vals as any).weight),
              rest_seconds: Number(vals.rest_seconds),
            };
          }

          const exerciseIds = Object.keys(latestByExercise).map((k) => Number(k));
          if (exerciseIds.length === 0) return;

          const { data: futureWorkouts, error: futureWErr } = await supabase
            .from('workouts')
            .select('id, scheduled_date, order_in_program, program_id, user_id')
            .eq('user_id', workout.user_id)
            .eq('workout_type', 'gym')
            .order('scheduled_date', { ascending: true })
            .limit(500);
          if (futureWErr || !futureWorkouts || futureWorkouts.length === 0) return;
          const currentDate = scheduledDate ? new Date(scheduledDate) : null;
          const currentOrder = (workout as any)?.order_in_program as number | undefined;
          const currentIdNum = Number(workoutId);
          const futureIds = (futureWorkouts as any[])
            .filter((w: any) => {
              const wDate = w.scheduled_date ? new Date(w.scheduled_date) : null;
              if (currentDate && wDate) return wDate.getTime() > currentDate.getTime();
              if (currentOrder != null && w.order_in_program != null) return w.order_in_program > currentOrder;
              return Number(w.id) > currentIdNum;
            })
            .map((w: any) => w.id as number);
          if (futureIds.length === 0) return;

          const { data: futureRows, error: futureRowsErr } = await supabase
            .from('workout_exercises')
            .select('id, workout_id, exercise_id, completed')
            .in('workout_id', futureIds)
            .in('exercise_id', exerciseIds);
          if (futureRowsErr || !futureRows || futureRows.length === 0) return;

          // Perform targeted updates per exercise across future workouts (skip completed entries)
          for (const exIdStr of Object.keys(latestByExercise)) {
            const exId = Number(exIdStr);
            const vals = latestByExercise[exId];
            const { error: updErr } = await supabase
              .from('workout_exercises')
               .update({
                 sets: vals.sets,
                 reps: vals.reps,
                 weight: vals.weight,
                 rest_seconds: vals.rest_seconds,
                updated_at: new Date().toISOString(),
              })
              .in('workout_id', futureIds)
              .eq('exercise_id', exId)
              .eq('completed', false);
            if (updErr) {
              console.error('❌ Error updating future workout_exercises for exercise', exId, updErr);
            }
          }
        } catch (e) {
          console.error('❌ Error propagating defaults after save:', e);
        }
      })();

      setPendingUpdates({});
      setHasPendingChanges(false);
      toast('Changes saved successfully');
    } catch (error) {
      console.error('Error saving updates:', error);
      toast('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleExerciseCompletion = async (exerciseId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('workout_exercises')
        .update({
          completed,
        })
        .eq('id', exerciseId);

      if (error) {
        console.error('Error updating completion:', error);
        toast('Failed to update completion status');
        return;
      }

      // Update local state
      setExercises((prev) =>
        prev.map((ex) =>
          String(ex.id) === exerciseId
            ? {
                ...ex,
                completed,
              }
            : ex,
        ),
      );

      // Check if all exercises are completed
      const updatedExercises = exercises.map((ex) => (String(ex.id) === exerciseId ? { ...ex, completed } : ex));
      const allCompleted = updatedExercises.every((ex) => ex.completed);

      // Notify other views (dashboard/calendar) immediately and then mark if needed
      broadcastUpdate({ completed: allCompleted })

      // Also reflect on selected date dialog/calendars that rely on scheduled_date presence
      if (!workout?.scheduled_date) {
        const now = new Date()
        now.setHours(0,0,0,0)
        const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0] + 'T00:00:00.000Z'
        broadcastUpdate({ scheduled_date: iso } as any)
      }

      // If all exercises are completed, mark workout as completed and send notifications
      if (allCompleted && !workout?.completed) {
        await markWorkoutAsCompleted();
      }

      toast(completed ? 'Exercise marked as complete' : 'Exercise marked as incomplete');
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast('Failed to update completion status');
    }
  };

  const toggleCardioWorkoutCompletion = async (completed: boolean) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', workoutId);

      if (error) {
        console.error('Error updating cardio workout completion:', error);
        toast('Failed to update completion status');
        return;
      }

      // Update local state
      setWorkout((prev) =>
        prev
          ? {
              ...prev,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            }
          : null,
      );

      // Notify other views immediately
      broadcastUpdate({ completed })

      // If marking as completed, send notifications
      if (completed) {
        await markWorkoutAsCompleted();
      }

      toast(completed ? 'Cardio workout marked as complete' : 'Cardio workout marked as incomplete');
    } catch (error) {
      console.error('Error toggling cardio workout completion:', error);
      toast('Failed to update completion status');
    }
  };

  const markWorkoutAsCompleted = async () => {
    try {
      console.log('🔄 WORKOUT: Marking workout as completed and sending notifications...');
      // Mark workout as completed
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', workoutId);

      if (workoutError) {
        console.error('Error marking workout as completed:', workoutError);
        toast('Failed to mark workout as completed');
        return;
      }

      // Update local workout state
      setWorkout((prev) => (prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null));

      // Notify other views immediately
      broadcastUpdate({ completed: true })

      // After completing a gym workout, propagate these exercise values to future workouts containing the same exercises
      if ((workout?.workout_type === 'gym') && exercises.length > 0) {
        (async () => {
          try {
            const scheduledDate = workout?.scheduled_date;
            const programId = (workout as any)?.program_id ?? workout?.program?.id;
            if (!scheduledDate || !programId) return;

            // Build latest values per exercise in this workout
            const latestByExercise: Record<number, { sets: number; reps: number; weight: string | null; rest_seconds: number }> = {};
            for (const ex of exercises) {
              latestByExercise[ex.exercise_id] = {
                sets: ex.sets,
                reps: ex.reps,
                weight: ex.weight ?? null,
                rest_seconds: ex.rest_seconds,
              };
            }

            const exerciseIds = Object.keys(latestByExercise).map((k) => Number(k));
            if (exerciseIds.length === 0) return;

            // Find future workouts in the same program
            const { data: futureWorkouts, error: futureWErr } = await supabase
              .from('workouts')
              .select('id')
              .eq('program_id', programId)
              .eq('workout_type', 'gym')
              .gt('scheduled_date', scheduledDate)
              .order('scheduled_date', { ascending: true })
              .limit(200);

            if (futureWErr || !futureWorkouts || futureWorkouts.length === 0) return;
            const futureIds = futureWorkouts.map((w: any) => w.id as number);

            // Load workout_exercises rows for those workouts that match our exercise ids
            const { data: futureRows, error: futureRowsErr } = await supabase
              .from('workout_exercises')
              .select('id, workout_id, exercise_id, completed')
              .in('workout_id', futureIds)
              .in('exercise_id', exerciseIds);

            if (futureRowsErr || !futureRows || futureRows.length === 0) return;

            // Prepare updates, skipping already-completed entries
            const updates = futureRows
              .filter((row: any) => !row.completed)
              .map((row: any) => {
                const vals = latestByExercise[row.exercise_id as number];
                return {
                  id: row.id as number,
                  sets: vals.sets,
                  reps: vals.reps,
                  weight: vals.weight,
                  rest_seconds: vals.rest_seconds,
                  updated_at: new Date().toISOString(),
                };
              });

            if (updates.length > 0) {
              // Batch updates in chunks to avoid payload limits
              const chunkSize = 100;
              for (let i = 0; i < updates.length; i += chunkSize) {
                const chunk = updates.slice(i, i + chunkSize);
                const { error: updErr } = await supabase
                  .from('workout_exercises')
                  .upsert(chunk, { onConflict: 'id' });
                if (updErr) break;
              }
            }
          } catch (e) {
            // Non-blocking; log only
            console.error('❌ Error propagating future workout defaults:', e);
          }
        })();
      }

      // Send coach-only notification when workout is completed (no user notification)
      if (workout?.program?.coach_id && profile?.role === 'user') {
        try {
          await notificationService.notifyCoachWorkoutCompleted(Number(workoutId));
        } catch (notificationError) {
          console.error('❌ Error sending coach notification:', notificationError);
          // Don't block the completion flow if notification fails
        }
      }
      // Auto email coach if they opted in
      if (coachNotifyEnabled && coachEmail) {
        fetch('/api/send-workout-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: coachEmail,
            workoutName: workout?.name,
            programName: workout?.program?.name,
            completedAt: new Date().toISOString(),
            userName: profile?.name || 'User',
            note: undefined,
            workoutType: workout?.workout_type,
          }),
        }).catch(() => {});
      }
      toast('Workout completed! Notifications sent.');
    } catch (error) {
      console.error('Error marking workout as completed:', error);
      toast('Failed to mark workout as completed');
    }
  };

  const manualSave = () => {
    saveUpdates();
  };

  // Generate shareable image with responsive height and stable word wrapping
  const generateShareImage = async (): Promise<Blob | null> => {
    try {
      const width = 1080;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      // Measurement context (no scaling side-effects)
      const measureCanvas = document.createElement('canvas');
      const mctx = measureCanvas.getContext('2d');
      if (!mctx) return null;

      const setMeasureFont = (spec: string) => { mctx.font = spec; };
      const tokenize = (text: string) => text.split(/(\s+|[\/\-\u2013\u2014:×•,]+)/).filter(Boolean);
      const wrapStable = (text: string, maxWidth: number, fontSpec: string) => {
        setMeasureFont(fontSpec);
        const tokens = tokenize(text);
        const lines: string[] = [];
        let line = '';
        for (const tok of tokens) {
          const test = line + tok;
          if (mctx.measureText(test).width <= maxWidth || line === '') {
            line = test;
          } else {
            if (line) lines.push(line.trimEnd());
            line = tok.trimStart();
          }
        }
        if (line) lines.push(line.trimEnd());
        return lines;
      };

      // Pre-calculate title wrapping
      const title = workout?.name || 'Workout';
      const titleFont = 'bold 44px Poppins, Arial, sans-serif';
      const titleLines = wrapStable(title, width - 120, titleFont);
      const titleLineHeight = 48;
      const titleHeight = titleLines.length * titleLineHeight;

      // Build exercise/cardio content lines, adjusting columns and font size so tokens fit without mid-word breaks
      const leftPadding = 28;
      const colGap = 36;
      const maxColumns = 3;
      const isCardio = workout?.workout_type === 'cardio';
      const baseFont = isCardio ? 24 : 22; // reduced sizes
      const minFont = 16;
      const lineGapBase = isCardio ? 36 : 34;

      let columns = 1; // keep single column for gym to keep each exercise on one row
      let fontSize = baseFont;
      let contentLines: string[] = [];
      let colWidth = 0;

      const buildContentLineStrings = (): string[] => {
        if (workout?.workout_type === 'cardio') {
          const items: string[] = [];
          const t = workout?.cardio_exercise?.name || (workout?.intensity_type ? `Type: ${workout.intensity_type}` : 'Cardio');
          items.push(t);
          if (workout?.duration_minutes) items.push(`Duration: ${workout.duration_minutes} min`);
          if (workout?.target_tss) items.push(`TSS: ${workout.target_tss}`);
          if (workout?.target_ftp) items.push(`FTP: ${workout.target_ftp}`);
          return items;
        }
        const lines: string[] = [];
        for (const ex of exercises) {
          const name = ex.exercise?.name || 'Exercise';
          const parts: string[] = [];
          if (ex.sets && ex.reps) parts.push(`${ex.sets} set${ex.sets > 1 ? 's' : ''} × ${ex.reps} rep${ex.reps > 1 ? 's' : ''}`);
          if (ex.weight) parts.push(`${ex.weight}`);
          const meta = parts.join(' • ');
          const line = meta ? `${name} — ${meta}` : name;
          lines.push(line);
        }
        return lines;
      };

      const baseStrings = buildContentLineStrings();

      // Iterate to ensure no token exceeds column width; increase columns up to 3, then reduce font if needed
      const calcColWidth = (cols: number) => (width - 80 - (leftPadding * 2) - (colGap * (cols - 1))) / cols;
      const contentFontSpec = (fs: number) => `400 ${fs}px Poppins, Arial, sans-serif`;

      const tokensFit = (fs: number, cols: number): boolean => {
        setMeasureFont(contentFontSpec(fs));
        const cWidth = calcColWidth(cols);
        if (!isCardio) {
          // gym: keep entire exercise line on one row
          return baseStrings.every((s) => mctx.measureText(s).width <= cWidth);
        }
        // cardio: ensure tokens fit so wrapping happens at token boundaries
        for (const s of baseStrings) {
          for (const tok of tokenize(s)) {
            if (mctx.measureText(tok).width > cWidth) return false;
          }
        }
        return true;
      };

      // First make sure content fits width by tweaking font (gym) or font+columns (cardio)
      while (!tokensFit(fontSize, columns)) {
        if (fontSize > minFont) {
          fontSize -= 2;
        } else if (isCardio && columns < maxColumns) {
          columns += 1;
        } else {
          break;
        }
      }
      colWidth = calcColWidth(columns);

      // Now perform wrapping with the agreed font/columns
      if (isCardio) {
        contentLines = baseStrings.flatMap((s) => wrapStable(s, colWidth, contentFontSpec(fontSize)));
      } else {
        contentLines = [...baseStrings]; // gym: keep each exercise on one line
      }

      const lineGap = Math.max(34, lineGapBase - (baseFont - fontSize));
      const rows = Math.ceil(contentLines.length / columns);

      // Remove decorative sparkline
      const hasSeries = false;

      // Compute dynamic layout sizes
      const headerTop = 120; // "Workout Completed" baseline
      const dateBlock = 36;  // space for date
      const cardHeader = 60; // "Exercises Performed" / "Cardio Summary"
      const cardPaddingTop = 50; // extra padding before list
      const cardPaddingBottom = 60;

      const currentYStart = 60 + headerTop + titleHeight + dateBlock; // initial top for card
      const contentHeight = rows * lineGap;
      const cardX = 40;
      const cardY = currentYStart;
      const cardW = width - 80;
      const chartHeight = 0;
      const cardH = cardHeader + cardPaddingTop + contentHeight + cardPaddingBottom;

      const footerHeight = 70;
      const dynamicHeight = cardY + cardH + footerHeight + 20;

      // Now draw on the real canvas with DPR
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(dynamicHeight * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.scale(dpr, dpr);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, dynamicHeight);
      grad.addColorStop(0, '#0ea5e9');
      grad.addColorStop(1, '#111827');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, dynamicHeight);

      // Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Poppins, Arial, sans-serif';
      ctx.fillText('Workout Completed', 60, 120);

      // Title
      ctx.font = titleFont;
      let ty = 180;
      for (const tl of titleLines) { ctx.fillText(tl, 60, ty); ty += titleLineHeight; }

      // Date
      ctx.font = '400 28px Poppins, Arial, sans-serif';
      const when = workout?.scheduled_date
        ? new Date(workout.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString();
      ctx.fillText(when, 60, ty + 8);

      // Card container
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(cardX, cardY, cardW, cardH, 24);
        ctx.fill();
      } else {
        ctx.beginPath();
        const r = 24;
        ctx.moveTo(cardX + r, cardY);
        ctx.lineTo(cardX + cardW - r, cardY);
        ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
        ctx.lineTo(cardX + cardW, cardY + cardH - r);
        ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
        ctx.lineTo(cardX + r, cardY + cardH);
        ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
        ctx.lineTo(cardX, cardY + r);
        ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
        ctx.closePath();
        ctx.fill();
      }

      // Card header
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 34px Poppins, Arial, sans-serif';
      const headerText = workout?.workout_type === 'cardio' ? 'Cardio Summary' : 'Exercises Performed';
      ctx.fillText(headerText, cardX + 28, cardY + 48);

      // Content lines
      ctx.font = contentFontSpec(fontSize);
      const topStart = cardY + cardHeader + (cardPaddingTop - 10);
      const maxLinesPerCol = Math.ceil(contentLines.length / columns);
      for (let i = 0; i < contentLines.length; i++) {
        const col = Math.floor(i / maxLinesPerCol);
        const row = i % maxLinesPerCol;
        const x = cardX + leftPadding + col * (colWidth + colGap);
        const y = topStart + row * lineGap;
        ctx.fillText(contentLines[i], x, y);
      }

      // (Chart removed)

      // Footer branding
      ctx.font = '500 24px Poppins, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText('Shared via FitTracker Pro', 40, dynamicHeight - 40);

      return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
    } catch (e) {
      console.error('Error generating share image:', e);
      return null;
    }
  };

  const handleShare = async () => {
    if (!isWorkoutCompleted()) return;
    try {
      setSharing(true);
      const blob = await generateShareImage();
      if (!blob) {
        toast('Failed to create share image');
        setSharing(false);
        return;
      }
      const file = new File([blob], `workout-${workoutId}.png`, { type: 'image/png' });

      // Try native file share first
      const canShareFiles = typeof (navigator as any).canShare === 'function' && (navigator as any).canShare({ files: [file] });
      if (canShareFiles && typeof (navigator as any).share === 'function') {
        await (navigator as any).share({
          title: workout?.name || 'Workout',
          text: 'My workout from FitTracker Pro',
          files: [file],
        } as any);
        setSharing(false);
        return;
      }

      // Fallback: open the image for manual share/save (works on iOS PWAs)
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast('Image opened. Use Share/Save from your browser.');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSharing(false);
    } catch (e) {
      setSharing(false);
      console.error('Error sharing:', e);
      toast('Sharing not supported on this device/browser');
    }
  };

  // Handle opening email dialog
  const handleOpenEmailDialog = () => {
    // Pre-fill coach email if available
    if (coachEmail) {
      setEmailAddress(coachEmail);
    }
    setEmailDialogOpen(true);
  };

  // Handle sending email (optimistic, non-blocking)
  const handleSendEmail = () => {
    if (!emailAddress.trim()) {
      toast('Please enter an email address');
      return;
    }

    // Capture data before clearing UI
    const to = emailAddress.trim();
    const payload = {
      to,
      workoutName: workout?.name,
      programName: workout?.program?.name,
      completedAt: new Date().toISOString(),
      userName: profile?.name || 'User',
      note: emailNote.trim(),
      workoutType: workout?.workout_type,
    };

    // Optimistic close and clear so user can continue
    setEmailDialogOpen(false);
    setEmailAddress('');
    setEmailNote('');

    // Fire in background; notify on completion
    fetch('/api/send-workout-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to send email');
        toast('Email sent successfully!');

        // Note: In-app notifications for email sent have been disabled
      })
      .catch((err) => {
        console.error('Error sending email:', err);
        toast('Failed to send email. Please try again.');
      });
  };

  // Add new workout comment
  const handleAddWorkoutComment = async () => {
    if (!newWorkoutComment.trim()) return;

    // Optimistic insert
    const now = new Date().toISOString();
    const tempId = -Date.now();
    const tempComment: Comment = {
      id: tempId as unknown as number,
      workout_id: Number(workoutId),
      workout_exercise_id: null,
      user_id: profile?.id || 'me',
      comment_text: newWorkoutComment.trim(),
      created_at: now,
      user: { id: profile?.id, name: profile?.name, role: profile?.role } as any,
    };

    setWorkoutComments(prev => [...prev, tempComment]);
    const sentText = newWorkoutComment.trim();
    setNewWorkoutComment('');
    setCommentLoading(true);
    setError(null);

    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      if (!user) {
        // rollback
        setWorkoutComments(prev => prev.filter(c => c.id !== tempId));
        toast('You must be logged in to comment.');
        setCommentLoading(false);
        return;
      }

      const { data, error } = await supabase.from('comments').insert({
        workout_id: Number(workoutId),
        user_id: user.id,
        comment_text: sentText,
      })
      .select(`*, user:users(id, name, role)`).single();

      if (error) throw error;

      // Replace temp with real
      setWorkoutComments(prev => prev.map(c => c.id === tempId ? (data as Comment) : c));

      // Note: In-app notifications for workout comments have been disabled

      toast('Comment added successfully!');
    } catch (err: any) {
      // rollback
      setWorkoutComments(prev => prev.filter(c => c.id !== tempId));
      console.error('Error adding comment:', err);
      setError(err.message || 'Failed to add comment.');
      toast('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };


  const toggleExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const startEditing = (exerciseId: string) => {
    setEditingExercises(prev => ({
      ...prev,
      [exerciseId]: true
    }));
  };

  const cancelEditing = (exerciseId: string, exercise: WorkoutExerciseWithDetails) => {
    setEditingExercises(prev => ({
      ...prev,
      [exerciseId]: false
    }));
    // Reset edit values to original
    setEditValues(prev => ({
      ...prev,
      [exerciseId]: initialEditValues[exerciseId] ?? {
        sets: exercise.sets,
        reps: exercise.reps,
        weight: '',
        rest_seconds: exercise.rest_seconds,
      }
    }));
  };

  const handleSaveEdit = async (exerciseId: string) => {
    try {
      const values = editValues[exerciseId];
      // Require numeric fields to be present to save, but allow empty while typing
      if (values.sets === '' || values.reps === '' || values.rest_seconds === '') {
        toast('Please fill in sets, reps and rest before saving');
        return;
      }

      const { error } = await supabase
        .from('workout_exercises')
        .update({
          sets: Number(values.sets),
          reps: Number(values.reps),
          weight: values.weight === '' ? null : String(values.weight),
          rest_seconds: Number(values.rest_seconds)
        })
        .eq('id', exerciseId);

      if (error) {
        toast('Failed to save changes');
        return;
      }

      // Update local state
      setExercises(prev => prev.map(ex =>
        String(ex.id) === exerciseId
          ? {
              ...ex,
              sets: Number(values.sets),
              reps: Number(values.reps),
              weight: values.weight === '' ? null : String(values.weight),
              rest_seconds: Number(values.rest_seconds)
            }
          : ex
      ));

      // Update the baseline so buttons hide after successful save
      setInitialEditValues(prev => ({
        ...prev,
        [exerciseId]: {
          sets: Number(values.sets),
          reps: Number(values.reps),
          weight: values.weight,
          rest_seconds: Number(values.rest_seconds),
        }
      }));

      // Propagate this exercise's new defaults to future workouts in the same program (non-blocking)
      (async () => {
        try {
          if (!workout || workout.workout_type !== 'gym') return;
          const scheduledDate = workout?.scheduled_date;
          const programId = (workout as any)?.program_id ?? workout?.program?.id;
          if (!scheduledDate || !programId) return;

          const matching = exercises.find((ex) => String(ex.id) === String(exerciseId));
          if (!matching) return;

          const latestByExercise: Record<number, { sets: number; reps: number; weight: string | null; rest_seconds: number }> = {
            [matching.exercise_id]: {
              sets: Number(values.sets),
              reps: Number(values.reps),
              weight: values.weight === '' ? null : String(values.weight),
              rest_seconds: Number(values.rest_seconds),
            },
          };

          const exerciseIds = Object.keys(latestByExercise).map((k) => Number(k));
          const { data: futureWorkouts, error: futureWErr } = await supabase
            .from('workouts')
            .select('id, scheduled_date, order_in_program, program_id, user_id')
            .eq('user_id', workout.user_id)
            .eq('workout_type', 'gym')
            .order('scheduled_date', { ascending: true })
            .limit(500);
          if (futureWErr || !futureWorkouts || futureWorkouts.length === 0) return;
          const currentDate = scheduledDate ? new Date(scheduledDate) : null;
          const currentOrder = (workout as any)?.order_in_program as number | undefined;
          const currentIdNum = Number(workoutId);
          const futureIds = (futureWorkouts as any[])
            .filter((w: any) => {
              const wDate = w.scheduled_date ? new Date(w.scheduled_date) : null;
              if (currentDate && wDate) return wDate.getTime() > currentDate.getTime();
              if (currentOrder != null && w.order_in_program != null) return w.order_in_program > currentOrder;
              return Number(w.id) > currentIdNum;
            })
            .map((w: any) => w.id as number);
          if (futureIds.length === 0) return;

          const { data: futureRows, error: futureRowsErr } = await supabase
            .from('workout_exercises')
            .select('id, workout_id, exercise_id, completed')
            .in('workout_id', futureIds)
            .in('exercise_id', exerciseIds);
          if (futureRowsErr || !futureRows || futureRows.length === 0) return;

          // Perform targeted updates per exercise across future workouts (skip completed entries)
          for (const exIdStr of Object.keys(latestByExercise)) {
            const exId = Number(exIdStr);
            const vals = latestByExercise[exId];
            const { error: updErr } = await supabase
              .from('workout_exercises')
               .update({
                 sets: vals.sets,
                 reps: vals.reps,
                 weight: vals.weight,
                 rest_seconds: vals.rest_seconds,
                updated_at: new Date().toISOString(),
              })
              .in('workout_id', futureIds)
              .eq('exercise_id', exId)
              .eq('completed', false);
            if (updErr) {
              console.error('❌ Error updating future workout_exercises for exercise', exId, updErr);
            }
          }
        } catch (e) {
          console.error('❌ Error propagating defaults after edit save:', e);
        }
      })();

      setEditingExercises(prev => ({
        ...prev,
        [exerciseId]: false
      }));

      setHasPendingChanges(false);

      toast('Exercise updated successfully');
    } catch {
      toast('Failed to save changes');
    }
  };

  const updateEditValue = (exerciseId: string, field: string, value: any) => {
    const current = editValues[exerciseId] || { sets: '', reps: '', weight: '', rest_seconds: '' } as any;
    const nextValues: any = { ...current };
    if (field === 'sets' || field === 'reps' || field === 'rest_seconds') {
      nextValues[field] = value === '' ? '' : Number.parseInt(String(value)) || 0;
    } else if (field === 'weight') {
      nextValues[field] = value === '' ? '' : Number.parseFloat(String(value)) || 0;
    } else {
      nextValues[field] = value;
    }

    setEditValues(prev => ({
      ...prev,
      [exerciseId]: nextValues,
    }));
  };

  const isExerciseDirty = (exerciseId: string): boolean => {
    const curr = editValues[exerciseId];
    const base = initialEditValues[exerciseId];
    if (!curr || !base) return false;
    const eq = (a: any, b: any) => String(a) === String(b);
    return !(
      eq(curr.sets, base.sets) &&
      eq(curr.reps, base.reps) &&
      eq(curr.weight, base.weight) &&
      eq(curr.rest_seconds, base.rest_seconds)
    );
  };


  const getWorkoutIcon = (type: string, completed: boolean) => {
    const IconComponent = type === 'gym' ? Dumbbell : Activity;
    return (
      <div
        className={cn(
          'hidden sm:flex items-center justify-center w-12 h-12 rounded-full',
          completed
            ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        )}
      >
        <IconComponent className="h-6 w-6" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="animate-pulse">
          <CardContent className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded w-full"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !workout) { // Only show full error if workout couldn't be loaded at all
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Workout</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workout Not Found</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm mx-auto">
              The workout you are looking for does not exist or you do not have permission to view it.
            </p>
            <Button asChild className="mt-6">
              <AppLink href="/dashboard/workouts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workouts
              </AppLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Workout Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" asChild>
            <AppLink href={
              from === 'program' && programIdParam 
                ? `/dashboard/programs/${programIdParam}` 
                : from === 'workouts' 
                  ? '/dashboard/workouts' 
                  : '/dashboard'
            }>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {from === 'program' ? 'Back to Program' : from === 'workouts' ? 'Back to Workouts' : 'Back to Dashboard'}
            </AppLink>
          </Button>
          <Badge
            variant={workout.completed ? 'default' : 'secondary'}
            className={cn(
              'text-sm',
              workout.completed
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            {workout.completed ? (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            ) : (
              <Circle className="h-4 w-4 mr-1" />
            )}
            {workout.completed ? 'Completed' : 'Pending'}
          </Badge>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              {getWorkoutIcon(workout.workout_type, workout.completed)}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {workout.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {workout.scheduled_date ? new Date(workout.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }) : 'No date set'}
                    </span>
                  </div>
                  {workout.duration_minutes && (
                    <>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{workout.duration_minutes}min</span>
                      </div>
                    </>
                  )}
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <Badge variant="outline" className="text-sm px-2 py-0.5">
                    {workout.workout_type === 'gym' ? 'Strength' : 'Cardio'}
                  </Badge>
                </div>
                {workout.notes && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="font-semibold">Notes:</span> {workout.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unsaved Changes Banner */}
      {hasPendingChanges && profile?.role !== 'user' && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Unsaved Changes</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Your changes will be saved automatically in a moment.
                  </p>
                </div>
              </div>
              <Button onClick={manualSave} disabled={saving} size="sm" variant="outline">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout Content */}
      {workout.workout_type === 'gym' ? (
        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises yet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  This workout doesn&#39;t have any exercises assigned yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            exercises.map((exercise, index) => {
              const exerciseId = String(exercise.id);
              const isExpanded = expandedExercises[exerciseId] || false;
              const isUserRole = profile?.role === 'user';
              const isEditing = isUserRole || editingExercises[exerciseId] || false;
              const currentEditValues = editValues[exerciseId] || {
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight || '',
                rest_seconds: exercise.rest_seconds
              };

              return (
                <Card
                  key={exercise.id}
                  className={cn(
                    'transition-all duration-200 py-3 border-l-4 overflow-hidden',
                    exercise.completed
                      ? 'border-l-green-500 bg-green-50/30 dark:bg-green-900/5'
                      : 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5',
                  )}
                >
                  {/* Compact Header - Always Visible */}
                  <div
                    className="p-3 py-0 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleExpanded(exerciseId)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Exercise Image/Icon */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        {exercise.exercise.image_url ? (
                          <Image
                            width={48}
                            height={48}
                            src={exercise.exercise.image_url || '/placeholder.svg'}
                            alt={exercise.exercise.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={cn(
                          'w-full h-full flex items-center justify-center',
                          exercise.exercise.image_url ? 'hidden' : ''
                        )}>
                          <Dumbbell className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {index + 1}. {exercise.exercise.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>{exercise.sets}×{exercise.reps}</span>
                          {exercise.weight && (
                            <>
                              <span>•</span>
                              <span>{exercise.weight}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Chevron Icon */}
                      <div className="flex-shrink-0 mr-2">
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-gray-400 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </div>
                      {/* Mark Complete Button */}
                      <Button
                        size="sm"
                        variant={exercise.completed ? 'outline' : 'default'}
                        className={cn(
                          'flex-shrink-0 text-xs px-3 py-1 h-8',
                          exercise.completed
                            ? 'text-green-600 border-green-300 bg-green-50 hover:bg-green-100'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExerciseCompletion(String(exercise.id), !exercise.completed);
                        }}
                      >
                        {exercise.completed ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Circle className="h-3 w-3 mr-1" />
                            Mark
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="p-3 space-y-3">
                        {/* Exercise Details */}
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Sets</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.sets}
                                  onChange={(e) => updateEditValue(exerciseId, 'sets', e.target.value === '' ? '' : Number.parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Reps</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.reps}
                                  onChange={(e) => updateEditValue(exerciseId, 'reps', e.target.value === '' ? '' : Number.parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Resistance</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.weight}
                                  onChange={(e) => updateEditValue(exerciseId, 'weight', e.target.value === '' ? '' : Number.parseFloat(e.target.value))}
                                  placeholder="e.g., 80"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Rest (sec)</Label>
                                <Input
                                  type="number"
                                  value={currentEditValues.rest_seconds}
                                  onChange={(e) => updateEditValue(exerciseId, 'rest_seconds', e.target.value === '' ? '' : Number.parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm"
                                  min="0"
                                />
                              </div>
                            </div>
                             <div className="flex gap-2">
                               {isExerciseDirty(exerciseId) && (
                               <Button size="sm" onClick={() => handleSaveEdit(exerciseId)} className="h-8 text-xs">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                               </Button>
                               )}
                               {isExerciseDirty(exerciseId) && (
                               <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing(exerciseId, exercise)}
                                className="h-8 text-xs"
                              >
                                Cancel
                               </Button>
                               )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Exercise Stats Display */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Sets</span>
                                <span className="font-medium">{exercise.sets}</span>
                              </div>
                              <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Reps</span>
                                <span className="font-medium">{exercise.reps}</span>
                              </div>
                              <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Weight</span>
                                <span className="font-medium">{exercise.weight || '-'}</span>
                              </div>
                              <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-900 rounded">
                                <span className="text-gray-600 dark:text-gray-400">Rest</span>
                                <span className="font-medium">{exercise.rest_seconds}s</span>
                              </div>
                            </div>
                            {/* Exercise Instructions */}
                            {exercise.exercise.instructions && (
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                                <strong>Instructions:</strong> {exercise.exercise.instructions}
                              </div>
                            )}
                            {/* Edit Button (hidden for users; they are always editing when expanded) */}
                            {profile?.role !== 'user' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(exerciseId)}
                                className="h-8 text-xs"
                              >
                                Edit Exercise
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        // Cardio workout display
        <Card className={cn(workout.completed && 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/5')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {workout.cardio_exercise?.name ? `Cardio: ${workout.cardio_exercise.name}` : `Cardio: ${workout.intensity_type || 'Session'}`}
              </CardTitle>
              <Button
                onClick={() => toggleCardioWorkoutCompletion(!workout.completed)}
                variant={workout.completed ? 'outline' : 'default'}
                size="sm"
              >
                {workout.completed ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Mark</span> Complete
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 grid-cols-2 gap-6">
              {workout.duration_minutes && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Timer className="h-4 w-4" />
                    Duration
                  </Label>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{workout.duration_minutes} min</p>
                </div>
              )}
              {workout.intensity_type && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Zap className="h-4 w-4" />
                    Intensity
                  </Label>
                  <Badge variant="outline" className="sm:text-sm text-xs  capitalize">
                    {workout.intensity_type}
                  </Badge>
                </div>
              )}
              {workout.target_tss && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Stress Score</Label>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{workout.target_tss}</p>
                </div>
              )}
              {workout.target_ftp && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Functional Threshold Power
                  </Label>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{workout.target_ftp}W</p>
                </div>
              )}
            </div>
            {workout.notes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">Notes</Label>
                <p className="text-sm text-blue-700 dark:text-blue-300">{workout.notes}</p>
              </div>
            )}
            {workout.completed && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Cardio workout completed successfully!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TrainerRoad Data Card for completed cardio workouts */}
      {workout.workout_type === 'cardio' && workout.completed && (
        <UiCard className="mt-5">
          <UiCardHeader>
            <UiCardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              TrainerRoad Data
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            {trLoading ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading TrainerRoad data...
              </div>
            ) : trError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {trError}
              </div>
            ) : trDetails ? (
              <div className="space-y-3">

                {/* Image */}
                {trDetails.workout?.PicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trDetails.workout.PicUrl} alt={trDetails.workout.Name || 'Workout'} className="w-full rounded-md border" />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500"><ImageIcon className="h-4 w-4" /> No image</div>
                )}
                {/* Name */}
                <div className="flex items-center gap-2 text-base font-semibold pt-2">
                  <Target className="h-4 w-4" />
                  {trDetails.workout?.Name ?? trDetails.activity?.name ?? trDetails.activity?.Name ?? 'Activity'}
                </div>

                {/* Facts grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><Clock className="h-4 w-4" /> Duration</div>
                    <div className="font-medium">{trDetails.workout?.Duration || `${Math.round((trDetails.activity?.durationInSeconds||trDetails.activity?.DurationInSeconds||0)/60)} min`}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><ZapIcon className="h-4 w-4" /> TSS</div>
                    <div className="font-medium">{trDetails.workout?.Tss ?? trDetails.activity?.tss ?? trDetails.activity?.Tss ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><ActivityIcon className="h-4 w-4" /> kJ</div>
                    <div className="font-medium">{trDetails.workout?.Kj ?? trDetails.activity?.kj ?? trDetails.activity?.Kj ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><GaugeIcon className="h-4 w-4" /> Intensity Factor</div>
                    <div className="font-medium">{(() => {
                      const raw = trDetails.workout?.IntensityFactor ?? trDetails.activity?.intensityFactor ?? trDetails.activity?.IntensityFactor
                      if (raw == null) return '-'
                      const num = Number(raw)
                      const normalized = num > 1.5 ? num / 100 : num
                      return normalized.toFixed(2)
                    })()}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><BarChartIcon className="h-4 w-4" /> Difficulty</div>
                    <div className="font-medium">{trDetails.activity?.progressionDetails?.difficultyRating ?? trDetails.workout?.WorkoutDifficultyRating ?? '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1"><MapIcon className="h-4 w-4" /> Inside/Outside</div>
                    <div className="font-medium">{(trDetails.workout?.IsOutside ?? trDetails.activity?.isOutside ?? trDetails.activity?.IsOutside) ? 'Outside' : 'Inside'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No TrainerRoad data found.</div>
            )}
          </UiCardContent>
        </UiCard>
      )}

      {/* Comments Section */}
      <Card className="mt-5" id="comments-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({workoutComments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
            {workoutComments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No comments yet. Be the first to leave one!</p>
            ) : (
              workoutComments.map((comment) => (
                <div id={`comment-${comment.id}`} key={comment.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/placeholder-icon.png?height=32&width=32&text=${comment.user?.name?.charAt(0) || 'U'}`} alt={comment.user?.name || "User"} />
                    <AvatarFallback>{comment.user?.name ? comment.user.name.charAt(0) : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {comment.user?.name || 'Unknown User'}
                      </span>
                      {comment.user?.role === 'coach' && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          Coach
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                        {comment.comment_text}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newWorkoutComment}
              onChange={(e) => setNewWorkoutComment(e.target.value)}
              rows={2}
              className="flex-1"
              disabled={commentLoading}
            />
            <Button className="self-end" onClick={handleAddWorkoutComment} disabled={commentLoading || !newWorkoutComment.trim()}>
              {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send Comment</span>
            </Button>
          </div>
          {error && commentLoading && ( // Show error only if it's related to comment submission
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Info about automatic coach email */}
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Note: If your coach enabled email notifications, they’ll be emailed automatically when you complete this workout.
        Sending a manual email below is optional.
      </p>

      {/* Share + Send Email */}
      <Card className="mt-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-colors self-start',
                isWorkoutCompleted() 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              )}>
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Send Workout Summary
                </h3>
                <p className="text-sm pr-10 text-gray-600 dark:text-gray-400">
                  {isWorkoutCompleted() 
                    ? 'Share your completed workout via email'
                    : 'Complete your workout to send a summary'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:items-center sm:flex-row flex-col sm:space-y-0 space-y-2">
              <Button
                onClick={handleOpenEmailDialog}
                disabled={!isWorkoutCompleted()}
                className={cn(
                  'transition-all duration-200',
                  !isWorkoutCompleted() && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Mail className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Send Email</span> 
              </Button>
              <Button
                onClick={handleShare}
                disabled={!isWorkoutCompleted() || sharing}
                variant="outline"
                className={cn(
                  'transition-all duration-200 h-9 w-9 p-0 inline-flex items-center justify-center',
                  !isWorkoutCompleted() && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Share workout"
                title="Share"
              >
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Workout Summary
            </DialogTitle>
            <DialogDescription className="mr-10 text-left"  >
              Send a summary of your completed workout via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="mt-1"
              />
              {coachEmail && (
                <p className="text-xs text-gray-500 mt-1">
                  Suggestion: {coachEmail} (Your coach)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="note" className="text-sm font-medium">
                Additional Note (Optional)
              </Label>
              <Textarea
                id="note"
                placeholder="Add a personal note to include in the email..."
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!emailAddress.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
