import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /api/discounts — list active discounts
  http.get('/api/discounts', () => {
    return HttpResponse.json({
      discounts: [
        {
          id: '1',
          code: 'BGCWELCOME20',
          label: 'Welcome Drop',
          description: '20% off your first booking',
          type: 'PERCENTAGE',
          value: 20,
          is_active: true,
          valid_until: null,
          uses_so_far: 10,
          max_uses: 100,
          min_booking: 100,
          applies_to: 'ALL',
          per_user_limit: 1,
          valid_from: '2024-01-01T00:00:00Z',
        },
      ],
    })
  }),

  // POST /api/discounts/validate — validate a code
  http.post('/api/discounts/validate', async ({ request }) => {
    const body = await request.json()
    if (body.code === 'FAKECODE') {
      return HttpResponse.json(
        { error: "This code doesn't exist.", errorCode: 'NOT_FOUND' },
        { status: 422 }
      )
    }
    if (body.code === 'EXPIRED') {
      return HttpResponse.json(
        { error: 'This code expired on 1 Jan 2024.', errorCode: 'EXPIRED' },
        { status: 422 }
      )
    }
    return HttpResponse.json({
      discount: {
        id: '1',
        code: body.code,
        label: 'Welcome Drop',
        type: 'PERCENTAGE',
        value: 20,
        applies_to: 'ALL',
      },
      discountAmount: 60,
      finalTotal: 240,
    })
  }),

  // POST /api/bookings — create booking
  http.post('/api/bookings', async ({ request }) => {
    const body = await request.json()
    if (!body.station_id || !body.start_time || !body.duration_hours) {
      return HttpResponse.json(
        { error: 'station_id, start_time, duration_hours are required' },
        { status: 400 }
      )
    }
    return HttpResponse.json(
      {
        booking: {
          id: 'booking-123',
          status: 'confirmed',
          station_id: body.station_id,
          start_time: body.start_time,
          duration_hours: body.duration_hours,
          total_amount: 300,
          deposit_amount: 150,
        },
      },
      { status: 201 }
    )
  }),

  // GET /api/bookings/my — list user bookings
  http.get('/api/bookings/my', () => {
    return HttpResponse.json({
      bookings: [
        {
          id: 'booking-1',
          status: 'confirmed',
          station_name: 'PC-01',
          start_time: '2025-01-15T10:00:00',
          duration_hours: 2,
          total_amount: 100,
        },
      ],
    })
  }),
]
