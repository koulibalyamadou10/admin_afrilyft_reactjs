import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserRequest {
  email: string
  full_name: string
  phone: string
  role: string
  is_active: boolean
  is_verified: boolean
  avatar_url?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the user's profile to check if they have admin privileges
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify user permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For now, we'll allow any authenticated user to create users
    // In a real application, you might want to check for admin role
    // if (profile.role !== 'admin') {
    //   return new Response(
    //     JSON.stringify({ error: 'Insufficient permissions' }),
    //     { 
    //       status: 403, 
    //       headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    //     }
    //   )
    // }

    // Parse the request body
    const requestData: CreateUserRequest = await req.json()

    // Validate required fields
    if (!requestData.email || !requestData.full_name || !requestData.phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, full_name, phone' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the user with admin client
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: 'TempPassword123!', // Temporary password
      email_confirm: true,
      user_metadata: {
        full_name: requestData.full_name,
        phone: requestData.phone,
        role: requestData.role || 'customer'
      }
    })

    if (authCreateError) {
      console.error('Auth user creation error:', authCreateError)
      return new Response(
        JSON.stringify({ error: authCreateError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the profile
    const { data: profileData, error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: requestData.email,
        full_name: requestData.full_name,
        phone: requestData.phone,
        role: requestData.role || 'customer',
        is_active: requestData.is_active ?? true,
        is_verified: requestData.is_verified ?? false,
        avatar_url: requestData.avatar_url || null
      }])
      .select()
      .single()

    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError)
      
      // If profile creation fails, clean up the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      
      return new Response(
        JSON.stringify({ error: profileCreateError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: profileData,
        message: 'User created successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})