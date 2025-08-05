CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
  workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_workout_id ON comments(workout_id);
CREATE INDEX idx_comments_workout_exercise_id ON comments(workout_exercise_id);