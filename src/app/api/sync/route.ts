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

    // 2. Check existing progress
    const { data: existing } = await supabaseAdmin
      .from('user_question_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', question.id)
      .single()

    const now = new Date().toISOString()
    let upsertError = null

    if (!existing) {
      const { error } = await supabaseAdmin.from('user_question_progress').insert({
        user_id: userId,
        question_id: question.id,
        status: 'solved',
        first_solved_at: now,
        last_solved_at: now,
        times_solved: 1,
      })
      upsertError = error

      if (!error) {
        await supabaseAdmin.from('activity_log').insert({
          user_id: userId,
          question_id: question.id,
          activity_type: 'solve',
        })
      }
    } else if (existing.status === 'unsolved') {
      const updateData: any = {
        status: 'solved',
        last_solved_at: now,
        times_solved: existing.times_solved + 1,
        updated_at: now,
      }
      if (!existing.first_solved_at) updateData.first_solved_at = now

      const { error } = await supabaseAdmin
        .from('user_question_progress')
        .update(updateData)
        .eq('id', existing.id)
      upsertError = error

      if (!error) {
        await supabaseAdmin.from('activity_log').insert({
          user_id: userId,
          question_id: question.id,
          activity_type: 'solve',
        })
      }
    } else {
      // Already solved, handle automatic revision tracking
      const lastSolvedDate = existing.last_solved_at ? existing.last_solved_at.split('T')[0] : null
      const todayDate = now.split('T')[0]

      if (lastSolvedDate !== todayDate) {
        // Increment times_solved and update last_solved_at
        const { error } = await supabaseAdmin
          .from('user_question_progress')
          .update({
            last_solved_at: now,
            times_solved: existing.times_solved + 1,
            updated_at: now,
          })
          .eq('id', existing.id)
        upsertError = error

        if (!error) {
          // Log revision activity
          await supabaseAdmin.from('activity_log').insert({
            user_id: userId,
            question_id: question.id,
            activity_type: 'revision',
          })

          // Check if there is an active revision schedule that is due today
          const { data: revisionSchedule } = await supabaseAdmin
            .from('revision_schedule')
            .select('*')
            .eq('user_id', userId)
            .eq('question_id', question.id)
            .eq('completed', false)
            .lte('scheduled_for', todayDate)
            .single()

          if (revisionSchedule) {
            // Automatically mark this revision as complete and schedule the next one
            // We duplicate a bit of the markRevisionComplete logic here to avoid importing
            // the server action directly (since this is an API route using a service role)
            
            // Mark current as completed
            await supabaseAdmin
              .from('revision_schedule')
              .update({ completed: true })
              .eq('id', revisionSchedule.id)

            // Spaced repetition cycle: 1, 3, 7, 21 days
            const CYCLE_DAYS = [1, 3, 7, 21]
            const nextStage = Math.min(revisionSchedule.cycle_stage + 1, CYCLE_DAYS.length)
            
            if (nextStage <= CYCLE_DAYS.length) {
              const daysUntilRevision = CYCLE_DAYS[nextStage - 1]
              const nextScheduledDate = new Date()
              nextScheduledDate.setDate(nextScheduledDate.getDate() + daysUntilRevision)
              
              await supabaseAdmin.from('revision_schedule').insert({
                user_id: userId,
                question_id: question.id,
                scheduled_for: nextScheduledDate.toISOString().split('T')[0],
                cycle_stage: nextStage,
              })
            }
          }
        }
      } else {
        // Solved on the same day, do nothing (prevent spam)
        console.log(`User ${userId} solved ${slug} again on the same day. Ignoring.`)
      }
    }

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to update progress', details: upsertError }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true, message: `Successfully marked ${slug} as solved` }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders })
  }
}
