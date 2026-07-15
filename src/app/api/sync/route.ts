import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We need to use the service role key to bypass RLS since the incoming request won't have a valid session token (it's coming from an extension)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const { userId, slug } = await req.json()

    if (!userId || !slug) {
      return NextResponse.json({ error: 'Missing userId or slug' }, { status: 400, headers: corsHeaders })
    }

    // 1. Find the question in our database by its LeetCode slug
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('slug', slug)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found in database', details: questionError }, { status: 404, headers: corsHeaders })
    }

    // 2. Mark it as solved for this user in the progress table
    const { error: upsertError } = await supabaseAdmin
      .from('progress')
      .upsert(
        {
          user_id: userId,
          question_id: question.id,
          status: 'solved',
          last_reviewed_at: new Date().toISOString()
        },
        { onConflict: 'user_id,question_id' }
      )

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to update progress', details: upsertError }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true, message: `Successfully marked ${slug} as solved` }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
