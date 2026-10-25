// All user-facing Arabic (Egyptian) strings live here.

export const strings = {
  app: {
    name: "خدمتي",
    fullName: "خدمتي — إدارة خدمات مدارس الأحد",
    description: "إدارة الفصول والخدام والمخدومين والنقاط والمسابقات والافتقاد",
  },
  common: {
    loading: "جاري التحميل…",
    or: "أو",
    genericError: "حصلت مشكلة، حاول تاني.",
  },
  auth: {
    loginTitle: "تسجيل الدخول",
    loginSubtitle: "ادخل بالموبايل أو الإيميل",
    signupTitle: "حساب جديد",
    signupSubtitle: "اعمل حسابك عشان تنضم لخدمتك",
    identifier: "رقم الموبايل أو الإيميل",
    identifierPlaceholder: "01xxxxxxxxx",
    fullName: "الاسم بالكامل",
    fullNamePlaceholder: "اكتب اسمك الثلاثي",
    phone: "رقم الموبايل",
    password: "كلمة السر",
    passwordHint: "٦ حروف أو أرقام على الأقل",
    login: "دخول",
    signup: "اعمل الحساب",
    logout: "خروج",
    noAccount: "معندكش حساب؟",
    haveAccount: "عندك حساب؟",
    createAccount: "اعمل حساب جديد",
    goLogin: "سجل دخول",
    errors: {
      invalidIdentifier: "اكتب رقم موبايل مصري صحيح أو إيميل صحيح.",
      invalidPhone: "اكتب رقم موبايل مصري صحيح (مثلاً 01012345678).",
      invalidEmail: "الإيميل مش صحيح.",
      nameRequired: "اكتب اسمك.",
      passwordShort: "كلمة السر لازم تكون ٦ حروف على الأقل.",
      badCredentials: "البيانات غلط، راجع الرقم أو الإيميل وكلمة السر.",
      alreadyRegistered: "الرقم أو الإيميل ده متسجل قبل كده. جرب تسجل دخول.",
    },
  },
  home: {
    welcome: (name: string) => (name ? `أهلاً يا ${name}` : "أهلاً بيك"),
    pickService: "اختار الخدمة",
    noMemberships:
      "لسه مش منضم لأي خدمة. امسح كود الانضمام من خادم الفصل أو اطلب من مسؤول الخدمة يضيفك.",
  },
  offline: {
    title: "مفيش إنترنت",
    body: "اتأكد إنك متصل بالإنترنت وجرب تاني.",
    retry: "حاول تاني",
  },
} as const;
