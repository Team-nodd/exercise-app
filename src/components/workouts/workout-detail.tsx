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
import { CheckCircle, Circle, Dumbbell,  AlertCircle, ArrowLeft, MessageSquare, Send,  Calendar, Zap,  Activity, ChevronDown, Loader2, RefreshCw, CheckCircle2, Clock,  Mail, Save, Timer} from 'lucide-react';
import type { WorkoutWithDetails, WorkoutExerciseWithDetails, Comment } from '@/types';
import { notificationService } from '@/lib/notifications/notification-service';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AppLink } from '../ui/app-link';
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
    weight: string;
    rest_seconds: number | "";
  }>>({});

  const supabase = createClient();

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
        const initialEditValues: Record<string, any> = {};
        exercisesList.forEach(exercise => {
          initialEditValues[exercise.id] = {
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight || '',
            rest_seconds: exercise.rest_seconds
          };
        });
        setEditValues(initialEditValues);
      }
    } catch (err: any) {
      console.error('Error fetching workout data:', err);
      setError(err.message || 'Failed to load workout details.');
    } finally {
      setLoading(false);
    }
  }, [workoutId, userId, supabase]);

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

  // Auto-save when debounced updates change
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

      // Send notifications
      await notificationService.sendWorkoutCompletedNotifications(Number(workoutId));
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

        // Notify coach only if a client sent the email and a coach exists
        if (workout?.program?.coach_id && profile?.role === 'user') {
          try {
            await notificationService.notifyCoachWorkoutEmailSent(
              Number(workoutId),
              userId,
              workout.program.coach_id
            );
          } catch {
            // Log only; don’t block UX
            // console.error('Error notifying coach about email:', e);
          }
        }
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

      // Send notifications in background with comment id
      if (workout && profile) {
        (async () => {
          try {
            if (profile.role === 'user') {
              if (workout.program?.coach_id) {
                await notificationService.notifyCoachWorkoutComment(
                  Number(workoutId),
                  userId,
                  workout.program.coach_id,
                  sentText,
                  (data as any)?.id
                );
              }
            } else if (profile.role === 'coach') {
              await notificationService.notifyUserWorkoutComment(
                Number(workoutId),
                profile.id,
                workout.user_id,
                sentText,
                (data as any)?.id
              );
            }
          } catch (notificationError) {
            console.error('❌ Error sending notification:', notificationError);
          }
        })();
      }

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
      [exerciseId]: {
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight || '',
        rest_seconds: exercise.rest_seconds
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
          weight: values.weight || null,
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
              weight: values.weight || null,
              rest_seconds: Number(values.rest_seconds)
            }
          : ex
      ));

      setEditingExercises(prev => ({
        ...prev,
        [exerciseId]: false
      }));

      toast('Exercise updated successfully');
    } catch {
      toast('Failed to save changes');
    }
  };

  const updateEditValue = (exerciseId: string, field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }));
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
            <AppLink href="/dashboard/workouts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workouts
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
      {hasPendingChanges && (
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
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Weight</Label>
                                <Input
                                  value={currentEditValues.weight}
                                  onChange={(e) => updateEditValue(exerciseId, 'weight', e.target.value)}
                                  placeholder="e.g., 80kg"
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
                              <Button size="sm" onClick={() => handleSaveEdit(exerciseId)} className="h-8 text-xs">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEditing(exerciseId, exercise)}
                                className="h-8 text-xs"
                              >
                                Cancel
                              </Button>
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

      {/* Send Email Button */}
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
            <Button
              onClick={handleOpenEmailDialog}
              disabled={!isWorkoutCompleted()}
              className={cn(
                'transition-all duration-200 self-start',
                !isWorkoutCompleted() && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Mail className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Send</span> Email
            </Button>
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
