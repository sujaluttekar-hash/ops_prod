import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
export async function GET() {
  const sb = getServiceSupabase()
  const [t,d,a,al] = await Promise.all([
    sb.from('tasks').select('type,status,butler_id,notes,created_at').order('created_at',{ascending:false}).limit(5),
    sb.from('guest_delights').select('your_name,status,created_at').order('created_at',{ascending:false}).limit(5),
    sb.from('attendance').select('butler_id,status,date').order('date',{ascending:false}).limit(5),
    sb.from('tasks').select('type,butler_id,notes,created_at').in('type',['Check-In','Check-Out','Booking','Non Booking']).order('created_at',{ascending:false}).limit(5),
  ])
  return NextResponse.json({ tasks:t.data, delights:d.data, attendance:a.data, allocation:al.data,
    errors:{t:t.error?.message,d:d.error?.message,a:a.error?.message,al:al.error?.message} })
}
