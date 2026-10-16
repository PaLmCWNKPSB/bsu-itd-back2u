// ตัวเล่นพรีเซนต์ Back 2 U แบบที่ 3 — ทุกอย่างเป็นฟังก์ชันของเวลา t (วินาที) จึงเล่นสดตามเสียงและเรนเดอร์ทีละเฟรมได้ตรงกันทุกครั้ง
// เล่นสด: เสียง <audio> เป็นนาฬิกาหลัก · เรนเดอร์: ?render=1 แล้วเรียก window.__seek(t)
(() => {
  const $ = (id) => document.getElementById(id)
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const lerp = (a, b, k) => a + (b - a) * k
  const eo = (k) => 1 - Math.pow(1 - clamp(k), 3)
  const ei = (k) => Math.pow(clamp(k), 3)
  const eio = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2 }
  const win = (t, a, b, fi = 0.4, fo = 0.4) => (t < a || t > b ? 0 : Math.min(1, fi ? (t - a) / fi : 1, fo ? (b - t) / fo : 1))
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
  const RENDER = /[?&]render=1/.test(location.search)
  if (RENDER) document.body.classList.add('render')

  const SEGS = TL.segs, INTRO = TL.intro, OUTRO = TL.outro, END = TL.end, OUT0 = END - OUTRO
  const FLOOR = 1030, PH = 900, PW = PH * 0.3665
  // มุมกล้อง: P = ตำแหน่งผู้นำเสนอในโลก · s = ซูม · f = จุดในโลกที่กล้องเล็ง · p = ตำแหน่งบนจอของจุดนั้น
  const SHOT = {
    wide: { P: 960, s: 1, f: [960, 540], p: [960, 540], side: 'c' },
    lfull: { P: 560, s: 1, f: [960, 540], p: [960, 540], side: 'l' },
    rfull: { P: 1360, s: 1, f: [960, 540], p: [960, 540], side: 'r' },
    lmed: { P: 560, s: 1.7, f: [560, 382], p: [470, 470], side: 'l' },
    rmed: { P: 1360, s: 1.7, f: [1360, 382], p: [1450, 470], side: 'r' },
    close: { P: 560, s: 2.3, f: [560, 330], p: [560, 500], side: 'l' },
  }
  const PANEL = { lfull: [1010, 830], rfull: [80, 830], lmed: [1040, 800], rmed: [80, 780], close: [1250, 610], wide: [560, 800] }
  const PHONE = { close: { k: 0.7, top: 262, dx: 180 }, lmed: { k: 1, top: 350, dx: 185 }, rmed: { k: 1, top: 350, dx: -185 - 132 }, lfull: { k: 1, top: 470, dx: 170 }, rfull: { k: 1, top: 470, dx: -170 - 132 } }
  const SECNAME = { '1.1': 'ประวัติและความเป็นมา', '1.2': 'วัตถุประสงค์ของโครงงาน', '1.3': 'ขอบเขตและขีดความสามารถของโครงงาน', '1.4': 'ผลที่คาดว่าจะได้รับ', '1.5': 'โปรแกรมที่ใช้พัฒนาระบบ', '1.6': 'แผนการดำเนินงาน', '1.7': 'เอกสารอ้างอิง' }
  const LABEL = { open: 'พรีเซนต์โครงงาน', team: 'ผู้จัดทำ', toc: 'สารบัญ', demo: 'ทดลองใช้งานระบบจริง', try: 'ลองใช้งานจริง', thanks: 'ขอบคุณ' }
  const DOTS = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', 'demo']

  // ── จัดหน้าจอให้พอดีหน้าต่าง ──
  const stage = $('stage')
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080)
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`
  }
  if (!RENDER) { addEventListener('resize', fit); fit() }

  // ── สร้างองค์ประกอบ ──
  const bars = $('bars'); for (let i = 0; i < 28; i++) bars.appendChild(document.createElement('i'))
  const barEls = [...bars.children]
  const pts = $('pts'), PTS = []
  for (let i = 0; i < 46; i++) { const d = document.createElement('div'); d.className = 'pt'; pts.appendChild(d); PTS.push(d) }
  for (let i = 0; i < 4; i++) { const b = document.createElement('div'); b.className = 'bin'; b.style.left = [60, 300, 1880, 2040][i] + 'px'; b.style.top = '60px'; b.textContent = Array.from({ length: 26 }, (_, r) => Array.from({ length: 6 }, (_, c) => (hash(i * 97 + r * 7 + c) > 0.5 ? '1' : '0')).join(' ')).join('\n'); pts.appendChild(b) }
  const pres = $('pres'), presImg = pres.querySelector('img')
  pres.style.width = PW + 'px'
  const shadow = $('shadow'), ring = $('ring')

  // จอกราฟิก (สร้างจาก DATA.panels ตามช่วง)
  const panelsEl = $('panels'), phonesEl = $('phones')
  for (const s of SEGS) {
    s.panels = []
    for (const p of DATA.panels[s.id] || []) {
      const el = document.createElement('div')
      el.className = 'panel ' + (p.cls || '')
      el.innerHTML = '<i class="cn c1"></i><i class="cn c2"></i><i class="cn c3"></i><i class="cn c4"></i><div class="beamP"></div>' + p.html
      const geo = p.geo || PANEL[s.shot] || PANEL.wide
      el.style.left = geo[0] + 'px'; el.style.width = geo[1] + 'px'
      if (p.top) el.style.top = p.top + 'px'
      el.dataset.tilt = p.tilt != null ? p.tilt : (SHOT[s.shot] && SHOT[s.shot].side === 'r' ? 5 : -5)
      panelsEl.appendChild(el)
      const items = [...el.querySelectorAll('.it')].map((it) => ({ el: it, at: s.lines[Math.min(+(it.dataset.l || 0), s.lines.length - 1)].t0 + (+(it.dataset.d || 0)) }))
      s.panels.push({ el, items, beam: el.querySelector('.beamP') })
    }
    if (s.phone) {
      const el = document.createElement('div'); el.className = 'phone'
      el.innerHTML = `<div class="beam"></div><div class="base"></div><div class="scr"><div class="notch"></div><img src="${DATA.img[s.phone]}" alt=""><img src="${DATA.img[s.phone2 || s.phone]}" alt="" style="opacity:0"></div>`
      phonesEl.appendChild(el)
      const imgs = el.querySelectorAll('img')
      s.phoneEl = { el, a: imgs[0], b: imgs[1] }
    }
  }
  // ซับ / ข่าววิ่ง / ชื่อบนจอเปิดตัว
  const subEl = $('sub'), txEl = $('tx')
  const TICK = DATA.ticker + '   ◆   '
  txEl.textContent = TICK + TICK + TICK
  let tickW = 0
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
  const graphemes = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s])
  const KICK = graphemes('PROJECT PRESENTATION · โครงงานเทคโนโลยีสารสนเทศ'), ITH = graphemes(DATA.title.th)
  $('ien').textContent = DATA.title.en
  $('iun').innerHTML = DATA.uni.join('<br>')
  $('onames').innerHTML = DATA.members.map((m) => m[0]).join(' · ') + '<br><span style="color:#fcd34d">อาจารย์ที่ปรึกษา ' + DATA.advisor.replace('อาจารย์', 'อาจารย์') + '</span>'
  const dotsEl = $('dots'); DOTS.forEach(() => dotsEl.appendChild(document.createElement('i')))
  const dotEls = [...dotsEl.children]
  const warp = $('warp').getContext('2d')

  // ── กล้อง ──
  function segAt(t) { let i = SEGS.findIndex((s) => t < s.t1); if (i < 0) i = SEGS.length - 1; return i }
  function camAt(t) {
    if (t < SEGS[0].t0) { const k = eio((t - 5.55) / 1.1); const w = SHOT.wide; return { ...w, s: lerp(0.84, 1, k), cut: false } }
    const i = segAt(t), s = SEGS[i], cur = SHOT[s.shot], prev = i ? SHOT[SEGS[i - 1].shot] : SHOT.wide
    const local = clamp((t - s.t0) / (s.t1 - s.t0))
    let c
    if (i && prev.side === cur.side && prev.P === cur.P) {
      const k = eio((t - s.t0) / 0.9)
      c = { P: cur.P, s: lerp(prev.s, cur.s, k), f: [lerp(prev.f[0], cur.f[0], k), lerp(prev.f[1], cur.f[1], k)], p: [lerp(prev.p[0], cur.p[0], k), lerp(prev.p[1], cur.p[1], k)], side: cur.side }
    } else c = { ...cur, cut: i > 0 && t - s.t0 < 0.22 }
    c.s *= 1 + 0.03 * local                                   // ดันกล้องเข้าช้า ๆ ระหว่างพูด
    c.p = [c.p[0] + 3 * Math.sin(t * 0.7), c.p[1] + 2 * Math.sin(t * 0.9 + 1)]   // กล้องถือมือเล็กน้อย
    return c
  }

  function drawWarp(intensity, phase) {
    warp.clearRect(0, 0, 1920, 1080)
    if (intensity <= 0.001) return
    warp.save(); warp.translate(960, 500)
    warp.lineCap = 'round'
    for (let i = 0; i < 280; i++) {
      const a = hash(i) * Math.PI * 2, sp = 0.4 + hash(i + 900)
      const r = ((hash(i + 300) * 900 + phase * 2600 * sp) % 1400) + 30
      const len = 30 + intensity * intensity * 520 * sp
      const al = Math.min(1, intensity * 1.4) * (0.35 + 0.65 * hash(i + 77)) * clamp(r / 300)
      warp.strokeStyle = `rgba(${170 + 60 * hash(i + 5) | 0},245,255,${al.toFixed(3)})`
      warp.lineWidth = 1 + 2.6 * hash(i + 41) * intensity
      warp.beginPath(); warp.moveTo(Math.cos(a) * r, Math.sin(a) * r); warp.lineTo(Math.cos(a) * (r + len), Math.sin(a) * (r + len)); warp.stroke()
    }
    warp.restore()
  }

  // ── วาดหนึ่งเฟรม ──
  function render(t) {
    t = clamp(t, 0, END)
    const cam = camAt(t)
    const i = segAt(t), S = SEGS[i]
    // ฉากหลัง (พารัลแลกซ์เบากว่าโลกจริง)
    const bgS = 1 + (cam.s - 1) * 0.22
    $('bg').style.transform = `translate(${(cam.p[0] - cam.f[0] * 1) * 0.12 + (cam.side === 'r' ? -40 : cam.side === 'l' ? 40 : 0)}px,${(cam.p[1] - cam.f[1]) * 0.08}px) scale(${bgS})`
    $('sweep').style.left = ((t * 160) % 2600) - 400 + 'px'
    barEls.forEach((b, k) => { b.style.height = 20 + 80 * (0.5 + 0.5 * Math.sin(t * 1.3 + k * 0.7)) * (0.4 + 0.6 * hash(k)) + '%' })
    PTS.forEach((d, k) => {
      const x = hash(k) * 2160, sp = 18 + 40 * hash(k + 50), y = 1300 - ((t * sp + hash(k + 9) * 1300) % 1300)
      d.style.transform = `translate(${x}px,${y}px)`; d.style.opacity = (0.25 + 0.6 * hash(k + 3)) * (0.5 + 0.5 * Math.sin(t * 2 + k))
    })
    // โลก (ผู้นำเสนอ + โทรศัพท์)
    $('world').style.transform = `translate(${cam.p[0]}px,${cam.p[1]}px) scale(${cam.s}) translate(${-cam.f[0]}px,${-cam.f[1]}px)`
    const P = cam.P
    pres.style.left = P - PW / 2 + 'px'; pres.style.top = FLOOR - PH + 'px'
    const breath = 1 + 0.006 * Math.sin((2 * Math.PI * t) / 4.3)
    const speaking = S && S.lines.some((l) => t >= l.t0 && t <= l.t1)
    const bob = speaking ? 0.0025 * Math.sin(t * 9.1) * Math.sin(t * 2.3) : 0
    pres.style.transform = `translateX(${1.2 * Math.sin((2 * Math.PI * t) / 6.1)}px) rotate(${0.18 * Math.sin(t * 0.8)}deg) scaleY(${breath + bob})`
    shadow.style.left = P - 210 + 'px'; shadow.style.top = FLOOR - 36 + 'px'
    ring.style.left = P - 260 + 'px'; ring.style.top = FLOOR - 55 + 'px'
    ring.style.opacity = 0.35 + 0.25 * Math.sin(t * 2.2)
    for (const s of SEGS) {
      if (!s.phoneEl) continue
      const g = PHONE[s.shot] || PHONE.lfull
      const v = win(t, s.t0 + 0.25, s.t1 + 0.1, 0.55, 0.3)
      const el = s.phoneEl.el
      el.style.display = v > 0 ? 'block' : 'none'
      if (!v) continue
      const k = eo((t - s.t0 - 0.25) / 0.6)
      el.style.left = s.phoneEl.x = P + g.dx + 'px'
      el.style.top = g.top + (1 - k) * 60 + 5 * Math.sin(t * 1.6) + 'px'
      el.style.opacity = v
      el.style.transform = `scale(${g.k * (0.85 + 0.15 * k)}) rotate(${(SHOT[s.shot].side === 'r' ? 4 : -4) + 1.2 * Math.sin(t * 0.9)}deg)`
      if (s.phone2) {
        const L = s.lines[0], mid = L.t0 + (L.t1 - L.t0) * 0.52
        const kb = eo((t - mid) / 0.6)
        s.phoneEl.b.style.opacity = kb; s.phoneEl.b.style.transform = `translateY(${(1 - kb) * 40}px)`
        s.phoneEl.a.style.opacity = 1 - kb * 0.9
      }
    }
    // จอกราฟิก
    for (const s of SEGS) for (const p of s.panels) {
      const a = s.t0 + (s.warp ? 1.35 : 0.2), b = s === SEGS[SEGS.length - 1] ? OUT0 + 1.7 : s.t1 + 0.12   // จอขอบคุณค้างจนวาร์ปปิด
      const v = t < a || t > b ? 0 : 1
      p.el.style.display = v ? 'block' : 'none'
      if (!v) continue
      const k = eo((t - a) / 0.7), out = clamp((b - t) / 0.3)
      const tilt = +p.el.dataset.tilt
      p.el.style.opacity = Math.min(k * 1.2, out)
      p.el.style.transform = `translateY(${(1 - k) * 90}px) rotateX(${(1 - k) * 48}deg) rotateY(${tilt * k}deg) scale(${0.9 + 0.1 * k - (1 - out) * 0.04})`
      p.beam.style.opacity = (1 - k) * 0.9 + 0.18
      for (const it of p.items) {
        const q = eo((t - it.at) / 0.45)
        it.el.style.opacity = q; it.el.style.transform = `translateX(${(1 - q) * -24}px)`
      }
    }
    // ป้ายชื่อ · แถบบน · ข่าววิ่ง · ซับ
    const open = SEGS[0]
    const lv = win(t, open.lines[1].t0 - 0.3, open.t1 - 0.1, 0.5, 0.35)
    $('lower').style.opacity = lv; $('lower').style.transform = `translateX(${(1 - eo((t - open.lines[1].t0 + 0.3) / 0.5)) * -80}px)`
    const hv = win(t, INTRO + 0.2, OUT0 + 0.3, 0.6, 0.5)
    $('bug').style.opacity = hv; $('sec').style.opacity = hv; $('ticker').style.opacity = hv
    if (S) {
      const lab = S.sec ? `${S.sec} ${SECNAME[S.sec]}` : S.step ? `ทดลองใช้งาน · ${S.step}` : LABEL[S.id] || ''
      if ($('seclab').textContent !== lab) $('seclab').textContent = lab
      const reached = S.sec ? DOTS.indexOf(S.sec) : (S.step || S.id === 'demo' || S.id === 'try' || S.id === 'thanks') ? 7 : -1
      dotEls.forEach((d, k) => d.classList.toggle('on', k <= reached))
    }
    if (!tickW) tickW = txEl.scrollWidth / 3
    if (tickW) txEl.style.transform = `translateX(${-((t * 85) % tickW)}px)`
    let line = null
    for (const s of SEGS) for (const l of s.lines) if (t >= l.t0 - 0.12 && t <= l.t1 + 0.3) line = l
    if (line) { if (subEl.textContent !== line.sub) subEl.textContent = line.sub; subEl.style.opacity = Math.min(1, (t - line.t0 + 0.12) / 0.12, (line.t1 + 0.3 - t) / 0.15) } else subEl.style.opacity = 0
    // เปิดตัว
    const intro = $('intro')
    if (t < INTRO + 0.2) {
      intro.style.display = 'flex'
      intro.style.opacity = t < 5.5 ? 1 : clamp(1 - (t - 5.5) / 0.25)
      const kk = Math.floor(clamp((t - 0.3) / 1.1) * KICK.length); $('kick').textContent = KICK.slice(0, kk).join('')
      $('gl1').style.transform = `scaleX(${eo((t - 0.1) / 0.8)})`; $('gl2').style.transform = `scaleY(${eo((t - 0.25) / 0.8)})`
      $('gl1').style.opacity = $('gl2').style.opacity = 1 - 0.75 * clamp((t - 1.2) / 0.6)
      const zoom = 1 + 2.4 * ei((t - 4.35) / 1.3), fade = 1 - clamp((t - 4.9) / 0.5)
      $('rings').style.opacity = win(t, 0.8, 9, 0.5, 0) * fade
      $('rings').style.transform = `scale(${(0.6 + 0.4 * eo((t - 0.8) / 0.8)) * zoom}) rotate(${t * 40}deg)`
      const lk = eo((t - 1.0) / 0.6), jit = t > 1 && t < 1.5 ? (hash(Math.floor(t * 30)) - 0.5) * 18 : 0
      $('ilogo').style.opacity = clamp((t - 1.0) / 0.15) * (t > 1 && t < 1.5 && hash(Math.floor(t * 40) + 3) > 0.8 ? 0.4 : 1) * fade
      $('ilogo').style.transform = `translateX(${jit}px) scale(${(0.4 + 0.6 * lk) * zoom})`
      $('ibt').style.clipPath = `inset(0 ${100 - 100 * eo((t - 1.5) / 0.6)}% 0 0)`; $('ibt').style.opacity = fade; $('ibt').style.transform = `scale(${zoom})`
      $('ith').textContent = ITH.slice(0, Math.floor(clamp((t - 2.0) / 0.7) * ITH.length)).join(''); $('ith').style.opacity = fade
      $('ien').style.opacity = clamp((t - 2.4) / 0.5) * fade; $('iun').style.opacity = clamp((t - 2.8) / 0.5) * fade
    } else intro.style.display = 'none'
    // ปิดท้าย
    const outro = $('outro'), o = t - OUT0
    if (o > 1.8) {
      outro.style.display = 'flex'
      outro.style.opacity = clamp((o - 1.85) / 0.15) * clamp((END - t) / 0.7)
      $('orow').style.transform = `scale(${1.15 - 0.15 * eo((o - 1.9) / 0.8)})`
      $('onames').style.opacity = clamp((o - 2.6) / 0.6)
    } else outro.style.display = 'none'
    $('world').style.opacity = $('hud').style.opacity = o > 0 ? clamp(1 - (o - 1.2) / 0.6) : 1
    if (o > 0 && o < 1.9) $('world').style.transform += ` scale(${1 + 0.6 * ei(o / 1.9)})`
    // วาร์ป (เปิดตัว · ช่วงทดลองใช้งาน · ปิดท้าย) + แสงวาบ
    let wi = 0, ph = 0, fl = 0
    if (t > 4.2 && t < 6.4) { wi = t < 5.6 ? ei((t - 4.2) / 1.4) : 1 - eo((t - 5.6) / 0.8); ph = (t - 4.2) / 1.6 }
    fl = Math.max(fl, win(t, 5.3, 6.3, 0.32, 0.68))
    const dw = SEGS.find((s) => s.warp)
    if (dw && t > dw.t0 && t < dw.t0 + 1.8) { const q = t - dw.t0; wi = q < 1.2 ? ei(q / 1.2) * 0.9 : 0.9 * (1 - eo((q - 1.2) / 0.6)); ph = q / 1.3; fl = Math.max(fl, 0.75 * win(t, dw.t0 + 1.0, dw.t0 + 1.8, 0.2, 0.6)) }
    if (o > 0 && o < 2.8) { wi = o < 1.9 ? ei(o / 1.9) : 1 - eo((o - 1.9) / 0.9); ph = o / 1.7; fl = Math.max(fl, win(o, 1.5, 2.6, 0.4, 0.7)) }
    drawWarp(wi, ph)
    // ตัดภาพสลับมุมกล้อง: แถบกลิตช์ + แสงวาบสั้น ๆ
    let gl = 0
    if (cam.cut) { gl = 1 - (t - S.t0) / 0.22; fl = Math.max(fl, 0.22 * gl) }
    $('glitch').style.opacity = gl * 0.9; $('glitch').style.top = 120 + hash(i * 13) * 760 + 'px'
    $('flash').style.opacity = fl
  }

  // ── เล่นสด ──
  const aud = $('aud')
  window.__seek = (t) => render(t)
  window.__END = END
  window.__ready = Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), ...[...document.images].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r })))]).then(() => { render(0); return true })
  if (RENDER) return
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`
  let playing = false
  function loop() { render(aud.currentTime); $('barf').style.width = (aud.currentTime / END) * 100 + '%'; $('time').textContent = `${fmt(aud.currentTime)} / ${fmt(END)}`; if (playing) requestAnimationFrame(loop) }
  function play() { aud.play().then(() => { playing = true; $('pp').textContent = '⏸ หยุด'; loop() }).catch(() => {}) }
  function pause() { aud.pause(); playing = false; $('pp').textContent = '▶ เล่น' }
  $('start').addEventListener('click', () => { $('start').style.display = 'none'; if (aud.currentTime >= END - 0.1) aud.currentTime = 0; play() })
  $('pp').addEventListener('click', () => (playing ? pause() : play()))
  aud.addEventListener('ended', () => { pause(); $('start').style.display = 'flex'; $('start').querySelector('span').textContent = 'เล่นอีกครั้ง' })
  const seekTo = (x) => { aud.currentTime = clamp(x, 0, END - 0.05); render(aud.currentTime); $('barf').style.width = (aud.currentTime / END) * 100 + '%' }
  $('bar').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * END) })
  $('bar').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') seekTo(aud.currentTime + 5); if (e.key === 'ArrowLeft') seekTo(aud.currentTime - 5) })
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if ($('start').style.display !== 'none') $('start').click(); else playing ? pause() : play() } })
  $('fs').addEventListener('click', () => { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}) })
  window.__ready.then(() => render(0))
})()
