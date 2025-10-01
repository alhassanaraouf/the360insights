import { useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface TranslationData {
  en: Record<string, string>;
  ar: Record<string, string>;
}

const translations: TranslationData = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.athlete360': 'Athlete 360°',
    'nav.career': 'Career Journey',
    'nav.opponents': 'Opponents List',
    'nav.opponentAnalysis': 'AI Opponent Analysis',
    'nav.liveMatch': 'Live Match Analysis',
    'nav.trainingPlanner': 'Training Planner',
    'nav.injuryPrevention': 'Injury Prevention',
    'nav.tacticalTraining': 'Tactical Training',
    'nav.rankings': 'World Rankings',
    'nav.insights': 'AI Insights',
    'nav.motivationHub': 'Motivation Hub',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.description': 'Comprehensive athlete performance overview',
    'dashboard.readinessIndex': 'Readiness Index',
    'dashboard.winRate': 'Win Rate (L3M)',
    'dashboard.daysToMatch': 'Days to Next Match',
    'dashboard.worldRank': 'World Rank',
    'dashboard.performanceTrajectory': 'Performance Trajectory',
    'dashboard.topStrengths': 'Top Strengths',
    'dashboard.improvementAreas': 'Areas for Improvement',
    'dashboard.upcomingOpponents': 'Upcoming Opponents',
    'dashboard.trainingRecommendations': 'AI Training Recommendations',
    'dashboard.generateReport': 'Generate Detailed Report',
    'dashboard.scheduleTraining': 'Schedule Training',
    'dashboard.getInsights': 'Get AI Insights',
    'dashboard.generating': 'Generating Performance Report',
    'dashboard.creatingPDF': 'Creating comprehensive PDF analysis...',
    'dashboard.success': 'Success',
    'dashboard.downloadReady': 'Report downloaded successfully',
    'dashboard.exportFailed': 'Unable to generate PDF report. Please try again.',
    'common.exportReport': 'Export Report',
    
    // Athlete 360
    'athlete360.title': 'Athlete 360°',
    'athlete360.description': 'Complete performance profile and analysis',
    'athlete360.readinessAssessment': 'Comprehensive Readiness Assessment',
    'athlete360.physicalReadiness': 'Physical Readiness',
    'athlete360.mentalReadiness': 'Mental Readiness',
    'athlete360.technicalReadiness': 'Technical Readiness',
    'athlete360.overallReadiness': 'Overall Readiness',
    'athlete360.competitionReady': 'Competition Ready',
    'athlete360.careerWinRate': 'Career Win Rate',
    'athlete360.yearsProfessional': 'Years Professional',
    'athlete360.careerTitles': 'Career Titles',
    'athlete360.performanceStrengths': 'Performance Strengths',
    'athlete360.developmentAreas': 'Development Areas',
    'athlete360.kpiMatrix': 'Performance KPI Matrix',
    'athlete360.recentAchievements': 'Recent Achievements',
    'athlete360.injuryHistory': 'Injury History',
    'athlete360.noInjuries': 'No injury history',
    'athlete360.excellentHealth': 'Excellent health record',
    
    // Rankings
    'rankings.title': 'World Rankings',
    'rankings.description': 'Live rankings and climb optimization',
    'rankings.currentRank': 'Current World Rank',
    'rankings.nextTier': 'Next Tier Goal',
    'rankings.upcomingEvents': 'Upcoming Events',
    'rankings.rankingPoints': 'Ranking Points',
    'rankings.trajectory': 'Ranking Trajectory (Last 6 Months)',
    'rankings.climbScenarios': 'Ranking Climb Scenarios',
    'rankings.keyOpponents': 'Key Opponents Ranking',
    'rankings.tiersProgress': 'Ranking Tiers Progress',
    
    // AI Insights
    'insights.title': 'AI Insights',
    'insights.description': 'Natural language queries and predictions',
    'insights.askAi': 'Ask AI About Your Performance',
    'insights.placeholder': 'Ask anything about your athlete or opponents...',
    'insights.recentInsights': 'Recent Insights',
    'insights.confidence': 'Confidence',
    'insights.noQueries': 'No queries yet. Ask your first question above!',
    
    // Career Journey
    'career.title': 'Career Journey',
    'career.description': 'Track career milestones and achievements',
    'career.careerTimeline': 'Career Timeline',
    'career.achievements': 'Achievements',
    'career.medals': 'Medals',
    'career.competitions': 'Competitions',
    'career.worldChampionships': 'World Championships',
    'career.asianGames': 'Asian Games',
    'career.olympics': 'Olympics',
    
    // Opponents
    'opponents.title': 'Opponents List',
    'opponents.description': 'Analyze and track competitive opponents',
    'opponents.threatLevel': 'Threat Level',
    'opponents.high': 'High',
    'opponents.medium': 'Medium',
    'opponents.low': 'Low',
    'opponents.critical': 'Critical',
    'opponents.winRate': 'Win Rate',
    'opponents.lastMatch': 'Last Match',
    'opponents.nextMatch': 'Next Match',
    'opponents.viewAnalysis': 'View Analysis',
    
    // Opponent Analysis
    'opponentAnalysis.title': 'AI Opponent Analysis',
    'opponentAnalysis.description': 'Deep analysis of opponent strategies',
    'opponentAnalysis.selectOpponent': 'Select Opponent for Analysis',
    'opponentAnalysis.tacticalBreakdown': 'Tactical Breakdown',
    'opponentAnalysis.weaknesses': 'Key Weaknesses',
    'opponentAnalysis.strengths': 'Opponent Strengths',
    'opponentAnalysis.winProbability': 'Win Probability',
    'opponentAnalysis.recommendations': 'Strategic Recommendations',
    
    // Live Match
    'liveMatch.title': 'Live Match Analysis',
    'liveMatch.description': 'Real-time match insights and suggestions',
    'liveMatch.currentScore': 'Current Score',
    'liveMatch.round': 'Round',
    'liveMatch.timeRemaining': 'Time Remaining',
    'liveMatch.momentum': 'Momentum',
    'liveMatch.suggestions': 'Live Suggestions',
    'liveMatch.startMatch': 'Start Match',
    'liveMatch.endMatch': 'End Match',
    
    // Training Planner
    'trainingPlanner.title': 'Training Planner',
    'trainingPlanner.description': 'AI-powered training schedules',
    'trainingPlanner.generatePlan': 'Generate Training Plan',
    'trainingPlanner.weeklyPlan': 'Weekly Training Plan',
    'trainingPlanner.dailySchedule': 'Daily Schedule',
    'trainingPlanner.intensity': 'Intensity',
    'trainingPlanner.duration': 'Duration',
    'trainingPlanner.focus': 'Focus Areas',
    
    // Injury Prevention
    'injury.title': 'Injury Prevention',
    'injury.description': 'Predictive health insights and prevention',
    'injury.riskAssessment': 'Risk Assessment',
    'injury.overallRisk': 'Overall Risk',
    'injury.riskFactors': 'Risk Factors',
    'injury.recommendations': 'Prevention Recommendations',
    'injury.recoveryPlan': 'Recovery Plan',
    'injury.biomechanicalAnalysis': 'Biomechanical Analysis',
    
    // Tactical Training
    'tactical.title': 'Tactical Training',
    'tactical.description': 'AI-guided tactical drills',
    'tactical.startSession': 'Start Training Session',
    'tactical.currentDrill': 'Current Drill',
    'tactical.progress': 'Session Progress',
    'tactical.feedback': 'AI Feedback',
    'tactical.nextStep': 'Next Step',
    'tactical.quickStart': 'Quick Start',
    'tactical.customTraining': 'Custom Training',
    'tactical.offensiveDrills': 'Offensive Drills',
    'tactical.defensiveTraining': 'Defensive Training',
    'tactical.counterAttack': 'Counter-Attack',
    'tactical.attackCombinations': 'Attack combinations and scoring techniques',
    'tactical.blockingDodging': 'Blocking, dodging, and counter-defense',
    'tactical.timingCounters': 'Timing and explosive counters',
    'tactical.startTraining': 'Start Training',
    
    // Motivation Hub
    'motivation.title': 'Motivation Hub',
    'motivation.description': 'Personal motivation and goal tracking',
    'motivation.goals': 'Goals',
    'motivation.achievements': 'Achievements',
    'motivation.progress': 'Progress',
    'motivation.inspiration': 'Daily Inspiration',
    
    // Performance Data
    'performance.score': 'Performance Score',
    'performance.trend': 'Trend',
    'performance.improving': 'Improving',
    'performance.stable': 'Stable',
    'performance.declining': 'Declining',
    'performance.excellent': 'Excellent',
    'performance.good': 'Good',
    'performance.average': 'Average',
    'performance.needsImprovement': 'Needs Improvement',
    
    // Athlete Data
    'athlete.name': 'Name',
    'athlete.sport': 'Sport',
    'athlete.nationality': 'Nationality',
    'athlete.rank': 'Rank',
    'athlete.coach': 'Coach',
    'athlete.headCoach': 'Head Coach',
    'athlete.taekwondo': 'Taekwondo',
    'athlete.egypt': 'Egypt',
    'athlete.egyptian': 'Egyptian',
    
    // Coach Information
    'coach.ahmedHassan': 'Ahmed Hassan',
    'coach.mohamedAli': 'Mohamed Ali',
    'coach.faridElSayed': 'Farid El-Sayed',
    'coach.ahmedFarouk': 'Ahmed Farouk',
    'coach.yasminKhaled': 'Yasmin Khaled',
    'coach.omarMahmoud': 'Omar Mahmoud',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error loading data',
    'common.tryAgain': 'Please try again later',
    'common.noData': 'No data available',
    'common.viewAnalysis': 'View Full Analysis',
    'common.probability': 'probability',
    'common.achieved': 'Achieved',
    'common.nextGoal': 'Next goal',
    'common.spotsToGo': 'spots to go',
    'common.spotsNeeded': 'spots needed',
    'common.search': 'Search',
    'common.select': 'Select',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة القيادة',
    'nav.athlete360': 'اللاعب 360°',
    'nav.career': 'رحلة المهنة',
    'nav.opponents': 'قائمة المنافسين',
    'nav.opponentAnalysis': 'تحليل المنافسين بالذكاء الاصطناعي',
    'nav.liveMatch': 'تحليل المباراة المباشرة',
    'nav.trainingPlanner': 'مخطط التدريب',
    'nav.injuryPrevention': 'منع الإصابات',
    'nav.tacticalTraining': 'التدريب التكتيكي',
    'nav.rankings': 'التصنيف العالمي',
    'nav.insights': 'رؤى الذكاء الاصطناعي',
    'nav.motivationHub': 'مركز التحفيز',
    
    // Dashboard
    'dashboard.title': 'لوحة القيادة',
    'dashboard.description': 'نظرة شاملة على أداء اللاعب',
    'dashboard.readinessIndex': 'مؤشر الجاهزية',
    'dashboard.winRate': 'معدل الفوز (آخر 3 أشهر)',
    'dashboard.daysToMatch': 'أيام للمباراة التالية',
    'dashboard.worldRank': 'التصنيف العالمي',
    'dashboard.performanceTrajectory': 'مسار الأداء',
    'dashboard.topStrengths': 'أهم نقاط القوة',
    'dashboard.improvementAreas': 'مجالات التحسين',
    'dashboard.upcomingOpponents': 'المنافسون القادمون',
    'dashboard.trainingRecommendations': 'توصيات التدريب بالذكاء الاصطناعي',
    'dashboard.generateReport': 'إنشاء تقرير مفصل',
    'dashboard.scheduleTraining': 'جدولة التدريب',
    'dashboard.getInsights': 'الحصول على رؤى الذكاء الاصطناعي',
    'dashboard.generating': 'إنشاء تقرير الأداء',
    'dashboard.creatingPDF': 'إنشاء تحليل شامل بصيغة PDF...',
    'dashboard.success': 'نجح',
    'dashboard.downloadReady': 'تم تحميل التقرير بنجاح',
    'dashboard.exportFailed': 'غير قادر على إنشاء تقرير PDF. يرجى المحاولة مرة أخرى.',
    
    // Athlete 360
    'athlete360.title': 'اللاعب 360°',
    'athlete360.description': 'ملف الأداء الكامل والتحليل',
    'athlete360.readinessAssessment': 'تقييم الجاهزية الشامل',
    'athlete360.physicalReadiness': 'الجاهزية البدنية',
    'athlete360.mentalReadiness': 'الجاهزية النفسية',
    'athlete360.technicalReadiness': 'الجاهزية التقنية',
    'athlete360.overallReadiness': 'الجاهزية العامة',
    'athlete360.competitionReady': 'جاهز للمنافسة',
    'athlete360.careerWinRate': 'معدل الفوز في المسيرة',
    'athlete360.yearsProfessional': 'سنوات الاحتراف',
    'athlete360.careerTitles': 'الألقاب المهنية',
    'athlete360.performanceStrengths': 'نقاط قوة الأداء',
    'athlete360.developmentAreas': 'مجالات التطوير',
    'athlete360.kpiMatrix': 'مصفوفة مؤشرات الأداء',
    'athlete360.recentAchievements': 'الإنجازات الحديثة',
    'athlete360.injuryHistory': 'تاريخ الإصابات',
    'athlete360.noInjuries': 'لا يوجد تاريخ إصابات',
    'athlete360.excellentHealth': 'سجل صحي ممتاز',
    
    // Rankings
    'rankings.title': 'التصنيف العالمي',
    'rankings.description': 'التصنيفات المباشرة وتحسين التقدم',
    'rankings.currentRank': 'التصنيف العالمي الحالي',
    'rankings.nextTier': 'هدف المستوى التالي',
    'rankings.upcomingEvents': 'الأحداث القادمة',
    'rankings.rankingPoints': 'نقاط التصنيف',
    'rankings.trajectory': 'مسار التصنيف (آخر 6 أشهر)',
    'rankings.climbScenarios': 'سيناريوهات تسلق التصنيف',
    'rankings.keyOpponents': 'تصنيف المنافسين الرئيسيين',
    'rankings.tiersProgress': 'تقدم مستويات التصنيف',
    
    // AI Insights
    'insights.title': 'رؤى الذكاء الاصطناعي',
    'insights.description': 'استعلامات اللغة الطبيعية والتنبؤات',
    'insights.askAi': 'اسأل الذكاء الاصطناعي عن أدائك',
    'insights.placeholder': 'اسأل أي شيء عن لاعبك أو منافسيك...',
    'insights.recentInsights': 'الرؤى الحديثة',
    'insights.confidence': 'الثقة',
    'insights.noQueries': 'لا توجد استعلامات بعد. اطرح سؤالك الأول أعلاه!',
    
    // Career Journey
    'career.title': 'رحلة المهنة',
    'career.description': 'تتبع معالم ومنجزات المهنة',
    'career.careerTimeline': 'الجدول الزمني للمهنة',
    'career.achievements': 'الإنجازات',
    'career.medals': 'الميداليات',
    'career.competitions': 'المسابقات',
    'career.worldChampionships': 'البطولات العالمية',
    'career.asianGames': 'الألعاب الآسيوية',
    'career.olympics': 'الألعاب الأولمبية',
    
    // Opponents
    'opponents.title': 'قائمة المنافسين',
    'opponents.description': 'تحليل وتتبع المنافسين التنافسيين',
    'opponents.threatLevel': 'مستوى التهديد',
    'opponents.high': 'عالي',
    'opponents.medium': 'متوسط',
    'opponents.low': 'منخفض',
    'opponents.critical': 'حرج',
    'opponents.winRate': 'معدل الفوز',
    'opponents.lastMatch': 'المباراة الأخيرة',
    'opponents.nextMatch': 'المباراة التالية',
    'opponents.viewAnalysis': 'عرض التحليل',
    
    // Opponent Analysis
    'opponentAnalysis.title': 'تحليل المنافسين بالذكاء الاصطناعي',
    'opponentAnalysis.description': 'تحليل عميق لاستراتيجيات المنافسين',
    'opponentAnalysis.selectOpponent': 'اختر منافساً للتحليل',
    'opponentAnalysis.tacticalBreakdown': 'التحليل التكتيكي',
    'opponentAnalysis.weaknesses': 'نقاط الضعف الرئيسية',
    'opponentAnalysis.strengths': 'نقاط قوة المنافس',
    'opponentAnalysis.winProbability': 'احتمالية الفوز',
    'opponentAnalysis.recommendations': 'التوصيات الاستراتيجية',
    
    // Live Match
    'liveMatch.title': 'تحليل المباراة المباشرة',
    'liveMatch.description': 'رؤى واقتراحات المباراة في الوقت الفعلي',
    'liveMatch.currentScore': 'النتيجة الحالية',
    'liveMatch.round': 'الجولة',
    'liveMatch.timeRemaining': 'الوقت المتبقي',
    'liveMatch.momentum': 'الزخم',
    'liveMatch.suggestions': 'الاقتراحات المباشرة',
    'liveMatch.startMatch': 'بدء المباراة',
    'liveMatch.endMatch': 'إنهاء المباراة',
    
    // Training Planner
    'trainingPlanner.title': 'مخطط التدريب',
    'trainingPlanner.description': 'جداول التدريب بالذكاء الاصطناعي',
    'trainingPlanner.generatePlan': 'إنشاء خطة تدريب',
    'trainingPlanner.weeklyPlan': 'الخطة الأسبوعية للتدريب',
    'trainingPlanner.dailySchedule': 'الجدول اليومي',
    'trainingPlanner.intensity': 'الشدة',
    'trainingPlanner.duration': 'المدة',
    'trainingPlanner.focus': 'مجالات التركيز',
    
    // Injury Prevention
    'injury.title': 'منع الإصابات',
    'injury.description': 'رؤى صحية تنبؤية ووقاية',
    'injury.riskAssessment': 'تقييم المخاطر',
    'injury.overallRisk': 'المخاطر العامة',
    'injury.riskFactors': 'عوامل الخطر',
    'injury.recommendations': 'توصيات الوقاية',
    'injury.recoveryPlan': 'خطة التعافي',
    'injury.biomechanicalAnalysis': 'التحليل البيوميكانيكي',
    
    // Tactical Training
    'tactical.title': 'التدريب التكتيكي',
    'tactical.description': 'تدريبات تكتيكية موجهة بالذكاء الاصطناعي',
    'tactical.startSession': 'بدء جلسة التدريب',
    'tactical.currentDrill': 'التدريب الحالي',
    'tactical.progress': 'تقدم الجلسة',
    'tactical.feedback': 'ملاحظات الذكاء الاصطناعي',
    'tactical.nextStep': 'الخطوة التالية',
    'tactical.quickStart': 'بداية سريعة',
    'tactical.customTraining': 'تدريب مخصص',
    'tactical.offensiveDrills': 'تدريبات هجومية',
    'tactical.defensiveTraining': 'التدريب الدفاعي',
    'tactical.counterAttack': 'الهجوم المضاد',
    'tactical.attackCombinations': 'تركيبات الهجوم وتقنيات الإحراز',
    'tactical.blockingDodging': 'الحجب والمراوغة والدفاع المضاد',
    'tactical.timingCounters': 'توقيت والهجمات المضادة المتفجرة',
    'tactical.startTraining': 'بدء التدريب',
    
    // Motivation Hub
    'motivation.title': 'مركز التحفيز',
    'motivation.description': 'التحفيز الشخصي وتتبع الأهداف',
    'motivation.goals': 'الأهداف',
    'motivation.achievements': 'الإنجازات',
    'motivation.progress': 'التقدم',
    'motivation.inspiration': 'الإلهام اليومي',
    
    // Performance Data
    'performance.score': 'نتيجة الأداء',
    'performance.trend': 'الاتجاه',
    'performance.improving': 'في تحسن',
    'performance.stable': 'مستقر',
    'performance.declining': 'في تراجع',
    'performance.excellent': 'ممتاز',
    'performance.good': 'جيد',
    'performance.average': 'متوسط',
    'performance.needsImprovement': 'يحتاج تحسين',
    
    // Athlete Data
    'athlete.name': 'الاسم',
    'athlete.sport': 'الرياضة',
    'athlete.nationality': 'الجنسية',
    'athlete.rank': 'التصنيف',
    'athlete.coach': 'المدرب',
    'athlete.headCoach': 'المدرب الرئيسي',
    'athlete.taekwondo': 'التايكوندو',
    'athlete.egypt': 'مصر',
    'athlete.egyptian': 'مصري',
    
    // Coach Information
    'coach.ahmedHassan': 'أحمد حسن',
    'coach.mohamedAli': 'محمد علي',
    'coach.faridElSayed': 'فريد السيد',
    'coach.ahmedFarouk': 'أحمد فاروق',
    'coach.yasminKhaled': 'ياسمين خالد',
    'coach.omarMahmoud': 'عمر محمود',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ في تحميل البيانات',
    'common.tryAgain': 'يرجى المحاولة مرة أخرى لاحقاً',
    'common.noData': 'لا توجد بيانات متاحة',
    'common.exportReport': 'تصدير التقرير',
    'common.viewAnalysis': 'عرض التحليل الكامل',
    'common.probability': 'الاحتمالية',
    'common.achieved': 'تم تحقيقه',
    'common.nextGoal': 'الهدف التالي',
    'common.spotsToGo': 'مراكز للوصول',
    'common.spotsNeeded': 'مراكز مطلوبة',
    'common.search': 'بحث',
    'common.select': 'اختيار',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.close': 'إغلاق',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
  }
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return { language, setLanguage, t };
}