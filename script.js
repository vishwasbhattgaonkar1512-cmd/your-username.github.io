document.addEventListener('DOMContentLoaded', () => {
  // Reveal animations using IntersectionObserver with staggered delays
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  revealEls.forEach((el, i) => el.style.setProperty('--delay', `${i * 90}ms`));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));

  // Animate skill bars when skills section becomes visible
  function animateSkillBars(container){
    container.querySelectorAll('.bar').forEach(b => {
      if (b.dataset.animated) return;
      const v = parseInt(b.getAttribute('data-value') || '60', 10);
      const inner = document.createElement('span');
      inner.style.position = 'absolute';
      inner.style.left = '0';
      inner.style.top = '0';
      inner.style.bottom = '0';
      inner.style.width = '0%';
      inner.style.background = 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))';
      inner.style.borderRadius = '8px';
      inner.style.transition = 'width 1.1s cubic-bezier(.2,.9,.2,1)';
      inner.setAttribute('aria-hidden','true');
      b.appendChild(inner);
      // animate with slight delay per bar for a layered effect
      setTimeout(()=> requestAnimationFrame(()=>{ inner.style.width = v + '%'; }), 80);
      b.dataset.animated = 'true';
    });
  }

  // Render a lightweight SVG scatter plot of skills inside Skills tab
  function renderSkillScatter(panel){
    const container = panel.querySelector('.scatter-container');
    if (!container || container.dataset.rendered) return;
    const cards = Array.from(panel.querySelectorAll('.skill-card'));
    const skills = [];
    cards.forEach((card, gi) => {
      const group = (card.querySelector('h3')||{textContent:''}).textContent.trim();
      card.querySelectorAll('.skill').forEach(s => {
        const label = (s.querySelector('span')||{textContent:''}).textContent.trim();
        const val = parseInt(s.querySelector('.bar')?.dataset.value || '0', 10) || 0;
        skills.push({label, val, group});
      });
    });
    if (!skills.length) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    const width = Math.max(600, container.clientWidth || 700);
    const height = 200;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // defs + gradient
    const defs = document.createElementNS(svgNS, 'defs');
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id','skillGrad'); grad.setAttribute('x1','0%'); grad.setAttribute('x2','100%');
    const stop1 = document.createElementNS(svgNS,'stop'); stop1.setAttribute('offset','0%'); stop1.setAttribute('stop-color','var(--accent-blue)');
    const stop2 = document.createElementNS(svgNS,'stop'); stop2.setAttribute('offset','100%'); stop2.setAttribute('stop-color','var(--accent-pink)');
    grad.appendChild(stop1); grad.appendChild(stop2); defs.appendChild(grad); svg.appendChild(defs);

    // compute groups
    const groupNames = [...new Set(skills.map(s=>s.group))];
    const leftPad = 72; const rightPad = 20; const topPad = 18; const bottomPad = 18;
    const plotW = width - leftPad - rightPad; const plotH = height - topPad - bottomPad;

    // group labels on left
    groupNames.forEach((g, idx) => {
      const y = topPad + (idx + 0.5) * (plotH / Math.max(1, groupNames.length));
      const text = document.createElementNS(svgNS,'text');
      text.setAttribute('x', 12); text.setAttribute('y', y+4); text.setAttribute('fill','var(--muted)'); text.setAttribute('font-size','12');
      text.textContent = g;
      svg.appendChild(text);
    });

    // draw axis line
    const axis = document.createElementNS(svgNS,'line');
    axis.setAttribute('x1', leftPad); axis.setAttribute('y1', height - bottomPad); axis.setAttribute('x2', width - rightPad); axis.setAttribute('y2', height - bottomPad);
    axis.setAttribute('stroke','rgba(255,255,255,0.04)'); axis.setAttribute('stroke-width','1'); svg.appendChild(axis);

    // x ticks
    [0,25,50,75,100].forEach(t => {
      const x = leftPad + (t/100) * plotW;
      const tx = document.createElementNS(svgNS,'text'); tx.setAttribute('x', x); tx.setAttribute('y', height - 4); tx.setAttribute('fill','var(--muted)'); tx.setAttribute('font-size','10'); tx.setAttribute('text-anchor','middle'); tx.textContent = t + '%'; svg.appendChild(tx);
    });

    skills.forEach((s, i) => {
      const groupIndex = groupNames.indexOf(s.group);
      const x = leftPad + (s.val/100) * plotW;
      const band = plotH / Math.max(1, groupNames.length);
      const jitter = (Math.random() - 0.5) * (band * 0.4);
      const y = topPad + groupIndex * band + band/2 + jitter;
      const c = document.createElementNS(svgNS,'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0); c.setAttribute('fill','url(#skillGrad)'); c.setAttribute('stroke','rgba(0,0,0,0.06)'); c.setAttribute('data-label', s.label); c.setAttribute('data-val', s.val);
      c.style.opacity = '0'; c.classList.add('scatter-point'); svg.appendChild(c);
      const title = document.createElementNS(svgNS,'title'); title.textContent = `${s.label} — ${s.val}% (${s.group})`; c.appendChild(title);
      // animate appearance
      setTimeout(()=>{ c.style.transition = 'opacity .36s ease, r .36s ease'; c.style.opacity = '1'; c.setAttribute('r', 7); }, i * 60);
    });

    // create tooltip element for accessibility + hover
    const tooltip = document.createElement('div');
    tooltip.className = 'svg-tooltip';
    tooltip.setAttribute('role','status');
    tooltip.style.display = 'none';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    // attach simple accessible interactions for points
    svg.querySelectorAll('.scatter-point').forEach(pt => {
      const label = pt.getAttribute('data-label') || pt.querySelector('title')?.textContent || '';
      pt.setAttribute('tabindex', '0');
      pt.setAttribute('role', 'button');
      pt.setAttribute('aria-label', label + ' — press Enter for details');
      pt.addEventListener('mouseenter', (e)=>{
        tooltip.textContent = label; tooltip.style.display = 'block'; tooltip.classList.add('visible');
      });
      pt.addEventListener('mousemove', (e)=>{
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (e.clientY - rect.top + 12) + 'px';
      });
      pt.addEventListener('mouseleave', ()=>{ tooltip.style.display='none'; tooltip.classList.remove('visible'); });
      pt.addEventListener('focus', (e)=>{
        const bbox = pt.getBoundingClientRect(); const rect = container.getBoundingClientRect();
        tooltip.textContent = label; tooltip.style.display = 'block'; tooltip.classList.add('visible');
        tooltip.style.left = (bbox.left - rect.left + 12) + 'px'; tooltip.style.top = (bbox.top - rect.top - 6) + 'px';
      });
      pt.addEventListener('blur', ()=>{ tooltip.style.display='none'; tooltip.classList.remove('visible'); });
      pt.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alert(label); } if (e.key === 'Escape') { pt.blur(); } });
    });

    container.appendChild(svg);
    container.dataset.rendered = 'true';
  }

  // Render corporate-style project scatter chart inside Projects tab
  function renderProjectScatter(panel){
    const container = panel.querySelector('.project-scatter-container');
    if (!container || container.dataset.rendered) return;

    const projects = [
      {id:'NOVA', label:'NOVA — NextGen Virtual Assistant', domain:'AI/ML', progress:92, impact:94, effort:90, repo:'', desc:'Flagship AI-powered virtual assistant focusing on productivity, modular NLP pipelines, and optimizations for real-world use.'},
      {id:'AIsmartAdvisory', label:'AIsmartAdvisory', domain:'AI/ML', progress:75, impact:78, effort:68, repo:'', desc:'AI-driven advisory system providing recommendations and decision support using ML pipelines and model interpretability.'},
      {id:'SecuraX', label:'SecuraX — Login System', domain:'Cybersecurity', progress:60, impact:66, effort:60, repo:'', desc:'Secure authentication and monitoring solution with login-attempt tracking, threat awareness, and secure credential handling.'},
      {id:'AmazonEDA', label:'Amazon-Prime-EDA-Vishwas', domain:'Data Analytics', progress:68, impact:60, effort:58, repo:'', desc:'Exploratory Data Analysis on Amazon Prime dataset: cleaning, preprocessing, visualization, and business insight extraction.'},
      {id:'BrainTest', label:'Brain Test Game', domain:'Software Engineering', progress:48, impact:40, effort:35, repo:'', desc:'Interactive logic-based game emphasizing algorithmic thinking, event handling, and a clean responsive UI for engagement.'}
    ];

    const colorMap = {
      'AI/ML':'var(--accent-pink)',
      'Cybersecurity':'var(--accent-red)',
      'Data Analytics':'var(--accent-green)',
      'Software Engineering':'var(--accent-blue)'
    };

    const svgNS = 'http://www.w3.org/2000/svg';
    const width = Math.max(700, container.clientWidth || 700);
    const height = 240;
    const svg = document.createElementNS(svgNS,'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('preserveAspectRatio','xMidYMid meet');

    const leftPad = 64, rightPad = 24, topPad = 20, bottomPad = 44;
    const plotW = width - leftPad - rightPad, plotH = height - topPad - bottomPad;

    // axes lines
    const axisX = document.createElementNS(svgNS,'line'); axisX.setAttribute('x1', leftPad); axisX.setAttribute('y1', height - bottomPad); axisX.setAttribute('x2', width - rightPad); axisX.setAttribute('y2', height - bottomPad); axisX.setAttribute('stroke','rgba(255,255,255,0.04)'); axisX.setAttribute('stroke-width','1'); svg.appendChild(axisX);
    const axisY = document.createElementNS(svgNS,'line'); axisY.setAttribute('x1', leftPad); axisY.setAttribute('y1', topPad); axisY.setAttribute('x2', leftPad); axisY.setAttribute('y2', height - bottomPad); axisY.setAttribute('stroke','rgba(255,255,255,0.04)'); axisY.setAttribute('stroke-width','1'); svg.appendChild(axisY);

    // axis labels
    const lblX = document.createElementNS(svgNS,'text'); lblX.setAttribute('x', leftPad + plotW/2); lblX.setAttribute('y', height - 6); lblX.setAttribute('fill','var(--muted)'); lblX.setAttribute('font-size','12'); lblX.setAttribute('text-anchor','middle'); lblX.textContent = 'Learning Progress →'; svg.appendChild(lblX);
    const lblY = document.createElementNS(svgNS,'text'); lblY.setAttribute('transform', `translate(12 ${topPad + plotH/2}) rotate(-90)`); lblY.setAttribute('fill','var(--muted)'); lblY.setAttribute('font-size','12'); lblY.setAttribute('text-anchor','middle'); lblY.textContent = 'Complexity / Impact'; svg.appendChild(lblY);

    // x ticks
    [0,25,50,75,100].forEach(t => { const x = leftPad + (t/100)*plotW; const tx = document.createElementNS(svgNS,'text'); tx.setAttribute('x', x); tx.setAttribute('y', height - bottomPad + 16); tx.setAttribute('fill','var(--muted)'); tx.setAttribute('font-size','10'); tx.setAttribute('text-anchor','middle'); tx.textContent = t + '%'; svg.appendChild(tx); });

    // plot points
    projects.forEach((p,i)=>{
      const cx = leftPad + (p.progress/100) * plotW;
      const cy = topPad + (1 - (p.impact/100)) * plotH; // invert y: high impact -> higher on chart
      const r = Math.max(6, Math.min(18, Math.round((p.effort/100) * 20)));
      const circle = document.createElementNS(svgNS,'circle');
      circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',0);
      circle.setAttribute('fill',colorMap[p.domain]||'var(--accent-soft)'); circle.setAttribute('stroke','rgba(0,0,0,0.12)');
      circle.setAttribute('data-name',p.label); circle.setAttribute('data-index', String(i)); circle.setAttribute('data-repo', p.repo || '');
      circle.classList.add('project-point'); circle.style.opacity='0'; svg.appendChild(circle);
      const title = document.createElementNS(svgNS,'title'); title.textContent = `${p.label} — ${p.domain} — Progress:${p.progress}% Impact:${p.impact}%`; circle.appendChild(title);
      setTimeout(()=>{ circle.style.transition='opacity .36s ease, r .36s ease, transform .36s ease'; circle.style.opacity='1'; circle.setAttribute('r', r); }, i*80);

      // small label near point
      const txt = document.createElementNS(svgNS,'text'); txt.setAttribute('x', cx + r + 6); txt.setAttribute('y', cy + 4); txt.setAttribute('fill','rgba(230,238,248,0.9)'); txt.setAttribute('font-size','11'); txt.textContent = p.id; txt.style.opacity='0'; svg.appendChild(txt);
      setTimeout(()=>{ txt.style.transition='opacity .36s ease'; txt.style.opacity='1'; }, i*120);
    });

    // legend
    const legendX = width - rightPad - 180; const legendY = topPad + 6;
    const legend = document.createElementNS(svgNS,'g'); legend.setAttribute('transform', `translate(${legendX} ${legendY})`);
    const domains = ['AI/ML','Cybersecurity','Data Analytics','Software Engineering'];
    domains.forEach((d,idx)=>{
      const gy = idx*18;
      const sw = document.createElementNS(svgNS,'rect'); sw.setAttribute('x',0); sw.setAttribute('y',gy); sw.setAttribute('width',12); sw.setAttribute('height',12); sw.setAttribute('rx',3); sw.setAttribute('fill', colorMap[d]||'var(--muted)'); legend.appendChild(sw);
      const tx = document.createElementNS(svgNS,'text'); tx.setAttribute('x',18); tx.setAttribute('y',gy+10); tx.setAttribute('fill','var(--muted)'); tx.setAttribute('font-size','11'); tx.textContent = d; legend.appendChild(tx);
    });
    svg.appendChild(legend);

    // tooltip for project points
    const tooltip = document.createElement('div');
    tooltip.className = 'svg-tooltip'; tooltip.setAttribute('role','status'); tooltip.style.display='none';
    // hover card (richer actions)
    const hoverCard = document.createElement('div'); hoverCard.className = 'hover-card'; hoverCard.style.display = 'none';
    hoverCard.innerHTML = `<div class="title"></div><div class="desc muted" style="margin-top:6px;font-size:13px"></div><div class="actions"></div>`;
    container.style.position = 'relative'; container.appendChild(tooltip); container.appendChild(hoverCard);

    // persist projects for export handlers
    container._projects = projects;

    // attach interactions
    svg.querySelectorAll('.project-point').forEach(pt => {
      const idx = parseInt(pt.getAttribute('data-index') || '0', 10);
      const p = projects[idx] || {};
      const name = p.label || pt.getAttribute('data-name') || '';
      pt.setAttribute('tabindex','0'); pt.setAttribute('role','button'); pt.setAttribute('aria-label', name + ' — press Enter for details');
      pt.addEventListener('mouseenter', (e)=>{ tooltip.textContent = name; tooltip.style.display='block'; tooltip.classList.add('visible'); });
      pt.addEventListener('mousemove', (e)=>{ const rect = container.getBoundingClientRect(); tooltip.style.left = (e.clientX - rect.left + 12) + 'px'; tooltip.style.top = (e.clientY - rect.top + 12) + 'px'; });
      pt.addEventListener('mouseleave', ()=>{ tooltip.style.display='none'; tooltip.classList.remove('visible'); });
      pt.addEventListener('focus', ()=>{ const bbox = pt.getBoundingClientRect(); const rect = container.getBoundingClientRect(); tooltip.textContent = name; tooltip.style.display='block'; tooltip.style.left = (bbox.left - rect.left + 12) + 'px'; tooltip.style.top = (bbox.top - rect.top - 6) + 'px'; tooltip.classList.add('visible'); });
      pt.addEventListener('blur', ()=>{ tooltip.style.display='none'; tooltip.classList.remove('visible'); });
      pt.addEventListener('click', (e)=>{
        // show hoverCard with actions
        const rect = container.getBoundingClientRect(); hoverCard.style.display='block'; hoverCard.querySelector('.title').textContent = name; hoverCard.querySelector('.desc').textContent = p.desc ? p.desc : `${p.domain || ''} — Progress ${p.progress || ''}% • Impact ${p.impact || ''}%`;
        const actions = hoverCard.querySelector('.actions'); actions.innerHTML = '';
        const copyBtn = document.createElement('button'); copyBtn.textContent = 'Copy name'; copyBtn.addEventListener('click', ()=>{ navigator.clipboard?.writeText(name); copyBtn.textContent = 'Copied'; setTimeout(()=>copyBtn.textContent='Copy name',1200); }); actions.appendChild(copyBtn);
        if (p.repo){ const repoBtn = document.createElement('button'); repoBtn.textContent = 'Open repo'; repoBtn.addEventListener('click', ()=>{ window.open(p.repo,'_blank'); }); actions.appendChild(repoBtn); }
        const closeBtn = document.createElement('button'); closeBtn.textContent = 'Close'; closeBtn.addEventListener('click', ()=>{ hoverCard.style.display='none'; }); actions.appendChild(closeBtn);
        // position near click
        const left = (e.clientX - rect.left + 12); const top = (e.clientY - rect.top + 12);
        hoverCard.style.left = Math.min(rect.width - 180, left) + 'px'; hoverCard.style.top = Math.max(6, top) + 'px';
      });
      pt.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pt.click(); } if (e.key === 'Escape') { pt.blur(); hoverCard.style.display='none'; } });
    });

    container.appendChild(svg);
    container.dataset.rendered = 'true';

    // Attach export handlers to toolbar buttons (if present)
    const pngBtn = document.getElementById('export-project-png');
    const csvBtn = document.getElementById('export-project-csv');
    function downloadURI(uri, name){ const a = document.createElement('a'); a.href = uri; a.download = name || 'download'; document.body.appendChild(a); a.click(); a.remove(); }

    function exportSVGToPNG(svgEl, filename='projects.png'){
      try{
        const serializer = new XMLSerializer(); let svgStr = serializer.serializeToString(svgEl);
        if(!svgStr.match(/^<svg[^>]+xmlns="http/i)) svgStr = svgStr.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        const svgBlob = new Blob([svgStr], {type:'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = function(){
          const canvas = document.createElement('canvas');
          const vb = svgEl.getAttribute('viewBox');
          if (vb){ const parts = vb.split(' '); canvas.width = parseInt(parts[2],10); canvas.height = parseInt(parts[3],10); } else { canvas.width = svgEl.clientWidth || 800; canvas.height = svgEl.clientHeight || 600; }
          const ctx = canvas.getContext('2d'); ctx.fillStyle = '#071224'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          const png = canvas.toDataURL('image/png'); downloadURI(png, filename); URL.revokeObjectURL(url);
        };
        img.onerror = ()=>{ URL.revokeObjectURL(url); alert('Export failed'); };
        img.src = url;
      }catch(e){ console.error(e); alert('Export failed'); }
    }

    function exportProjectsCSV(){
      const rows = ['id,label,domain,progress,impact,effort'];
      (container._projects||[]).forEach(p=>{ rows.push([p.id, `"${p.label.replace(/"/g,'""')}"`, p.domain, p.progress, p.impact, p.effort].join(',')); });
      const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob); downloadURI(url,'projects.csv'); setTimeout(()=>URL.revokeObjectURL(url),2000);
    }

    if (pngBtn){ pngBtn.addEventListener('click', ()=>{ const svgEl = container.querySelector('svg'); if (svgEl) exportSVGToPNG(svgEl,'projects.png'); }); }
    if (csvBtn){ csvBtn.addEventListener('click', ()=> exportProjectsCSV()); }
  }

  // Gentle floating icons (decorative): add tiny translateY animation
  document.querySelectorAll('.project').forEach((p, i) => {
    p.style.animation = `float 6s ease-in-out ${i * 120}ms infinite`;
  });

  // CSS keyframe for float added dynamically for broad support
  const style = document.createElement('style');
  style.innerHTML = `@keyframes float {0%{transform:translateY(0)}50%{transform:translateY(-4px)}100%{transform:translateY(0)}}`;
  document.head.appendChild(style);

  // Tabs: switch visible tab-panel and trigger animations
  const tabButtons = document.querySelectorAll('.tab-btn');
  // create tab indicator element
  const tabsContainer = document.querySelector('.tabs');
  let indicator = document.createElement('div');
  indicator.className = 'tab-indicator';
  tabsContainer.appendChild(indicator);

  function updateIndicator(activeBtn){
    const rect = activeBtn.getBoundingClientRect();
    const parentRect = tabsContainer.getBoundingClientRect();
    const width = rect.width - 8; // some padding
    const left = rect.left - parentRect.left + 4;
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translateX(${left}px)`;
    indicator.style.opacity = '1';
  }
  // Add keyboard accessibility (ArrowLeft/ArrowRight, Home/End)
  function focusTabIndex(currentIndex, delta){
    const total = tabButtons.length;
    let next = (currentIndex + delta + total) % total;
    tabButtons[next].focus();
  }
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b=>{ b.classList.remove('is-active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-selected','true');

      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.id === target){
          panel.removeAttribute('hidden');
          // animate panel with class
          panel.classList.add('active');
          panel.querySelectorAll('.reveal').forEach((r, i)=>{ r.style.setProperty('--delay', `${i*80}ms`); r.classList.add('is-visible'); });
          if (panel.querySelector('.bar')) animateSkillBars(panel);
            // render scatter for skills when panel activated
            renderSkillScatter(panel);
            // render project scatter if switching to Projects
            if (panel.id === 'tab-projects' || panel.querySelector('.project-scatter-container')) renderProjectScatter(panel);
        } else {
          panel.classList.remove('active');
          panel.setAttribute('hidden','');
        }
      });
      // update indicator
      updateIndicator(btn);
    });

    btn.addEventListener('keydown', (e) => {
      const idx = Array.prototype.indexOf.call(tabButtons, btn);
      if (e.key === 'ArrowRight') { e.preventDefault(); focusTabIndex(idx, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusTabIndex(idx, -1); }
      if (e.key === 'Home') { e.preventDefault(); tabButtons[0].focus(); }
      if (e.key === 'End') { e.preventDefault(); tabButtons[tabButtons.length-1].focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });

  // Initialize: ensure first tab's reveal and skill animation state
  const initialActive = document.querySelector('.tab-btn.is-active');
  if (initialActive){
    const target = initialActive.getAttribute('data-target');
    const panel = document.getElementById(target);
    if (panel){ panel.querySelectorAll('.reveal').forEach(r=> r.classList.add('is-visible'));
      if (panel.querySelector('.bar')) animateSkillBars(panel);
        // initial scatter if starting on skills
        renderSkillScatter(panel);
        // initial project scatter if starting on projects
        if (panel.id === 'tab-projects' || panel.querySelector('.project-scatter-container')) renderProjectScatter(panel);
    }
    // position indicator on initial active
    updateIndicator(initialActive);
  }

  // If URL contains a hash requesting projects, open Projects tab so scatter is visible
  const hash = (location.hash || '').replace('#','').toLowerCase();
  if (hash === 'projects' || hash === 'tab-projects'){
    const btn = Array.from(tabButtons).find(b => (b.getAttribute('data-target')||'').toLowerCase() === 'tab-projects');
    if (btn) btn.click();
  }

  // Profile tilt: subtle 3D tilt based on mouse position
  const profile = document.querySelector('.profile-frame');
  if (profile){
    const img = profile.querySelector('.profile-img');
    profile.addEventListener('mousemove', (e)=>{
      const rect = profile.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotY = x * 8; // degrees
      const rotX = -y * 8;
      img.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    });
    profile.addEventListener('mouseleave', ()=>{ img.style.transform = ''; });
  }

  // Background parallax: update CSS vars for subtle movement
  document.addEventListener('mousemove', (e)=>{
    const mx = ((e.clientX / window.innerWidth) - 0.5) * 30; // px
    const my = ((e.clientY / window.innerHeight) - 0.5) * 20; // px
    document.documentElement.style.setProperty('--mx', `${mx}px`);
    document.documentElement.style.setProperty('--my', `${my}px`);
  });

  // Lightweight hover depth handled in CSS for profile image
});

