import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfdghduqsaniszkvzyhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZGdoZHVxc2FuaXN6a3Z6eWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzIwMTcsImV4cCI6MjA3NDcwODAxN30.8ga6eiQymTcO3OZLGDe3WuAHkWcxgRA9ywG3xJ6QzNI';

const supabase = createClient(supabaseUrl, supabaseKey);

export class AuthService {
  static async signUp(email: string, password: string, name: string) {
    console.log('Starting signup process for:', { email, name });
    
    try {
      // Step 1: Create user in auth.users table
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { name }
        },
      });
      
      if (error) {
        console.error('Auth signup error:', error);
        throw new Error(error.message);
      }
      
      if (!data.user) {
        console.error('No user returned from auth signup');
        throw new Error('No user returned from authentication');
      }
      
      console.log('Auth user created successfully:', { userId: data.user.id, email: data.user.email });

      // Step 2: Wait a moment to ensure auth user is fully committed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Create user profile in public.users table
      try {
        await AuthService.createUserProfile(data.user.id, email, name);
        console.log('User profile created successfully');
      } catch (profileError: any) {
        console.error('User profile creation failed:', profileError.message);
        // Don't throw error here - auth succeeded even if profile creation failed
        // The profile will be created on first sign-in
      }
      
      return { 
        user: data.user, 
        session: data.session?.access_token || null 
      };
    } catch (error: any) {
      console.error('Signup process failed:', error.message);
      throw error;
    }
  }

  static async signIn(email: string, password: string) {
    console.log('Starting signin process for:', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Auth signin error:', error);
      throw new Error(error.message);
    }
    
    if (!data.user) {
      console.error('No user returned from auth signin');
      throw new Error('No user returned from authentication');
    }

    console.log('Auth user signed in successfully:', { userId: data.user.id, email: data.user.email });
    
    // Ensure user profile exists in public.users table
    await AuthService.ensureUserProfile(data.user.id, data.user.email!, data.user.user_metadata?.name || 'User');
    
    return { 
      user: data.user, 
      session: data.session?.access_token || null 
    };
  }

  static async getUser(token: string) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('No user found');
    
    // Ensure user profile exists
    await AuthService.ensureUserProfile(data.user.id, data.user.email!, data.user.user_metadata?.name || 'User');
    
    return data.user;
  }

  static async createUserProfile(userId: string, email: string, name: string) {
    console.log('Creating user profile in public.users:', { userId, email, name });
    
    try {
      // First check if user already exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingUser) {
        console.log('User profile already exists in public.users');
        return existingUser;
      }

      // Insert new user profile
      const { data, error } = await supabase
        .from('users')
        .insert([
          { 
            id: userId, 
            email, 
            name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        
        // If duplicate, that's fine
        if (error.code === '23505') {
          console.log('User profile already exists (duplicate key)');
          return;
        }
        
        throw new Error(`Failed to create user profile: ${error.message}`);
      }
      
      console.log('User profile created successfully in public.users:', { userId: data?.id });
      return data;
    } catch (error: any) {
      console.error('Create user profile catch error:', error.message);
      throw error;
    }
  }

  static async ensureUserProfile(userId: string, email: string, name: string) {
    try {
      console.log('Ensuring user profile exists:', { userId });
      
      // Check if user profile exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user profile:', fetchError);
      }

      // Create profile if it doesn't exist
      if (!existingUser) {
        console.log('User profile not found in public.users, creating now...');
        try {
          await AuthService.createUserProfile(userId, email, name);
          console.log('User profile created successfully in ensureUserProfile');
        } catch (createError: any) {
          console.error('Failed to create user profile in ensureUserProfile:', createError.message);
          // Don't throw - we'll handle missing profiles in other services
        }
      } else {
        console.log('User profile already exists in public.users');
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Don't throw error here to avoid blocking auth flow
    }
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
}