const { Resend } = require('resend')

const FROM = process.env.EMAIL_FROM || 'BGC <noreply@bombaygamingcompany.in>'
const BRAND_PINK = '#ff1a6b'
const BRAND_BG = '#0d0d0f'
const BRAND_SURFACE = '#141417'
const BRAND_TEXT = '#e8e8f0'
const BRAND_MUTED = '#888899'

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bombay Gaming Company</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <div style="display:inline-block;background:${BRAND_PINK};width:10px;height:10px;border-radius:50%;margin-right:10px;"></div>
              <span style="font-size:22px;font-weight:800;color:${BRAND_TEXT};letter-spacing:0.08em;text-transform:uppercase;">BOMBAY GAMING COMPANY</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${BRAND_SURFACE};border:1px solid #1e1e28;border-radius:16px;padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;" align="center">
              <p style="color:${BRAND_MUTED};font-size:12px;margin:0;">
                Bombay Gaming Company &nbsp;·&nbsp; Mumbai, India<br/>
                <a href="${process.env.CLIENT_URL}" style="color:${BRAND_PINK};text-decoration:none;">bombaygamingcompany.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function badge(text, color = BRAND_PINK) {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${text}</span>`
}

function infoRow(label, value) {
  return `<tr>
    <td style="color:${BRAND_MUTED};font-size:13px;padding:8px 0;border-bottom:1px solid #1e1e28;width:45%;">${label}</td>
    <td style="color:${BRAND_TEXT};font-size:13px;padding:8px 0;border-bottom:1px solid #1e1e28;font-weight:600;">${value}</td>
  </tr>`
}

function heading(text) {
  return `<h1 style="color:${BRAND_TEXT};font-size:22px;font-weight:700;margin:0 0 8px 0;">${text}</h1>`
}

function subtext(text) {
  return `<p style="color:${BRAND_MUTED};font-size:14px;margin:0 0 24px 0;">${text}</p>`
}

function ctaButton(text, url) {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_PINK};color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.03em;">${text}</a>`
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  }) + ' IST'
}

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

// ─── Send helper ─────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipping email to', to)
    return
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: FROM, to, subject, html })
    console.log('[email] Sent:', subject, '→', to)
  } catch (err) {
    console.error('[email] Failed to send:', err.message)
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

async function bookingConfirmed({ user, booking }) {
  const html = baseTemplate(`
    ${heading('Booking Confirmed!')}
    ${subtext(`Hey ${user.name.split(' ')[0]}, your gaming session is locked in.`)}

    ${badge('Confirmed', '#22c55e')}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      ${infoRow('Station', booking.station_name)}
      ${infoRow('Date & Time', formatDate(booking.start_time))}
      ${infoRow('Duration', `${booking.duration_hours} hour${booking.duration_hours > 1 ? 's' : ''}`)}
      ${infoRow('Total Amount', formatRupees(booking.total_amount))}
      ${infoRow('Deposit Paid', formatRupees(booking.deposit_amount))}
      ${infoRow('Balance Due', formatRupees(booking.final_amount))}
      ${infoRow('Payment Method', booking.payment_method === 'wallet' ? 'BGC Wallet' : 'Cash at counter')}
      ${booking.discount_code ? infoRow('Discount Applied', booking.discount_code) : ''}
    </table>

    <p style="color:${BRAND_MUTED};font-size:13px;margin:24px 0 0 0;">
      Please arrive 5 minutes early. The remaining balance of <strong style="color:${BRAND_TEXT};">${formatRupees(booking.final_amount)}</strong> is due at the start of your session.
    </p>
  `)

  await sendEmail({
    to: user.email,
    subject: `Booking Confirmed — ${booking.station_name} on ${new Date(booking.start_time).toLocaleDateString('en-IN')}`,
    html,
  })
}

async function bookingCancelled({ user, booking }) {
  const refunded = booking.payment_method === 'wallet' && booking.deposit_paid
  const html = baseTemplate(`
    ${heading('Booking Cancelled')}
    ${subtext(`Your booking for ${booking.station_name} has been cancelled.`)}

    ${badge('Cancelled', '#ef4444')}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      ${infoRow('Station', booking.station_name)}
      ${infoRow('Original Date', formatDate(booking.start_time))}
      ${infoRow('Deposit', formatRupees(booking.deposit_amount))}
      ${infoRow('Refund Status', refunded ? 'Refunded to BGC Wallet' : 'No charge')}
    </table>

    ${refunded ? `<p style="color:#22c55e;font-size:14px;margin:20px 0 0 0;">✓ ${formatRupees(booking.deposit_amount)} has been returned to your wallet.</p>` : ''}

    <div style="margin-top:24px;">
      ${ctaButton('Book Again', `${process.env.CLIENT_URL}/book`)}
    </div>
  `)

  await sendEmail({
    to: user.email,
    subject: `Booking Cancelled — ${booking.station_name}`,
    html,
  })
}

async function tournamentRegistered({ user, tournament, registration }) {
  const isPaid = registration.payment_status === 'paid'
  const html = baseTemplate(`
    ${heading("You're In!")}
    ${subtext(`Registration confirmed for ${tournament.title}.`)}

    ${badge('Registered', BRAND_PINK)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      ${infoRow('Tournament', tournament.title)}
      ${infoRow('Format', tournament.format)}
      ${infoRow('Game', tournament.game_type)}
      ${infoRow('Tournament Date', formatDate(tournament.tournament_date))}
      ${infoRow('Prize Pool', tournament.prize_pool || 'TBA')}
      ${infoRow('Entry Fee', isPaid ? formatRupees(tournament.entry_fee) + ' (paid)' : 'Free')}
      ${registration.team_name ? infoRow('Team Name', registration.team_name) : ''}
    </table>

    <p style="color:${BRAND_MUTED};font-size:13px;margin:24px 0 0 0;">
      Stay tuned for bracket announcements. Good luck!
    </p>

    <div style="margin-top:24px;">
      ${ctaButton('View Tournament', `${process.env.CLIENT_URL}/tournaments/${tournament.id}`)}
    </div>
  `)

  await sendEmail({
    to: user.email,
    subject: `You're registered — ${tournament.title}`,
    html,
  })
}

async function walletTopUp({ user, amount, newBalance }) {
  const html = baseTemplate(`
    ${heading('Wallet Topped Up')}
    ${subtext(`Your BGC wallet has been credited.`)}

    ${badge('Payment Successful', '#22c55e')}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      ${infoRow('Amount Added', formatRupees(amount))}
      ${infoRow('New Wallet Balance', formatRupees(newBalance))}
    </table>

    <div style="margin-top:24px;">
      ${ctaButton('Book a Session', `${process.env.CLIENT_URL}/book`)}
    </div>
  `)

  await sendEmail({
    to: user.email,
    subject: `₹${amount} added to your BGC wallet`,
    html,
  })
}

module.exports = { bookingConfirmed, bookingCancelled, tournamentRegistered, walletTopUp }
