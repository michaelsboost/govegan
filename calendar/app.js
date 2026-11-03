/* Go Vegan advocacy calendar. No tracking, remote requests, or dependencies. */
(() => {
  'use strict';
  const DATA = window.GO_VEGAN_CALENDAR_DATA;
  if (!DATA || !Array.isArray(DATA.observances)) {
    const status = document.querySelector('#status'); if (status) status.textContent = 'Calendar data is unavailable.';
    return;
  }
  const MONTHS = Array.from({length: 12}, (_, i) => new Intl.DateTimeFormat('en', {month: 'long'}).format(new Date(2026, i, 1)));
  const ICONS = {'vegan':'🌱','animal-rights':'✊','plant-based':'🥬','animal-awareness':'🐾','environment':'🌍'};
  let today = new Date();
  const params = new URLSearchParams(window.location?.search || '');
  const hashId = (window.location?.hash || '').match(/^#\/calendar\/([^/?#]+)/)?.[1];
  const suppliedYear = Number(params.get('year'));
  const initialYear = Number.isInteger(suppliedYear) && suppliedYear >= 2020 && suppliedYear <= 2100 ? suppliedYear : today.getFullYear();
  const linkedId = hashId ? decodeURIComponent(hashId) : params.get('event');
  const linkedEvent = DATA.observances.find(event => event.id === linkedId);
  const monthValue = Number(params.get('month'));
  const initialMonth = linkedEvent ? String(linkedEvent.rule.month) : monthValue >= 1 && monthValue <= 12 ? String(monthValue) : 'all';
  const initialGridMonth = linkedEvent ? linkedEvent.rule.month : monthValue >= 1 && monthValue <= 12 ? monthValue : today.getMonth() + 1;
  const state = {year: initialYear, month: initialMonth, gridMonth: initialGridMonth, selectedDay: null, category: 'all', query: '', focus: false};
  if (initialYear === today.getFullYear() && initialGridMonth === today.getMonth() + 1) state.selectedDay = today.getDate();
  const rootEl = document.getElementById('advocacy-calendar');
  if (!rootEl) return;
  const $ = (s) => rootEl.querySelector(s);
  const {resolveDate, nthWeekday, lastWeekday} = window.GoVeganCalendarUtils;
  const buildEvents = year => window.GoVeganCalendarUtils.buildEvents(DATA, year);
  const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const readable = date => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date);
  function dateText(ev){
    if(!ev.start) return 'Date to be confirmed';
    if(ev.rule.type==='month') return 'All of '+MONTHS[ev.month-1];
    return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short'}).format(ev.start);
  }
  function elem(tag,className,textContent){
    const el=document.createElement(tag);
    if(className) el.className=className;
    if(textContent!==undefined) el.textContent=textContent;
    return el;
  }
  function eventCard(ev){
    const article=elem('article','observance-card');
    article.id='event-'+ev.id;
    const heading=elem('div','card-top');
    const day=elem('div','event-date',dateText(ev));
    heading.append(day);
    const label=elem('span','type-tag',`${ICONS[ev.category] || '📅'} ${DATA.categories[ev.category]}`);
    heading.append(label);
    article.append(heading);
    const title=elem('h3','card-title',ev.title);
    article.append(title);
    if(ev.start && sameDay(ev.start,today)) article.append(elem('span','today-tag','Today'));
    const p=elem('p','card-description',ev.description);
    article.append(p);
    article.append(elem('p','card-prompt','Discussion prompt: '+ev.advocacyPrompt));
    const footer=elem('div','card-footer');
    footer.append(elem('span','region-label',ev.region));
    const source=elem('a','source-link','View source ↗');
    source.href=ev.source.url;source.target='_blank';source.rel='noopener noreferrer';
    source.setAttribute('aria-label','Source for '+ev.title+' (opens a new tab)');
    footer.append(source);
    article.append(footer);
    if(ev.notice) article.append(elem('p','card-note',ev.notice));
    if(!ev.start) article.append(elem('p','card-note','Organizer-set date has not been confirmed for the selected year.'));
    return article;
  }
  function passesFilters(ev){
    const q = state.query.trim().toLowerCase();
    return (state.category==='all'||ev.category===state.category) &&
      (!state.focus||['vegan','animal-rights','plant-based'].includes(ev.category)) &&
      (!q||[ev.title,ev.description,ev.advocacyPrompt,ev.region,DATA.categories[ev.category]].some(s=>s.toLowerCase().includes(q)));
  }
  function matching(events){
    return events.filter(ev => (state.month==='all'||ev.month===Number(state.month)) && passesFilters(ev));
  }
  function render(){
    const events=matching(buildEvents(state.year));
    const root=$('#month-groups');root.replaceChildren();
    const count=events.length;
    $('#status').textContent=`${count} observance${count===1?'':'s'} · ${state.year}`;
    $('#year-value').textContent=state.year;
    $('#no-results').hidden=count!==0;
    for(let m=1;m<=12;m++){
      let arr=events.filter(ev=>ev.month===m);
      if(!arr.length) continue;
      arr.sort((a,b)=>(a.start?.getTime()??Infinity)-(b.start?.getTime()??Infinity)||a.title.localeCompare(b.title));
      const sec=elem('section','month-section');sec.id='month-'+m;
      const head=elem('div','month-heading');head.append(elem('h2','',MONTHS[m-1]));head.append(elem('span','month-count',`${arr.length} event${arr.length===1?'':'s'}`));sec.append(head);
      const grid=elem('div','card-grid');arr.forEach(ev=>grid.append(eventCard(ev)));sec.append(grid);
      root.append(sec);
    }
    const nav=$('#month-picker');
    nav.querySelectorAll('button').forEach(btn=>{
      const selected=btn.dataset.month===String(state.month);
      btn.classList.toggle('selected',selected);
      btn.setAttribute('aria-pressed',String(selected));
    });
    $('#focus-toggle').setAttribute('aria-pressed',String(state.focus));
    $('#focus-toggle').classList.toggle('selected',state.focus);
    showUpcoming();
    showTodayFeature();
    renderMonthGrid();
  }
  function setGridMonth(year, month, chooseToday=false){
    if(year<2020 || year>2100) return;
    state.year=year;
    state.gridMonth=month;
    // Keep the detail directory in step with the month currently being viewed.
    state.month=String(month);
    state.selectedDay=chooseToday && year===today.getFullYear() && month===today.getMonth()+1 ? today.getDate() : null;
    render();
  }
  function moveGridMonth(offset){
    const next=new Date(state.year,state.gridMonth-1+offset,1);
    setGridMonth(next.getFullYear(),next.getMonth()+1);
  }
  function renderMonthGrid(){
    const month=state.gridMonth, year=state.year;
    const first=new Date(year,month-1,1);
    const monthLabel=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(first);
    $('#advcal-grid-heading').textContent=monthLabel;
    $('#advcal-day-grid').setAttribute('aria-label',monthLabel+' advocacy dates');
    $('#advcal-grid-prev').disabled=(year===2020 && month===1);
    $('#advcal-grid-next').disabled=(year===2100 && month===12);
    const monthEvents=buildEvents(year).filter(ev=>ev.month===month && passesFilters(ev));
    const monthly=monthEvents.filter(ev=>ev.rule.type==='month');
    const dayEvents=new Map();
    for(const ev of monthEvents){
      if(!ev.start || ev.rule.type==='month' || ev.start.getMonth()+1!==month || ev.start.getFullYear()!==year) continue;
      const day=ev.start.getDate();
      if(!dayEvents.has(day)) dayEvents.set(day,[]);
      dayEvents.get(day).push(ev);
    }
    const campaignWrap=$('#advcal-month-campaigns');
    campaignWrap.replaceChildren();
    campaignWrap.hidden=monthly.length===0;
    if(monthly.length){
      campaignWrap.append(elem('span','advcal-month-campaign-label','All month'));
      for(const ev of monthly){
        const b=elem('button','advcal-month-campaign',`${ICONS[ev.category]||'🌱'} ${ev.title} →`);
        b.type='button';b.onclick=()=>openEvent(ev.id,true,year);
        campaignWrap.append(b);
      }
    }
    const grid=$('#advcal-day-grid'); grid.replaceChildren();
    const firstWeekday=first.getDay();
    const lastDay=new Date(year,month,0).getDate();
    const total=Math.ceil((firstWeekday+lastDay)/7)*7;
    for(let index=0;index<total;index++){
      const day=index-firstWeekday+1;
      const date=new Date(year,month-1,day);
      if(day<1 || day>lastDay){
        const outside=elem('span','advcal-day advcal-outside-day',String(date.getDate()));
        outside.setAttribute('aria-hidden','true');grid.append(outside);continue;
      }
      const events=dayEvents.get(day)||[];
      const cell=elem('button','advcal-day');cell.type='button';
      cell.dataset.day=String(day);
      cell.classList.toggle('advcal-day-holiday',events.length>0);
      cell.classList.toggle('advcal-day-today',year===today.getFullYear() && month===today.getMonth()+1 && day===today.getDate());
      cell.classList.toggle('advcal-day-selected',state.selectedDay===day);
      cell.setAttribute('aria-pressed',String(state.selectedDay===day));
      const readableDate=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date);
      cell.setAttribute('aria-label',`${readableDate}. ${events.length ? events.map(ev=>ev.title).join('; ') : 'No date-specific observance'}${monthly.length ? '. All month: '+monthly.map(ev=>ev.title).join('; ') : ''}`);
      const num=elem('span','advcal-date-number',String(day));cell.append(num);
      if(year===today.getFullYear() && month===today.getMonth()+1 && day===today.getDate())cell.append(elem('span','advcal-date-today-label','Today'));
      if(events.length){
        const marks=elem('span','advcal-event-marks');
        events.slice(0,2).forEach(ev=>{
          const short=elem('span','advcal-event-mark',ev.title);
          short.dataset.category=ev.category;
          marks.append(short);
        });
        if(events.length>2) marks.append(elem('span','advcal-event-more',`+${events.length-2} more`));
        cell.append(marks);
        const dots=elem('span','advcal-date-dots');
        events.slice(0,3).forEach(ev=>{const dot=elem('i','advcal-date-dot');dot.dataset.category=ev.category;dot.setAttribute('aria-hidden','true');dots.append(dot);});
        if(events.length>3)dots.append(elem('span','advcal-dot-more','+'));
        cell.append(dots);
      }
      cell.onclick=()=>{
        state.selectedDay=day;
        renderMonthGrid();
        if(window.matchMedia?.('(max-width:650px)').matches) requestAnimationFrame(()=>$('#advcal-day-details').scrollIntoView({behavior:'smooth',block:'nearest'}));
      };
      grid.append(cell);
    }
    const detail=$('#advcal-day-details');detail.hidden=!state.selectedDay;
    if(!state.selectedDay)return;
    const selectedDate=new Date(year,month-1,state.selectedDay);
    $('#advcal-day-title').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(selectedDate);
    const selectedEvents=dayEvents.get(state.selectedDay)||[];
    $('#advcal-day-count').textContent=`${selectedEvents.length} date-specific observance${selectedEvents.length===1?'':'s'}`;
    const detailCards=$('#advcal-day-events');detailCards.replaceChildren(...selectedEvents.map(ev=>{
      const card=eventCard(ev);card.removeAttribute('id');return card;
    }));
    const empty=$('#advcal-day-empty');
    empty.hidden=selectedEvents.length!==0;
    empty.textContent=monthly.length ? `No date-specific observances listed. ${monthly.map(ev=>ev.title).join(' · ')} continues throughout ${MONTHS[month-1]}.` : 'No observances listed on this date. Choose a highlighted day to explore an advocacy topic.';
  }

  function showTodayFeature(){
    // The featured observance always reflects the visitor's *actual local date*,
    // independent of calendar filters, search terms, or the selected browsing year.
    const todayStart = new Date(today.getFullYear(),today.getMonth(),today.getDate());
    const tomorrow = new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
    const events = buildEvents(today.getFullYear()).concat(buildEvents(today.getFullYear()+1));
    const priorities = {'vegan':0,'animal-rights':1,'plant-based':2,'animal-awareness':3,'environment':4};
    const rank = (a,b) => (priorities[a.category]??5)-(priorities[b.category]??5) || a.title.localeCompare(b.title);
    const active = events.filter(e=>e.start && e.end && e.start<tomorrow && e.end>todayStart);
    const daily = active.filter(e=>e.rule.type!=='month').sort(rank);
    const monthly = active.filter(e=>e.rule.type==='month').sort(rank);
    const upcoming = events.filter(e=>e.start && e.start>=tomorrow).sort((a,b)=>a.start-b.start || rank(a,b));
    const chosen = daily[0] || monthly[0] || upcoming[0];
    const feature=$('#advcal-feature');
    feature.hidden=!chosen;
    if(!chosen) return;
    const dateFormatter = (date, options) => new Intl.DateTimeFormat('en-US',options).format(date);
    const mode=daily.length?'today':monthly.length?'month':'upcoming';
    $('#advcal-feature-kicker').textContent = mode==='today' ? 'Today’s observance' : mode==='month' ? 'This month in advocacy' : 'Next observance';
    $('#advcal-feature-date').textContent = mode==='upcoming'
      ? dateFormatter(chosen.start,{month:'long',day:'numeric',year:'numeric'})
      : mode==='month' ? dateFormatter(todayStart,{month:'long',year:'numeric'})
      : dateFormatter(todayStart,{weekday:'long',month:'long',day:'numeric'});
    $('#advcal-feature-title').textContent=chosen.title;
    $('#advcal-feature-description').textContent=chosen.description;
    const context=[];
    if(mode==='today' && daily.length>1) context.push('Also today: '+daily.slice(1,3).map(e=>e.title).join(' · '));
    if(mode==='today' && monthly.length) context.push('This month: '+monthly.slice(0,2).map(e=>e.title).join(' · '));
    if(mode==='month') context.push('There’s no separate day-specific observance listed for today.');
    if(mode==='upcoming') context.push('No observance is listed for today or the current month.');
    if(mode==='month' && upcoming.length) context.push('Up next: '+dateFormatter(upcoming[0].start,{month:'short',day:'numeric'})+' · '+upcoming[0].title);
    $('#advcal-feature-context').textContent=context.join('  •  ');
    $('#advcal-feature-action').textContent=mode==='upcoming'?'See upcoming observance →':'See observance →';
    $('#advcal-feature-action').onclick=()=>openEvent(chosen.id,true,chosen.start.getFullYear());
  }

  function showUpcoming(){
    const all=buildEvents(today.getFullYear()).concat(buildEvents(today.getFullYear()+1));
    const tomorrow = new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
    const upcoming=all.filter(e=>e.start && e.start>=tomorrow).sort((a,b)=>a.start-b.start).slice(0,3);
    $('#coming-up').replaceChildren(...upcoming.map(ev=>{
      const link=elem('a','next-item');
      link.href=`#month-${ev.month}`;
      link.append(elem('strong','',ev.title));
      link.append(elem('span','',`${dateText(ev)} ${ev.rule.type==='month'?'· Month-long':''}`));
      link.addEventListener('click', event=>{
        event.preventDefault();
        // Make sure the destination exists even when filters previously hid it.
        state.year=ev.start.getFullYear();
        state.month='all';
        state.category='all';
        state.query='';
        state.focus=false;
        $('#search').value='';
        $('#category').value='all';
        render();
        requestAnimationFrame(()=>document.querySelector(`#month-${ev.month}`)?.scrollIntoView({behavior:'smooth'}));
      });
      return link;
    }));
  }
  function setupControls(){
    $('#advcal-grid-prev').onclick=()=>moveGridMonth(-1);
    $('#advcal-grid-next').onclick=()=>moveGridMonth(1);
    $('#advcal-grid-today').onclick=()=>{today=new Date();setGridMonth(today.getFullYear(),today.getMonth()+1,true);};
    $('#month-picker').append(...[{id:'all',text:'All months'},...MONTHS.map((m,i)=>({id:String(i+1),text:m.slice(0,3)}))].map(({id,text})=>{
      const b=elem('button','month-button',text);b.type='button';b.dataset.month=id;
      b.onclick=()=>{state.month=id;if(id!=='all'){state.gridMonth=Number(id);state.selectedDay=state.year===today.getFullYear() && state.gridMonth===today.getMonth()+1 ? today.getDate():null;}render();};return b;
    }));
    const cat=$('#category');cat.append(new Option('All categories','all'));
    Object.entries(DATA.categories).forEach(([v,label])=>cat.add(new Option(label,v)));
    cat.onchange=()=>{state.category=cat.value;render();};
    $('#search').oninput=e=>{state.query=e.target.value;render();};
    $('#focus-toggle').onclick=()=>{state.focus=!state.focus;render();};
    $('#prev-year').onclick=()=>{state.year=Math.max(2020,state.year-1);state.selectedDay=null;render();};
    $('#next-year').onclick=()=>{state.year=Math.min(2100,state.year+1);state.selectedDay=null;render();};
    $('#export-ics').onclick=downloadICS;

  }
  function escapeICS(str){return String(str).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
  function foldICS(line){
    // Fold according to RFC 5545's 75-octet physical line limit (UTF-8 aware).
    let out='',chunk='',bytes=0;
    for(const ch of line){
      const n=new TextEncoder().encode(ch).length;
      if(bytes+n>75){out+=chunk+'\r\n ';chunk='';bytes=1;}
      chunk+=ch;bytes+=n;
    }
    return out+chunk;
  }
  function downloadICS(){
    const selected=matching(buildEvents(state.year));
    const available=selected.filter(e=>e.start&&e.end);
    const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Go Vegan//Advocacy Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Go Vegan Advocacy Calendar'];
    for(const ev of available){
      lines.push('BEGIN:VEVENT',`UID:${ev.id}-${state.year}@govegan-calendar`,
        `DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${isoLocal(ev.start).replace(/-/g,'')}`,
        `DTEND;VALUE=DATE:${isoLocal(ev.end).replace(/-/g,'')}`,
        `SUMMARY:${escapeICS(ev.title)}`,
        `DESCRIPTION:${escapeICS(ev.description+' Discussion prompt: '+ev.advocacyPrompt)}`,
        `URL:${ev.source.url}`,
        `CATEGORIES:${escapeICS(DATA.categories[ev.category])}`,
        'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob=new Blob([lines.map(foldICS).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`go-vegan-advocacy-calendar-${state.year}.ics`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    const skipped=selected.length-available.length;
    $('#export-status').textContent=skipped?`Exported ${available.length} events. ${skipped} organizer-set event(s) excluded until a date is confirmed.`:`Exported ${available.length} calendar events.`;
  }
  // Exposed for lightweight automated tests without polluting the global API used by the app.
  if(typeof window!=='undefined')window.GoVeganCalendarDates={resolveDate,nthWeekday,lastWeekday,buildEvents};
  function openEvent(id, shouldScroll=true, eventYear=today.getFullYear()){
    const linked=DATA.observances.find(event=>event.id===id);
    if(!linked) return;
    state.year=eventYear;state.month=String(linked.rule.month);state.gridMonth=linked.rule.month;
    const linkedDate=resolveDate(linked.rule,eventYear);state.selectedDay=linkedDate && linked.rule.type!=='month' ? linkedDate.getDate() : null;
    state.category='all';state.query='';state.focus=false;
    $('#search').value='';$('#category').value='all';render();
    const target=document.getElementById('event-'+id);
    if(target){
      rootEl.querySelectorAll('.spotlight-target').forEach(el=>el.classList.remove('spotlight-target'));
      target.classList.add('spotlight-target');
      if(shouldScroll)requestAnimationFrame(()=>requestAnimationFrame(()=>target.scrollIntoView({block:'center',behavior:'smooth'})));
    }
  }
  // An open tab crossing midnight (or waking up tomorrow) must never show yesterday.
  function refreshToday(){
    const now=new Date();
    if(!sameDay(now,today)){const wasFollowingToday=state.year===today.getFullYear() && state.gridMonth===today.getMonth()+1 && state.selectedDay===today.getDate();today=now;if(wasFollowingToday && state.year===now.getFullYear() && state.gridMonth===now.getMonth()+1)state.selectedDay=now.getDate();render();}
  }
  function scheduleMidnightRefresh(){
    const now=new Date();
    const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    setTimeout(()=>{refreshToday();scheduleMidnightRefresh();},Math.max(1000,nextMidnight-now+200));
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshToday();});
  window.addEventListener('focus',refreshToday);
  scheduleMidnightRefresh();
  setupControls();render();
  window.addEventListener('go-vegan-calendar-open',event=>openEvent(event.detail?.id));
  if(linkedEvent) {
    openEvent(linkedEvent.id,false);
    // The app's initial Alpine route initializes asynchronously.
    setTimeout(()=>{if(window.location.hash.startsWith('#/calendar/')) document.getElementById('event-'+linkedEvent.id)?.scrollIntoView({block:'center'});},450);
  }
})();
