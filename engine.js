/**
 * QuizSpace — Engine v2
 * Now user-aware: pass 'howard' or 'myka' to initDashboard()
 * to filter the quiz registry.
 *
 * NOTE: window.QuizRegistry is now populated by fetch() in index.html
 * (loaded from the backend API) instead of individual script tags.
 * This file itself does not change — it still reads window.QuizRegistry
 * the same way it always did.
 *
 * --- IDENTIFICATION QUESTION SCHEMA ---
 *   {
 *     id: 1,
 *     type: 'identification',
 *     text: "What gas do plants absorb during photosynthesis?",
 *     answer: "carbon dioxide"          // single string  — OR —
 *     answer: ["co2", "carbon dioxide"] // array (any match = correct)
 *   }
 *
 * --- QUIZ REGISTRATION user FIELD ---
 *   user: 'howard'  → only shown in Howard's library
 *   user: 'myka'    → only shown in Myka's library
 *   (omit user)     → shown in BOTH libraries
 */

if (typeof window.QuizRegistry === 'undefined') {
    window.QuizRegistry = [];
}

const Engine = {
    originalPool: [],
    activeQuestions: [],
    activeModuleId: null,
    currentIdx: 0,
    answers: [],
    isInstantFeedback: false,
    activeUser: null, // 'howard' | 'myka'

    // ─── Correctness ─────────────────────────────────────────────────────────
    isCorrect(q, ans) {
        if (ans === null || ans === undefined) return false;
        if (q.type === 'identification') {
            const typed = String(ans).trim().toLowerCase();
            if (typed === '') return false;
            const accepted = Array.isArray(q.answer)
                ? q.answer.map(a => String(a).trim().toLowerCase())
                : [String(q.answer).trim().toLowerCase()];
            return accepted.includes(typed);
        }
        return ans === q.correct;
    },

    // ─── Dashboard ────────────────────────────────────────────────────────────
    initDashboard(user) {
        this.activeUser = user || null;
        const grid = document.getElementById('testGrid');
        if (!grid) return;

        const filtered = (window.QuizRegistry || []).filter(m => {
            if (!m.user) return true;           // no user field = shared
            return m.user === user;
        });

        const isHoward = user === 'howard';
        const accent = isHoward ? '#2563eb' : '#db2777';
        const accentLight = isHoward ? '#eff6ff' : '#fdf2f8';
        const accentText = isHoward ? '#1e3a8a' : '#831843';

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-3 text-center py-16 text-zinc-400">
                    <svg class="mx-auto mb-3 opacity-30" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 8 20 8"/></svg>
                    <p class="font-semibold">No quizzes yet</p>
                    <p class="text-sm mt-1">Add quizzes tagged for ${user} or shared (no user field).</p>
                </div>`;
            return;
        }

        grid.innerHTML = filtered.map(m => `
            <div class="test-card bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-xl hover:border-opacity-60 transition-all duration-300 group cursor-pointer" style="--hover-border: ${accent}" onclick="Engine.loadTest('${m.id}')">
                <div class="flex justify-between items-start mb-5">
                    <div class="p-3 rounded-xl" style="background:${accentLight}; color:${accent}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 8 20 8"/></svg>
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full" style="background:${accentLight};color:${accentText}">${m.questions.length} Qs</span>
                </div>
                <h3 class="font-display font-bold text-zinc-900 dark:text-white text-lg mb-1 leading-snug">${m.title}</h3>
                <p class="text-zinc-400 dark:text-zinc-500 text-sm mb-5 leading-relaxed">${m.desc}</p>
                <div class="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span class="text-xs font-semibold text-zinc-300 dark:text-zinc-600 uppercase tracking-wider">${m.duration ? m.duration + ' items' : m.questions.length + ' questions'}</span>
                    <span class="flex items-center gap-1.5 text-sm font-bold transition-all" style="color:${accent}">
                        Start
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                </div>
            </div>
        `).join('');

        // Hover border color via CSS var — add inline style approach
        document.querySelectorAll('.test-card').forEach(card => {
            card.addEventListener('mouseenter', () => card.style.borderColor = card.style.getPropertyValue('--hover-border') || accent);
            card.addEventListener('mouseleave', () => card.style.borderColor = '');
        });
    },

    // ─── Test Loading ─────────────────────────────────────────────────────────
    loadTest(id) {
        const module = window.QuizRegistry.find(m => m.id === id);
        if (!module) return;

        this.activeModuleId = id;
        this.isInstantFeedback = document.getElementById('feedbackToggle')?.checked || false;

        const shouldShuffle = document.getElementById('shuffleToggle')?.checked;
        let pool = [...module.questions];
        if (shouldShuffle) pool = this.shuffleArray(pool);

        this.originalPool = pool;
        this.startSession(pool);

        // Apply user mode to test view
        const testView = document.getElementById('testView');
        testView.classList.remove('mode-howard', 'mode-myka');
        if (this.activeUser) testView.classList.add(`mode-${this.activeUser}`);

        document.getElementById('activeTestTitle').textContent = module.title;
        document.getElementById('homeView').classList.add('hidden-view');
        document.getElementById('testView').classList.remove('hidden-view');
        document.getElementById('resultModal').classList.add('hidden');
    },

    exitTest() {
        document.getElementById('testView').classList.add('hidden-view');
        document.getElementById('homeView').classList.remove('hidden-view');
    },

    shuffleArray(array) {
        let arr = [...array], i = arr.length, j;
        while (i--) { j = Math.floor(Math.random() * (i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
        return arr;
    },

    startSession(questionPool) {
        this.activeQuestions = questionPool;
        this.answers = new Array(questionPool.length).fill(null);
        this.currentIdx = 0;
        this.renderQuestion();
        this.renderGrid();
    },

    // ─── Question Rendering ───────────────────────────────────────────────────
    renderQuestion() {
        const q = this.activeQuestions[this.currentIdx];

        document.getElementById('questionText').textContent = q.text;
        document.getElementById('currentQNum').textContent = this.currentIdx + 1;
        document.getElementById('progressText').textContent = `Question ${this.currentIdx + 1} of ${this.activeQuestions.length}`;
        document.getElementById('progressBar').style.width = `${((this.currentIdx + 1) / this.activeQuestions.length) * 100}%`;
        document.getElementById('prevBtn').disabled = this.currentIdx === 0;
        document.getElementById('nextBtn').textContent = this.currentIdx === this.activeQuestions.length - 1 ? 'Finish Test' : 'Continue';

        if (q.type === 'identification') {
            this._renderIdentification(q);
        } else {
            this._renderMultipleChoice(q);
        }

        this.updateGridState();
    },

    _renderMultipleChoice(q) {
        const userAnswer = this.answers[this.currentIdx];
        const isAnswered = userAnswer !== null;
        const list = document.getElementById('optionsList');

        list.innerHTML = q.options.map((opt, i) => {
            let stateClasses = '';
            const iconLabel = String.fromCharCode(65 + i);

            if (this.isInstantFeedback && isAnswered) {
                if (i === q.correct) {
                    stateClasses = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                } else if (i === userAnswer) {
                    stateClasses = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                } else {
                    stateClasses = 'opacity-50';
                }
            }

            return `
                <div class="relative">
                    <input type="radio" id="opt${i}" name="question_${this.currentIdx}" class="option-input sr-only"
                           value="${i}" ${userAnswer === i ? 'checked' : ''}
                           ${this.isInstantFeedback && isAnswered ? 'disabled' : ''}
                           onchange="Engine.saveAnswer(${i})">
                    <label for="opt${i}" class="option-label flex items-center gap-3 p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-700/50 ${stateClasses}">
                        <span class="w-7 h-7 md:w-8 md:h-8 rounded-lg border-2 border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-xs font-display font-black text-zinc-400 dark:text-zinc-500 shrink-0 transition-all">${iconLabel}</span>
                        <span class="text-sm md:text-base text-zinc-700 dark:text-zinc-200 font-medium leading-snug">${opt}</span>
                    </label>
                </div>`;
        }).join('');
    },

    _renderIdentification(q) {
        const userAnswer = this.answers[this.currentIdx];
        const isAnswered = userAnswer !== null && String(userAnswer).trim() !== '';
        const isLocked = this.isInstantFeedback && isAnswered;
        const correct = this.isCorrect(q, userAnswer);

        let wrapperClasses = 'border-2 border-zinc-100 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50';
        let feedbackBadge = '';
        let answerReveal = '';

        if (this.isInstantFeedback && isAnswered) {
            if (correct) {
                wrapperClasses = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20';
                feedbackBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Correct!</span>`;
            } else {
                wrapperClasses = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/20';
                feedbackBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Incorrect</span>`;
                const acceptedList = Array.isArray(q.answer) ? q.answer.join(' / ') : q.answer;
                answerReveal = `<div class="mt-4 pt-3 border-t border-red-200 dark:border-red-900/40">
                    <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Correct Answer</p>
                    <p class="text-green-700 dark:text-green-400 font-bold">${acceptedList}</p>
                </div>`;
            }
        }

        document.getElementById('optionsList').innerHTML = `
            <div class="${wrapperClasses} rounded-xl p-5 transition-all">
                <label class="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Type your answer below</label>
                <input id="identInput" type="text" autocomplete="off" spellcheck="false"
                    placeholder="Enter your answer..."
                    value="${userAnswer !== null ? String(userAnswer).replace(/"/g,'&quot;') : ''}"
                    ${isLocked ? 'disabled' : ''}
                    oninput="Engine.saveIdentAnswer(this.value)"
                    class="w-full bg-transparent text-zinc-800 dark:text-white text-lg font-semibold placeholder-zinc-300 dark:placeholder-zinc-600 outline-none border-b-2 border-zinc-200 dark:border-zinc-700 pb-2 transition-colors focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed" />
                <div class="mt-3 flex items-center justify-between">
                    <div>${feedbackBadge}</div>
                    <span class="text-[10px] text-zinc-400 font-medium">Case-insensitive</span>
                </div>
                ${answerReveal}
            </div>`;

        if (!isLocked) {
            setTimeout(() => { const inp = document.getElementById('identInput'); if(inp) inp.focus(); }, 0);
        }
    },

    // ─── Grid ─────────────────────────────────────────────────────────────────
    renderGrid() {
        const grid = document.getElementById('questionGrid');
        grid.innerHTML = this.activeQuestions.map((_,i) => `
            <button id="grid-item-${i}" onclick="Engine.jumpTo(${i})"
                class="w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold border transition-all">
                ${i+1}
            </button>`).join('');
        this.updateGridState();
    },

    jumpTo(i) {
        this.currentIdx = i;
        this.renderQuestion();
    },

    updateGridState() {
        const accentActive = this.activeUser === 'myka' ? '#db2777' : '#2563eb';
        this.activeQuestions.forEach((q, i) => {
            const btn = document.getElementById(`grid-item-${i}`);
            if (!btn) return;
            const ans = this.answers[i];
            const hasAnswer = ans !== null && (q.type === 'identification' ? String(ans).trim() !== '' : true);

            if (i === this.currentIdx) {
                btn.style.cssText = `background:${accentActive};color:white;border-color:${accentActive}`;
                btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold border transition-all shadow-lg';
            } else if (hasAnswer) {
                if (this.isInstantFeedback) {
                    const ok = this.isCorrect(q, ans);
                    btn.style.cssText = ok ? 'background:#22c55e;color:white;border-color:#22c55e' : 'background:#ef4444;color:white;border-color:#ef4444';
                    btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold border transition-all';
                } else {
                    btn.style.cssText = 'background:#1e293b;color:white;border-color:#1e293b';
                    btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold border transition-all dark:bg-zinc-600';
                }
            } else {
                btn.style.cssText = '';
                btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 transition-all';
            }
        });
    },

    // ─── Saving ──────────────────────────────────────────────────────────────
    saveAnswer(val) {
        this.answers[this.currentIdx] = val;
        this.updateGridState();
        if (this.isInstantFeedback) this.renderQuestion();
    },

    saveIdentAnswer(val) {
        this.answers[this.currentIdx] = val;
        this.updateGridState();
        if (this.isInstantFeedback && this.isCorrect(this.activeQuestions[this.currentIdx], val)) {
            this.renderQuestion();
        }
    },

    // ─── Submit ───────────────────────────────────────────────────────────────
    submitTest() {
        let score = 0, mistakes = [];
        this.answers.forEach((ans, i) => {
            if (this.isCorrect(this.activeQuestions[i], ans)) score++;
            else mistakes.push(this.activeQuestions[i]);
        });

        const pct = Math.round((score / (this.activeQuestions.length || 1)) * 100);
        document.getElementById('finalScore').textContent = `${score} / ${this.activeQuestions.length}`;
        document.getElementById('accuracyPercent').textContent = pct + '%';

        // Result icon + bg color
        const isHoward = this.activeUser !== 'myka';
        const accent = isHoward ? '#2563eb' : '#db2777';
        const accentLight = isHoward ? 'rgba(37,99,235,0.07)' : 'rgba(219,39,119,0.07)';
        document.getElementById('resultIcon').style.cssText = `background:${accentLight.replace('0.07','0.12')};color:${accent}`;
        document.getElementById('resultBg').style.background = `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentLight} 0%, transparent 70%)`;

        this.renderResultActions(mistakes);
        document.getElementById('resultModal').classList.remove('hidden');
        document.getElementById('resultModal').classList.add('flex');
    },

    renderResultActions(mistakes) {
        const div = document.getElementById('dynamicActions');
        div.innerHTML = '';
        const isHoward = this.activeUser !== 'myka';
        const accent = isHoward ? '#2563eb' : '#db2777';

        if (mistakes.length > 0) {
            const btn = document.createElement('button');
            btn.className = 'w-full py-3 rounded-xl font-bold text-sm transition-all border';
            btn.style.cssText = `color:#dc2626;background:rgba(220,38,38,0.07);border-color:rgba(220,38,38,0.2)`;
            btn.textContent = `Retake Mistakes (${mistakes.length})`;
            btn.onclick = () => {
                document.getElementById('resultModal').classList.add('hidden');
                this.startSession(mistakes);
            };
            div.appendChild(btn);
        }

        const btn2 = document.createElement('button');
        btn2.className = 'w-full py-3 rounded-xl font-bold text-sm transition-all border';
        btn2.style.cssText = `color:${accent};background:${isHoward?'rgba(37,99,235,0.07)':'rgba(219,39,119,0.07)'};border-color:${isHoward?'rgba(37,99,235,0.2)':'rgba(219,39,119,0.2)'}`;
        btn2.textContent = 'Retake Entire Pool';
        btn2.onclick = () => {
            document.getElementById('resultModal').classList.add('hidden');
            this.startSession(this.originalPool);
        };
        div.appendChild(btn2);
    }
};

// ─── Nav bindings ────────────────────────────────────────────────────────────
document.getElementById('prevBtn').onclick = () => {
    if (Engine.currentIdx > 0) { Engine.currentIdx--; Engine.renderQuestion(); }
};
document.getElementById('nextBtn').onclick = () => {
    if (Engine.currentIdx < Engine.activeQuestions.length - 1) {
        Engine.currentIdx++; Engine.renderQuestion();
    } else {
        Engine.submitTest();
    }
};
document.getElementById('finishBtn').onclick = () => Engine.submitTest();
document.getElementById('mobileMenuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('active');