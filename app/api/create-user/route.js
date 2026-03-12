import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, password, full_name, nip, jabatan, no_hp, role } = await request.json()

    // Validate
    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, dan nama wajib diisi.' }, { status: 400 })
    }

    // Service role client — bisa create auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Generate QR code
    const prefix = (role === 'admin' || jabatan === 'Kepala Sekolah') ? 'ADM' : 'GURU'
    const qr_code = `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // 3. Insert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name,
        nip: nip || null,
        jabatan: jabatan || null,
        no_hp: no_hp || null,
        role: role || 'guru',
        qr_code,
      })

    if (profileError) {
      // Rollback — delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId, qr_code })

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}