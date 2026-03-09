import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = profile.id

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const isActive = subscription.status === 'active'

      await supabase
        .from('user_profiles')
        .update({ plan: isActive ? 'pro' : 'free' })
        .eq('id', userId)

      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          status: subscription.status as 'active' | 'canceled' | 'past_due',
          current_period_end: new Date(
            (subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000
          ).toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      )
      break
    }

    case 'customer.subscription.deleted': {
      await supabase
        .from('user_profiles')
        .update({ plan: 'free' })
        .eq('id', userId)

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
