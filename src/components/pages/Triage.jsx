/**
 * ─── AKILLI ÖNCELİKLER (TRIAGE) STRATEJİ PANELİ ───
 *
 * ÖSYM sınav gerçekliği ve somut soru potansiyeline göre yapılandırılmış strateji motoru:
 *  - Soyut 3 basamaklı formül puanları kaldırıldı; yıllık ÖSYM soru potansiyeli gösterilir.
 *  - 1-10 slider yerine 3 net durum: Hafif Pürüz, Konu Eksiği, Sıfır Temel.
 *  - "Eksik Kapatıldı (✓)" dopamin döngüsü ve "Cebe Atılanlar" akordeon arşivi.
 *  - "Yalnızca TYT" desteği (AYT sekmeleri ve seçenekleri gizlenir).
 *  - Üstte 3 bloklu haftalık teşhis: En Kritik Kaçak, Hızlı Net, İlerleme Durumu.
 *  - Animasyonlar src/utils/motion.js içindeki ortak hareket dilinden gelir.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Zap,
  Target,
  Flame,
  CheckCircle2,
  PlusCircle,
  X,
  Trash2,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Trophy,
  BookOpen,
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import MeasuredLeakCard from '../ui/MeasuredLeakCard';
import { SUBJECT_LABELS, TRACKS } from '../../data/mockData';
import {
  triageTopics,
  TRIAGE_STATUSES,
  getOsymQuestionInfo,
  getSubjectErrorProfile,
} from '../../utils/triage';
import {
  pageContainer,
  pageSection,
  listCard,
  emptyState,
  collapsible,
  tabPanel,
  pressable,
  SOFT_SPRING,
  EASE_OUT_SOFT,
} from '../../utils/motion';

export default function Triage() {
  const {
    trials,
    showAyt,
    selectedTrack,
    tytTopics,
    aytTopics,
    updateTopicDifficulty,
    toggleTopicCompleted,
    deleteTopic,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('TYT');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);

  // Form State
  const [formExamType, setFormExamType] = useState('TYT');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('critical');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // AYT kapalıysa zorunlu TYT sekmesi
  const currentTab = !showAyt && activeTab === 'AYT' ? 'TYT' : activeTab;

  // Form için geçerli konular
  const availableTopicsForForm = useMemo(() => {
    if (!showAyt || formExamType === 'TYT') {
      return tytTopics;
    }
    const trackCodes = TRACKS[selectedTrack]?.aytSubjects || [];
    return aytTopics.filter((t) => trackCodes.includes(t.subject));
  }, [formExamType, tytTopics, aytTopics, selectedTrack, showAyt]);

  // Form için benzersiz ders kodları
  const availableSubjectsForForm = useMemo(() => {
    const unique = [...new Set(availableTopicsForForm.map((t) => t.subject))];
    return unique.map((code) => ({
      code,
      label: SUBJECT_LABELS[code] || code,
    }));
  }, [availableTopicsForForm]);

  // Seçilen derse ait konular
  const filteredTopicsBySubject = useMemo(() => {
    if (!selectedSubject) return [];
    return availableTopicsForForm.filter((t) => t.subject === selectedSubject);
  }, [availableTopicsForForm, selectedSubject]);

  // Ders değiştiğinde konu seçimini güncelle
  const handleSubjectChange = (subjectCode) => {
    setSelectedSubject(subjectCode);
    const topics = availableTopicsForForm.filter((t) => t.subject === subjectCode);
    setSelectedTopicId(topics.length > 0 ? topics[0].id : '');
  };

  // Sınav tipi değiştiğinde dersi sıfırla
  const handleFormExamTypeChange = (type) => {
    setFormExamType(type);
    setSelectedSubject('');
    setSelectedTopicId('');
  };

  // Form Gönderimi
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedTopicId) return;

    updateTopicDifficulty(selectedTopicId, selectedStatus);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Triage motoru ile zenginleştirilmiş konular
  const tytTriaged = useMemo(
    () => triageTopics(tytTopics, trials, 'TYT'),
    [tytTopics, trials]
  );

  const aytTriaged = useMemo(() => {
    if (!showAyt) return [];
    const trackCodes = TRACKS[selectedTrack]?.aytSubjects || [];
    const filtered = aytTopics.filter((t) => trackCodes.includes(t.subject));
    return triageTopics(filtered, trials, 'AYT');
  }, [aytTopics, trials, showAyt, selectedTrack]);

  // Aktif sekmedeki tüm konular
  const items = currentTab === 'TYT' ? tytTriaged : aytTriaged;

  // Aktif (tamamlanmamış) ve Tamamlanan konular
  const activeItems = useMemo(() => items.filter((t) => !t.isCompleted), [items]);
  const completedItems = useMemo(() => items.filter((t) => t.isCompleted), [items]);

  // ─── 3 Net Aksiyon (Otopilot Özet) Hesaplamaları ───

  // 1. Kırmızı Kart: En Kritik Kaçak (Sıfır Temel olup soru sayısı en yüksek olan)
  const criticalTopic = useMemo(() => {
    const criticalList = activeItems
      .filter((t) => t.status === 'critical')
      .sort((a, b) => b.questionAvg - a.questionAvg);
    if (criticalList.length > 0) return criticalList[0];

    const deficitList = activeItems
      .filter((t) => t.status === 'deficit')
      .sort((a, b) => b.questionAvg - a.questionAvg);
    return deficitList.length > 0 ? deficitList[0] : null;
  }, [activeItems]);

  // Kritik konunun dersindeki kayıp profili: yanlış mı boş mu ağırlıklı?
  const criticalProfile = useMemo(
    () => (criticalTopic ? getSubjectErrorProfile(trials, criticalTopic.subject) : null),
    [criticalTopic, trials]
  );

  // 2. Zümrüt Kart: Hızlı Net / Düşük Efor (1-2 soru potansiyeline sahip, hızlı cebe atılacak konu)
  const quickWinTopic = useMemo(() => {
    const quickWins = activeItems
      .filter((t) => t.isQuickWin || t.questionAvg <= 2.5)
      .sort((a, b) => {
        // Hafif pürüzler ve az soruluk konular önce
        if (a.status === 'mild' && b.status !== 'mild') return -1;
        if (b.status === 'mild' && a.status !== 'mild') return 1;
        return a.questionAvg - b.questionAvg;
      });
    return quickWins.length > 0 ? quickWins[0] : null;
  }, [activeItems]);

  // 3. Mavi Kart: İlerleme Durumu (Kapatılan eksikler ve toplam potansiyel soru)
  const completedStats = useMemo(() => {
    const count = completedItems.length;
    const totalQ = completedItems.reduce((acc, t) => acc + (t.questionAvg || 1.5), 0);
    return { count, totalQ: Math.round(totalQ) };
  }, [completedItems]);

  // Sekmeler
  const tabs = [
    { id: 'TYT', label: 'TYT Eksikleri', count: activeItems.length },
    ...(showAyt
      ? [{ id: 'AYT', label: 'AYT Eksikleri', count: aytTriaged.filter((t) => !t.isCompleted).length }]
      : []),
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={pageContainer}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6 max-w-5xl mx-auto w-full"
      >
        {/* ── Başlık ve Form Açma Butonu ── */}
        <motion.div
          variants={pageSection}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 [html.theme-sepia_&]:bg-amber-500/20 [html.theme-sepia_&]:border-amber-500/30 flex items-center justify-center shadow-sm text-amber-500">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50">
                Akıllı Öncelikler & Strateji
              </h1>
              <p className="text-xs mt-0.5 font-medium text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                Yıllık ÖSYM soru potansiyeline göre net kazandıran stratejik eksik takip paneli.
              </p>
            </div>
          </div>

          <motion.button
            {...pressable}
            type="button"
            onClick={() => setShowQuickAdd((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 self-start sm:self-auto shadow-sm ${
              showQuickAdd
                ? 'bg-slate-100 dark:bg-slate-700/80 [html.theme-sepia_&]:bg-[#2e221a] text-slate-700 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500'
            }`}
          >
            {/* İkon, form açılıp kapanırken çeyrek tur dönerek geçer */}
            <motion.span
              key={showQuickAdd ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
              className="flex"
            >
              {showQuickAdd ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </motion.span>
            <span>{showQuickAdd ? 'Formu Kapat' : 'Yeni Eksik Ekle'}</span>
          </motion.button>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            A. ÜST BLOK: HAFTALIK TEŞHİS & 3 NET AKSİYON (OTOPİLOT ÖZET)
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={pageContainer} className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Kırmızı Kart: En Kritik Kaçak */}
          <motion.div variants={pageSection} className="card p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] flex flex-col justify-between space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                En Kritik Kaçak
              </span>
              <span className="text-[11px] font-bold text-red-500">ACİL</span>
            </div>

            <div>
              {criticalTopic ? (
                <>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 line-clamp-1">
                    {criticalTopic.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] mt-0.5">
                    {SUBJECT_LABELS[criticalTopic.subject] || criticalTopic.subject}
                  </p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        ÖSYM: {criticalTopic.osymRange}
                      </span>
                    </div>
                    {/* Kaybın yanlıştan mı boştan mı geldiği müdahaleyi
                        değiştirir: boş = bilmiyorum (konu çalış),
                        yanlış = biliyorum sandım (kavram/dikkat). */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 [html.theme-sepia_&]:text-[#d6c5b6]">
                      {criticalProfile?.dominant === 'wrong'
                        ? `Bu derste kaybın çoğu yanlıştan geliyor (${criticalProfile.wrong} yanlış / ${criticalProfile.blank} boş). Konu eksiğinden çok kavram yanılgısı veya dikkat hatası olabilir — yanlışlarını gözden geçir.`
                        : criticalProfile?.dominant === 'blank'
                        ? `Bu derste kaybın çoğu boştan geliyor (${criticalProfile.blank} boş / ${criticalProfile.wrong} yanlış). Klasik konu eksiği — çalışmak doğrudan net kazandırır.`
                        : 'Bu konuyu çözmek doğrudan net artışı sağlar, öncelikli odaklan.'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] py-2">
                  Tebrikler! Kritik derecede kaçak konu bulunmuyor.
                </p>
              )}
            </div>
          </motion.div>

          {/* 2. Zümrüt Kart: Hızlı Net / Düşük Efor */}
          <motion.div variants={pageSection} className="card p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] flex flex-col justify-between space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Hızlı Net / Düşük Efor
              </span>
              <span className="text-[11px] font-bold text-emerald-500">+1 NET</span>
            </div>

            <div>
              {quickWinTopic ? (
                <>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 line-clamp-1">
                    {quickWinTopic.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] mt-0.5">
                    {SUBJECT_LABELS[quickWinTopic.subject] || quickWinTopic.subject}
                  </p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ÖSYM: {quickWinTopic.osymRange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 [html.theme-sepia_&]:text-[#d6c5b6]">
                      Kısa tekrarda doğrudan cebe atılır, hızlı net kazandırır.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] py-2">
                  Tüm hızlı net konuları başarıyla tamamlandı!
                </p>
              )}
            </div>
          </motion.div>

          {/* 3. Mavi Kart: İlerleme Durumu */}
          <motion.div variants={pageSection} className="card p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] flex flex-col justify-between space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                İlerleme Durumu
              </span>
              <span className="text-[11px] font-bold text-sky-500">BAŞARI</span>
            </div>

            <div>
              {/* Sayaç değişince rakam sert atlamak yerine yumuşak tazelenir */}
              <motion.h3
                key={completedStats.count}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
                className="text-base font-extrabold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50"
              >
                {completedStats.count > 0
                  ? `${completedStats.count} Konu Kapatıldı`
                  : '0 Konu Kapatıldı'}
              </motion.h3>
              <div className="mt-3 flex flex-col gap-1.5">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {completedStats.count > 0 ? `~${completedStats.totalQ} Soru Güvencede` : 'Hedef: İlk Eksik'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 [html.theme-sepia_&]:text-[#d6c5b6]">
                  {completedStats.count > 0
                    ? 'Kapatılan eksiklerin soru potansiyeli netlerine eklendi 🎉'
                    : 'Eksiklerini tamamla, netleri cebe at!'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            B. ORTA BLOK: YENİ KONU EKLEME FORMU (KATLANABİLİR)
        ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showQuickAdd && (
            <motion.div
              variants={collapsible}
              initial="initial"
              animate="animate"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="card rounded-2xl p-5 sm:p-6 bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50">
                      Öncelik Listesine Yeni Eksik Ekle
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] hidden sm:inline">
                    Durumunu seçerek strateji paneline anında dahil et
                  </span>
                </div>

                <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Sınav Tipi Toggle (Sadece AYT aktifse görünür) */}
                    {showAyt ? (
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                          Sınav
                        </label>
                        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-700/60 [html.theme-sepia_&]:bg-[#2e221a] border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225]">
                          {/* Aktif zemin iki seçenek arasında kayarak geçer */}
                          {[
                            { id: 'TYT', label: 'TYT' },
                            { id: 'AYT', label: `AYT (${selectedTrack})` },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleFormExamTypeChange(opt.id)}
                              className={`relative flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 ${
                                formExamType === opt.id
                                  ? 'text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50'
                                  : 'text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] hover:text-slate-700 dark:hover:text-slate-300'
                              }`}
                            >
                              {formExamType === opt.id && (
                                <motion.span
                                  layoutId="triageFormExamType"
                                  transition={SOFT_SPRING}
                                  className="absolute inset-0 rounded-lg shadow-sm bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#201712]"
                                />
                              )}
                              <span className="relative z-10">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Ders Seçimi */}
                    <div className={showAyt ? '' : 'sm:col-span-1'}>
                      <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                        Ders Seç
                      </label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#2e221a] border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        required
                      >
                        <option value="">-- Ders Seçiniz --</option>
                        {availableSubjectsForForm.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Konu Seçimi (Yanında ÖSYM Soru Potansiyeli Yazar) */}
                    <div className={showAyt ? '' : 'sm:col-span-2'}>
                      <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                        Konu Seç
                      </label>
                      <select
                        value={selectedTopicId}
                        onChange={(e) => setSelectedTopicId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#2e221a] border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedSubject}
                        required
                      >
                        <option value="">
                          {selectedSubject ? '-- Konu Seçiniz --' : 'Önce ders seçin'}
                        </option>
                        {filteredTopicsBySubject.map((t) => {
                          const info = getOsymQuestionInfo(t);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} ({info.range})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* ── 3 Net Durum Seçimi (1-10 slider yerine) ── */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                      Konudaki Durumunuz:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Hafif Pürüz */}
                      <motion.button
                        {...pressable}
                        type="button"
                        onClick={() => setSelectedStatus('mild')}
                        className={`p-3 rounded-xl border text-left transition-colors duration-200 flex flex-col justify-between ${
                          selectedStatus === 'mild'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-300 [html.theme-sepia_&]:text-amber-300 shadow-sm'
                            : 'bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#201712] border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] text-slate-700 dark:text-slate-300 [html.theme-sepia_&]:text-stone-300 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">Hafif Pürüz</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        </div>
                        <span className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                          Konuyu biliyorum, bazen soru kaçıyor.
                        </span>
                      </motion.button>

                      {/* 2. Konu Eksiği Var */}
                      <motion.button
                        {...pressable}
                        type="button"
                        onClick={() => setSelectedStatus('deficit')}
                        className={`p-3 rounded-xl border text-left transition-colors duration-200 flex flex-col justify-between ${
                          selectedStatus === 'deficit'
                            ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-300 [html.theme-sepia_&]:text-orange-300 shadow-sm'
                            : 'bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#201712] border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] text-slate-700 dark:text-slate-300 [html.theme-sepia_&]:text-stone-300 hover:border-orange-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">Konu Eksiği Var</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        </div>
                        <span className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                          Kazanımları tekrar edip soru çözmeliyim.
                        </span>
                      </motion.button>

                      {/* 3. Sıfır Temel / Kritik */}
                      <motion.button
                        {...pressable}
                        type="button"
                        onClick={() => setSelectedStatus('critical')}
                        className={`p-3 rounded-xl border text-left transition-colors duration-200 flex flex-col justify-between ${
                          selectedStatus === 'critical'
                            ? 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-300 [html.theme-sepia_&]:text-red-300 shadow-sm'
                            : 'bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#201712] border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] text-slate-700 dark:text-slate-300 [html.theme-sepia_&]:text-stone-300 hover:border-red-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">Sıfır Temel / Kritik</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        </div>
                        <span className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                          Hiç bilmiyorum veya büyük net kaybı var.
                        </span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Kaydet Butonu */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {/* Onay yazısı belirirken de kaybolurken de yumuşak */}
                    <AnimatePresence>
                      {savedSuccess && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-500"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Öncelik listesine başarıyla eklendi!
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <motion.button
                      {...pressable}
                      type="submit"
                      disabled={!selectedTopicId}
                      className="px-5 py-2.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Öncelik Listesine Ekle
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════
            C. ÖLÇÜM BLOĞU: DENEMELERDEN GELEN KONU BAZLI KAYIPLAR

            Sayfanın geri kalanı öğrencinin BEYANINA dayanıyor; bu kart
            denemelerde işaretlenen konulara, yani ÖLÇÜME. İkisi çeliştiğinde
            söylemek asıl değeri yaratıyor ("hafif pürüz demişsin ama 3
            denemede kaybettin").

            Ayrı kart olarak duruyor çünkü iki konu havuzu henüz birleşmedi
            (bkz. CLAUDE.md). Birleşmeden sonra aşağıdaki listeye erimesi
            planlanıyor.
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div variants={pageSection}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`leaks-${currentTab}`}
              variants={tabPanel}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <MeasuredLeakCard
                trials={trials}
                examType={currentTab}
                declaredTopics={items}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            D. ALT BLOK: ÖNCELİKLİ EKSİK LİSTESİ & CEBE ATILANLAR
        ═══════════════════════════════════════════════════════════════ */}

        {/* Sekmeler */}
        <motion.div variants={pageSection} className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5 p-1 rounded-xl w-fit bg-slate-100/80 dark:bg-slate-700/60 [html.theme-sepia_&]:bg-[#2e221a] border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  currentTab === tab.id
                    ? 'text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50'
                    : 'text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {currentTab === tab.id && (
                  <motion.div
                    layoutId="triageTab"
                    className="absolute inset-0 rounded-lg shadow-sm bg-white dark:bg-slate-800 [html.theme-sepia_&]:bg-[#201712] border border-slate-200/60 dark:border-slate-600/60 [html.theme-sepia_&]:border-[#453225]"
                    transition={SOFT_SPRING}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.label}
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#a38d7b]">
                    ({tab.count})
                  </span>
                </span>
              </button>
            ))}
          </div>

          <motion.span
            key={activeItems.length}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
            className="text-xs font-bold text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#a38d7b] hidden sm:inline"
          >
            {activeItems.length} Aktif Eksik
          </motion.span>
        </motion.div>

        {/* Aktif Konu Listesi */}
        <motion.div variants={pageSection} className="space-y-2.5 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              variants={tabPanel}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-2.5 w-full"
            >
              {activeItems.length === 0 ? (
                <motion.div
                  variants={emptyState}
                  className="card p-8 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] flex flex-col items-center text-center w-full shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50">
                    Tebrikler! Bu alanda aktif eksik konu bulunmuyor.
                  </p>
                  <p className="text-xs mt-1 text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                    Yeni bir konu ekleyebilir veya alttaki tamamlanan konuları inceleyebilirsin.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {activeItems.map((topic, index) => {
                    const statusMeta = TRIAGE_STATUSES[topic.status] || TRIAGE_STATUSES.deficit;
                    const subjectLabel = SUBJECT_LABELS[topic.subject] || topic.subject;

                    return (
                    <motion.div
                      key={topic.id}
                      layout="position"
                      custom={index}
                      variants={listCard}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={SOFT_SPRING}
                      className="card p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] hover:border-slate-300 dark:hover:border-slate-600 [html.theme-sepia_&]:hover:border-amber-600/40 transition-colors duration-200 flex items-center justify-between gap-3 shadow-sm"
                    >
                      {/* Sol: Sıra No ve Bilgiler */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] font-bold text-xs tabular-nums text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] bg-slate-50 dark:bg-slate-700/60 [html.theme-sepia_&]:bg-[#2e221a]">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50 truncate">
                              {topic.name}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#a38d7b]">
                              • {subjectLabel}
                            </span>
                          </div>

                          {/* Rozetler (ÖSYM Soru Sayısı ve Durum) */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* ÖSYM Soru Potansiyeli Rozeti */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <BookOpen className="w-3 h-3" />
                              ÖSYM: {topic.osymRange}
                            </span>

                            {/* 3 Net Durum Rozeti */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                              {statusMeta.shortLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sağ: Eksik Kapatıldı ve Sil Butonları */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Eksik Kapatıldı Butonu (Dopamin Döngüsü) */}
                        <motion.button
                          {...pressable}
                          type="button"
                          onClick={() => toggleTopicCompleted(topic.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors duration-200 shadow-sm"
                          title="Bu konuyu cebe at ve tamamlananlara taşı"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Eksik Kapatıldı</span>
                        </motion.button>

                        {/* Sil Butonu */}
                        <motion.button
                          type="button"
                          onClick={() => deleteTopic(topic.id)}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          transition={SOFT_SPRING}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Bu konuyu listeden sil"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            BU HAFTA CEBE ATILANLAR (TAMAMLANANLAR AKORDEONU)
        ═══════════════════════════════════════════════════════════════ */}
        {completedItems.length > 0 && (
          <motion.div
            variants={pageSection}
            className="card rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-slate-50/50 dark:bg-slate-800/40 [html.theme-sepia_&]:bg-[#1a130e]/60 overflow-hidden shadow-sm"
          >
            {/* Akordeon Başlığı */}
            <button
              type="button"
              onClick={() => setShowCompletedAccordion((prev) => !prev)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-slate-700/30 [html.theme-sepia_&]:hover:bg-[#2e221a]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 [html.theme-sepia_&]:text-amber-50">
                    Bu Hafta Cebe Atılanlar ({completedItems.length} Konu)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6]">
                    Kapatılan eksiklerin soru potansiyelleri netlerine eklendi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-semibold hidden sm:inline">
                  {showCompletedAccordion ? 'Gizle' : 'Göster'}
                </span>
                {/* Tek ok, iki ikon arasında atlamak yerine dönerek yön değiştirir */}
                <motion.span
                  animate={{ rotate: showCompletedAccordion ? 180 : 0 }}
                  transition={{ duration: 0.34, ease: EASE_OUT_SOFT }}
                  className="flex"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
              </div>
            </button>

            {/* Akordeon İçeriği */}
            <AnimatePresence initial={false}>
              {showCompletedAccordion && (
                <motion.div
                  variants={collapsible}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="overflow-hidden border-t border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225]"
                >
                  <div className="p-4 space-y-2">
                  {completedItems.map((topic, index) => {
                    const subjectLabel = SUBJECT_LABELS[topic.subject] || topic.subject;
                    const potentialLabel = topic.osymRange
                      ? (topic.osymRange.includes('Soru') ? `+${topic.osymRange} Cebe Atıldı 🎯` : `+~${topic.osymRange} Soru Cebe Atıldı 🎯`)
                      : `+~${topic.potential || 1} Soru Cebe Atıldı 🎯`;

                    return (
                      <motion.div
                        key={topic.id}
                        custom={index}
                        variants={listCard}
                        initial="initial"
                        animate="animate"
                        className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-950/20 [html.theme-sepia_&]:bg-[#1e160e]/50 border border-emerald-500/20 [html.theme-sepia_&]:border-[#453225] rounded-xl mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors duration-200"
                      >
                        {/* Sol Blok: İkon + Konu + Ders */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="line-through decoration-1 decoration-slate-900 dark:decoration-slate-100 [html.theme-sepia_&]:decoration-amber-100 text-slate-800 dark:text-slate-200 [html.theme-sepia_&]:text-amber-100 font-medium text-sm truncate">
                              {topic.name}
                            </p>
                            <span className="text-xs text-slate-600 dark:text-slate-400 [html.theme-sepia_&]:text-[#d6c5b6] block">
                              {subjectLabel}
                            </span>
                          </div>
                        </div>

                        {/* Sağ Blok: Rozet ve Butonlar (Mobilde satırı tam doldurup iki uca yaslanır) */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-emerald-500/10 [html.theme-sepia_&]:border-[#453225]/40">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 [html.theme-sepia_&]:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 [html.theme-sepia_&]:text-emerald-400 whitespace-nowrap">
                            {potentialLabel}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <motion.button
                              type="button"
                              onClick={() => toggleTopicCompleted(topic.id)}
                              title="Geri Al"
                              whileHover={{ scale: 1.08, rotate: -20 }}
                              whileTap={{ scale: 0.92 }}
                              transition={SOFT_SPRING}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => deleteTopic(topic.id)}
                              title="Sil"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              transition={SOFT_SPRING}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </MotionConfig>
  );
}
