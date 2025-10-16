// services/UserService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfdghduqsaniszkvzyhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZGdoZHVxc2FuaXN6a3Z6eWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzIwMTcsImV4cCI6MjA3NDcwODAxN30.8ga6eiQymTcO3OZLGDe3WuAHkWcxgRA9ywG3xJ6QzNI';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserStatistics {
  id: string;
  user_id: string;
  total_points: number;
  day_streak: number;
  last_active_date: string;
  total_study_time: number;
  subjects_studied: string[];
  achievements_earned: string[];
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  condition_type: string;
  condition_value: number;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  duration: number;
  points_earned: number;
  created_at: string;
}

export class UserService {
  static async getUserStatistics(userId: string, accessToken: string): Promise<UserStatistics> {
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Get or create user statistics
    let { data: statistics, error } = await supabaseAuth
      .from('user_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !statistics) {
      // Create default statistics if none exist
      const { data: newStats, error: createError } = await supabaseAuth
        .from('user_statistics')
        .insert([{ user_id: userId }])
        .select()
        .single();

      if (createError) throw new Error(`Failed to create user statistics: ${createError.message}`);
      statistics = newStats;
    }

    return statistics;
  }

  static async getAchievements(accessToken: string): Promise<Achievement[]> {
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data, error } = await supabaseAuth
      .from('achievements')
      .select('*')
      .order('points', { ascending: true });

    if (error) throw new Error(`Failed to fetch achievements: ${error.message}`);
    return data || [];
  }

  static async recordStudySession(
    userId: string, 
    subject: string, 
    duration: number, 
    accessToken: string
  ): Promise<void> {
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // Calculate points (1 point per minute + bonus for consistency)
    const pointsEarned = duration + (duration >= 30 ? 10 : 0);

    // Record session
    const { error: sessionError } = await supabaseAuth
      .from('study_sessions')
      .insert([{ user_id: userId, subject, duration, points_earned: pointsEarned }]);

    if (sessionError) throw new Error(`Failed to record study session: ${sessionError.message}`);

    // Update user statistics
    await this.updateUserStatistics(userId, subject, pointsEarned, duration, accessToken);
  }

  private static async updateUserStatistics(
    userId: string, 
    subject: string, 
    pointsEarned: number, 
    duration: number,
    accessToken: string
  ): Promise<void> {
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const stats = await this.getUserStatistics(userId, accessToken);
    const today = new Date().toISOString().split('T')[0];
    const lastActive = new Date(stats.last_active_date);
    const currentDate = new Date(today);
    
    // Calculate streak
    const dayDiff = Math.floor((currentDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    const newStreak = dayDiff === 1 ? stats.day_streak + 1 : (dayDiff === 0 ? stats.day_streak : 1);

    // Update subjects studied
    const updatedSubjects = stats.subjects_studied.includes(subject) 
      ? stats.subjects_studied 
      : [...stats.subjects_studied, subject];

    const { error } = await supabaseAuth
      .from('user_statistics')
      .update({
        total_points: stats.total_points + pointsEarned,
        day_streak: newStreak,
        last_active_date: today,
        total_study_time: stats.total_study_time + duration,
        subjects_studied: updatedSubjects,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to update user statistics: ${error.message}`);
  }
}