export type Lang = 'en' | 'ar'

export const translations = {
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How it Works',
      team: 'Team',
      contact: 'Contact',
    },
    hero: {
      badge: 'Built for Mentra Live Smart Glasses',
      titleLine1: 'See the world',
      titleLine2: 'through AI-powered voice',
      desc: 'Suhail is an AI assistant for visually impaired users. It uses smart glasses to describe scenes, read text, recognize faces, and more — all through natural voice.',
      cta1: 'Explore Features',
      cta2: 'How it Works',
    },
    features: {
      label: 'Features',
      title: 'Everything you need, spoken to you',
      desc: 'Suhail combines multiple AI capabilities into one seamless voice experience on your smart glasses.',
      items: [
        {
          title: 'Scene Description',
          desc: 'Ask "What\'s around me?" and get a detailed spoken description of your surroundings.',
        },
        {
          title: 'Text Reading',
          desc: 'Point at any text — signs, labels, documents — and hear it read aloud instantly.',
        },
        {
          title: 'Face Recognition',
          desc: 'Enroll friends and family. Suhail recognizes and announces who is in front of you.',
        },
        {
          title: 'Object Finder',
          desc: '"Where are my keys?" — Suhail locates objects and tells you their position.',
        },
        {
          title: 'Currency Recognition',
          desc: 'Identify banknotes and denominations by simply pointing the camera.',
        },
        {
          title: 'Color Detection',
          desc: '"What color is this?" — get instant color identification for clothing, objects, and more.',
        },
      ],
    },
    howItWorks: {
      label: 'How it Works',
      title: 'Simple by design',
      desc: 'No screens, no apps to navigate. Just speak and listen.',
      steps: [
        { title: 'Wear the Glasses', desc: 'Put on your Mentra Live smart glasses — lightweight and comfortable for all-day use.' },
        { title: 'Speak or Press', desc: 'Use voice commands or button presses to trigger any of Suhail\'s AI features.' },
        { title: 'AI Processes', desc: 'The camera captures the scene and cloud AI analyzes it in seconds.' },
        { title: 'Hear the Answer', desc: 'Results are spoken back to you through the glasses\' built-in speakers.' },
      ],
    },
    team: {
      label: 'Team',
      title: 'Built by students, for impact',
      desc: 'A graduation project from King Saud University — SWE 496.',
    },
    cta: {
      title: 'Ready to experience Suhail?',
      desc: 'Get in touch to see a live demo with Mentra Live glasses.',
      button: 'Contact Us',
    },
    footer: {
      copy: '© 2026 Suhail. King Saud University — SWE 496.',
    },
  },
  ar: {
    nav: {
      features: 'المميزات',
      howItWorks: 'كيف يعمل',
      team: 'الفريق',
      contact: 'تواصل معنا',
    },
    hero: {
      badge: 'مصمم لنظارات Mentra Live الذكية',
      titleLine1: 'شوف العالم',
      titleLine2: 'بقوة الذكاء الاصطناعي',
      desc: 'سهيل مساعد ذكي يخدم المكفوفين وضعاف البصر. يستخدم النظارات الذكية عشان يوصف المشاهد، يقرأ النصوص، يتعرف على الوجوه، وأكثر — كل شي بالصوت.',
      cta1: 'استكشف المميزات',
      cta2: 'كيف يعمل',
    },
    features: {
      label: 'المميزات',
      title: 'كل شي تحتاجه، يوصلك بالصوت',
      desc: 'سهيل يجمع قدرات ذكاء اصطناعي متعددة في تجربة صوتية سلسة على نظارتك الذكية.',
      items: [
        {
          title: 'وصف المشهد',
          desc: 'اسأل "وش حولي؟" وسهيل يوصف لك المكان بالتفصيل.',
        },
        {
          title: 'قراءة النصوص',
          desc: 'وجّه الكاميرا على أي نص — لوحات، ملصقات، مستندات — واسمعه فورًا.',
        },
        {
          title: 'التعرف على الوجوه',
          desc: 'سجّل أهلك وأصحابك. سهيل يعرفهم ويقولك مين قدامك.',
        },
        {
          title: 'البحث عن الأشياء',
          desc: '"وين مفاتيحي؟" — سهيل يحدد مكان الشي ويوصف لك وينه.',
        },
        {
          title: 'التعرف على العملات',
          desc: 'عرّف الفلوس والأوراق النقدية بس وجّه الكاميرا عليها.',
        },
        {
          title: 'كشف الألوان',
          desc: '"وش لون هذا؟" — تعرف على الألوان فورًا للملابس والأشياء وغيرها.',
        },
      ],
    },
    howItWorks: {
      label: 'كيف يعمل',
      title: 'بسيط بتصميمه',
      desc: 'بدون شاشات، بدون تطبيقات معقدة. بس تكلّم واسمع.',
      steps: [
        { title: 'البس النظارة', desc: 'البس نظارات Mentra Live الذكية — خفيفة ومريحة طول اليوم.' },
        { title: 'تكلّم أو اضغط', desc: 'استخدم الأوامر الصوتية أو الأزرار عشان تشغّل أي ميزة من مميزات سهيل.' },
        { title: 'الذكاء الاصطناعي يشتغل', desc: 'الكاميرا تلتقط المشهد والذكاء الاصطناعي يحلله في ثواني.' },
        { title: 'اسمع الجواب', desc: 'النتيجة توصلك بالصوت من سماعات النظارة.' },
      ],
    },
    team: {
      label: 'الفريق',
      title: 'من تصميم طلاب، لأثر حقيقي',
      desc: 'مشروع تخرج من جامعة الملك سعود — SWE 496.',
    },
    cta: {
      title: 'جاهز تجرب سهيل؟',
      desc: 'تواصل معنا عشان تشوف عرض مباشر على نظارات Mentra Live.',
      button: 'تواصل معنا',
    },
    footer: {
      copy: '© 2026 سهيل. جامعة الملك سعود — SWE 496.',
    },
  },
} as const

export function t(lang: Lang) {
  return translations[lang]
}
