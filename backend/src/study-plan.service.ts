import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://tfdghduqsaniszkvzyhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZGdoZHVxc2FuaXN6a3Z6eWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzIwMTcsImV4cCI6MjA3NDcwODAxN30.8ga6eiQymTcO3OZLGDe3WuAHkWcxgRA9ywG3xJ6QzNI'; 

export interface StudyPlan {
  id: string;
  user_id: string;
  topics: string[];
  schedule: Array<{
    day: number;
    time: string;
    subject: string;
    tasks: string[];
  }>;
  created_at: string;
}

export interface PlanHistory {
  id: string;
  user_id: string;
  subjects: string[];
  schedule_count: number;
  created_at: string;
}

export class StudyPlanService {
  static async generatePlan(userId: string, subjects: string[], timeSlots: number[], accessToken: string): Promise<StudyPlan> {
    try {
      const plan: StudyPlan = {
        id: uuidv4(), 
        user_id: userId,
        topics: subjects,
        schedule: timeSlots.map((slot, index) => ({
          day: index + 1,
          time: `${slot} hours`,
          subject: subjects[index % subjects.length],
          tasks: [
            `Study ${subjects[index % subjects.length]} for ${slot} hours`,
            'Review key concepts and notes',
            'Complete practice problems',
            'Summarize what you learned'
          ],
        })),
        created_at: new Date().toISOString(),
      };

      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });
      
      const { data, error } = await supabase
        .from('study_plans')
        .insert([plan])
        .select()
        .single();

      if (error) {
        console.error('Store Study Plan Error:', error);
        throw new Error(`Failed to store study plan: ${error.message}`);
      }

      console.log('Generated Study Plan:', plan);
      return data;
    } catch (err: any) {
      console.error('Study Plan Generate Error:', err.message);
      throw new Error(`Failed to generate study plan: ${err.message}`);
    }
  }

  static async getPlanHistory(userId: string, accessToken: string): Promise<PlanHistory[]> {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get Plan History Error:', error);
        throw new Error(`Failed to fetch plan history: ${error.message}`);
      }

      // Transform the data to include schedule_count and format for history
      // FIX: Use 'topics' field instead of 'subjects'
      const planHistory: PlanHistory[] = (data || []).map(plan => ({
        id: plan.id,
        user_id: plan.user_id,
        subjects: plan.topics || [], // Use topics field for subjects display
        schedule_count: plan.schedule?.length || 0,
        created_at: plan.created_at
      }));

      console.log('Fetched Plan History:', { userId, count: planHistory.length });
      return planHistory;
    } catch (err: any) {
      console.error('Get Plan History Error:', err.message);
      throw new Error(`Failed to fetch plan history: ${err.message}`);
    }
  }

  static async getPlanById(planId: string, accessToken: string): Promise<StudyPlan> {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        console.error('Get Plan By ID Error:', error);
        throw new Error(`Failed to fetch study plan: ${error.message}`);
      }

      if (!data) {
        throw new Error('Study plan not found');
      }

      console.log('Fetched Study Plan:', { planId });
      return data;
    } catch (err: any) {
      console.error('Get Plan By ID Error:', err.message);
      throw new Error(`Failed to fetch study plan: ${err.message}`);
    }
  }

  static async getUserPlans(userId: string, accessToken: string): Promise<StudyPlan[]> {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get User Plans Error:', error);
        throw new Error(`Failed to fetch user plans: ${error.message}`);
      }

      console.log('Fetched User Plans:', { userId, count: data?.length || 0 });
      return data || [];
    } catch (err: any) {
      console.error('Get User Plans Error:', err.message);
      throw new Error(`Failed to fetch user plans: ${err.message}`);
    }
  }
}