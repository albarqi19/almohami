import { apiClient } from '../utils/api';

// Types
export interface WathqInquiry {
    id: number;
    tenant_id: number;
    user_id: number;
    service_type: string;
    endpoint: string;
    query_params: Record<string, string>;
    response_data: Record<string, unknown> | null;
    status: 'success' | 'failed' | 'error';
    error_message: string | null;
    ip_address: string | null;
    response_time_ms: number | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
    };
}

export interface WathqInquiryResponse {
    success: boolean;
    message: string;
    data: Record<string, unknown>;
    inquiry_id?: number;
    error?: string;
}

export interface WathqInquiriesListResponse {
    success: boolean;
    data: {
        data: WathqInquiry[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    service_types: Record<string, string>;
}

// Service Types Map (Arabic names)
export const SERVICE_TYPES: Record<string, string> = {
    commercial_registration: 'السجل التجاري',
    company_contract: 'عقود الشركات',
    power_of_attorney: 'الوكالات العدلية',
    real_estate_deed: 'الصكوك العقارية',
    national_address: 'العنوان الوطني',
    employee_data: 'بيانات الموظف',
};

// CR Endpoint Options
export const CR_ENDPOINTS: Record<string, string> = {
    fullinfo: 'معلومات كاملة',
    info: 'معلومات أساسية',
    branches: 'الفروع',
    status: 'الحالة',
    capital: 'رأس المال',
    managers: 'المديرون',
    owners: 'الملاك',
};

// Company Contract Endpoints
export const CC_ENDPOINTS: Record<string, string> = {
    info: 'معلومات العقد',
    management: 'الإدارة',
};

// Real Estate ID Types
export const RE_ID_TYPES: Record<string, string> = {
    National_ID: 'هوية وطنية',
    Resident_ID: 'هوية مقيم',
    Passport: 'جواز سفر',
    CR_NO: 'سجل تجاري',
    Unified_National_Number: 'رقم وطني موحد',
    Entity_Number: 'رقم المنشأة',
    Border_Number: 'رقم الحدود',
    GCC_ID: 'هوية خليجية',
};

// Arabic field labels for all Wathq API responses
export const WATHQ_FIELD_LABELS: Record<string, string> = {
    // السجل التجاري
    crNationalNumber: 'الرقم الوطني الموحد',
    crNumber: 'رقم السجل التجاري',
    versionNo: 'رقم الإصدار',
    name: 'الاسم',
    nameLangId: 'رمز لغة الاسم',
    nameLangDesc: 'لغة الاسم',
    crCapital: 'رأس المال',
    companyDuration: 'مدة الشركة',
    duration: 'مدة الشركة',
    isMain: 'سجل رئيسي',
    issueDateGregorian: 'تاريخ الإصدار (ميلادي)',
    issueDateHijri: 'تاريخ الإصدار (هجري)',
    mainCrNationalNumber: 'الرقم الوطني للسجل الرئيسي',
    mainCrNumber: 'رقم السجل الرئيسي',
    inLiquidationProcess: 'تحت التصفية',
    hasEcommerce: 'تجارة إلكترونية',
    headquarterCityId: 'رمز مدينة المقر',
    headquarterCityName: 'مدينة المقر',
    isLicenseBased: 'مبني على ترخيص',
    licenseIssuerNationalNumber: 'الرقم الوطني لجهة الترخيص',
    licenseIssuerName: 'جهة الترخيص',
    partnersNationalityId: 'رمز جنسية الشركاء',
    partnersNationalityName: 'جنسية الشركاء',
    PartnersNationalityName: 'جنسية الشركاء',
    confirmationDate: 'تاريخ التأكيد',
    reactivationDate: 'تاريخ إعادة التفعيل',
    suspensionDate: 'تاريخ الإيقاف',
    deletionDate: 'تاريخ الشطب',
    entityType: 'نوع المنشأة',
    formId: 'رمز الشكل القانوني',
    formName: 'الشكل القانوني',
    characters: 'الخصائص',
    status: 'الحالة',
    contactInfo: 'معلومات التواصل',
    phoneNo: 'هاتف',
    mobileNo: 'جوال',
    email: 'بريد إلكتروني',
    websiteUrl: 'الموقع الإلكتروني',
    eCommerce: 'التجارة الإلكترونية',
    eStore: 'المتجر الإلكتروني',
    authenticationPlatformUrl: 'رابط منصة التوثيق',
    storeUrl: 'رابط المتجر',
    storeActivities: 'أنشطة المتجر',
    capital: 'رأس المال',
    currencyId: 'رمز العملة',
    currencyName: 'العملة',
    contributionCapital: 'رأس مال المساهمة',
    stockCapital: 'رأس مال الأسهم',
    cashCapital: 'رأس المال النقدي',
    inKindCapital: 'رأس المال العيني',
    contributionValue: 'قيمة المساهمة',
    totalCashContribution: 'إجمالي المساهمة النقدية',
    totalInKindContribution: 'إجمالي المساهمة العينية',
    announcedCapital: 'رأس المال المعلن',
    paidCapital: 'رأس المال المدفوع',
    stocks: 'الأسهم',
    count: 'العدد',
    value: 'القيمة',
    classReferenceID: 'مرجع الفئة',
    className: 'اسم الفئة',
    fiscalYear: 'السنة المالية',
    isFirst: 'السنة الأولى',
    calendarTypeId: 'رمز نوع التقويم',
    calendarTypeName: 'نوع التقويم',
    endMonth: 'شهر الانتهاء',
    endDay: 'يوم الانتهاء',
    endYear: 'سنة الانتهاء',
    parties: 'الشركاء',
    partnership: 'الشراكة',
    partnerShare: 'حصة الشريك',
    cashContributionCount: 'الحصص النقدية',
    inKindContributionCount: 'الحصص العينية',
    totalContributionCount: 'إجمالي الحصص',
    management: 'الإدارة',
    structureId: 'رمز هيكل الإدارة',
    structureName: 'هيكل الإدارة',
    managers: 'المديرون',
    isLicensed: 'مرخص',
    liquidators: 'المصفون',
    activities: 'الأنشطة',
    id: 'الرقم',
    typeId: 'رمز النوع',
    typeName: 'النوع',
    identity: 'الهوية',
    nationality: 'الجنسية',
    positions: 'المناصب',
    // عقود الشركات
    contractCopyNumber: 'رقم نسخة العقد',
    contractDate: 'تاريخ العقد',
    entity: 'بيانات المنشأة',
    notificationChannel: 'قناة الإخطار',
    partnerDecision: 'قرارات الشركاء',
    approvePercentage: 'نسبة الموافقة',
    additionalDecisionText: 'نص إضافي للقرار',
    setAsideDetails: 'تفاصيل الاحتياطي',
    managementBoard: 'مجلس المديرين',
    directorsBoard: 'مجلس الإدارة',
    dismissalMethod: 'طريقة العزل',
    meetingQuorumId: 'رمز نصاب الاجتماع',
    meetingQuorumName: 'نصاب الاجتماع',
    canDelegateAttendance: 'يمكن تفويض الحضور',
    termYears: 'المدة بالسنوات',
    wayOfWork: 'طريقة العمل',
    meetingPlace: 'مكان الاجتماع',
    additionalText: 'نص إضافي',
    guardian: 'الولي',
    isFatherGuardian: 'ولاية الأب',
    partnerProfitLossDistribution: 'توزيع الأرباح والخسائر',
    profitDistribution: 'توزيع الأرباح',
    lossDistribution: 'توزيع الخسائر',
    // الوكالات العدلية
    attorneyNumber: 'رقم الوكالة',
    expiryDate: 'تاريخ الانتهاء',
    attorneyType: 'نوع الوكالة',
    attorneyTypeName: 'نوع الوكالة',
    AllowedToActOnBehalf: 'المخولون بالتصرف',
    principals: 'الموكلون',
    agents: 'الوكلاء',
    agentsBehavior: 'تصرف الوكلاء',
    attorneyText: 'نص الوكالة',
    textList: 'قائمة الصلاحيات',
    text: 'النص',
    type: 'النوع',
    IdentityNo: 'رقم الهوية',
    SocialTypeID: 'رمز نوع الهوية',
    SocialTypeName: 'نوع الهوية',
    Name: 'الاسم',
    Type: 'النوع',
    TypeName: 'النوع',
    TypeNameEn: 'النوع (إنجليزي)',
    SefaId: 'رمز الصفة',
    SefaID: 'رمز الصفة',
    SefaName: 'الصفة',
    NationalNumber: 'الرقم الوطني',
    CRNumber: 'رقم السجل التجاري',
    KararNumber: 'رقم القرار',
    MalakiNumber: 'رقم الصك الملكي',
    DocumentTypeName: 'نوع المستند',
    CompanyRepresentTypeID: 'رمز نوع تمثيل الشركة',
    CompanyRepresentTypeName: 'نوع تمثيل الشركة',
    SakkNumber: 'رقم الصك',
    controlLable: 'التسمية',
    childControls: 'الخيارات الفرعية',
    birthday: 'تاريخ الميلاد',
    // الصكوك العقارية
    deedDetails: 'تفاصيل الصك',
    deedNumber: 'رقم الصك',
    deedSerial: 'الرقم التسلسلي للصك',
    deedDate: 'تاريخ الصك',
    deedText: 'نص الصك',
    courtDetails: 'بيانات المحكمة',
    deedSource: 'مصدر الصك',
    deedCity: 'المدينة',
    deedStatus: 'حالة الصك',
    deedInfo: 'معلومات العقار',
    deedArea: 'المساحة',
    deedAreaText: 'المساحة نصاً',
    isRealEstateConstrained: 'مقيد',
    isRealEstateHalted: 'موقوف',
    isRealEstateMortgaged: 'مرهون',
    isRealEstateTestamented: 'موصى به',
    ownerDetails: 'بيانات الملاك',
    ownerName: 'اسم المالك',
    birthDate: 'تاريخ الميلاد',
    idNumber: 'رقم الهوية',
    idType: 'رمز نوع الهوية',
    idTypeText: 'نوع الهوية',
    ownerType: 'نوع المالك',
    owningArea: 'مساحة التملك',
    owningAmount: 'نسبة التملك',
    constrained: 'مقيد',
    halt: 'موقوف',
    pawned: 'مرهون',
    testament: 'موصى به',
    deedLimitsDetails: 'حدود العقار',
    northLimitName: 'الحد الشمالي',
    northLimitDescription: 'وصف الحد الشمالي',
    northLimitLength: 'طول الحد الشمالي',
    northLimitLengthChar: 'طول الحد الشمالي نصاً',
    southLimitName: 'الحد الجنوبي',
    southLimitDescription: 'وصف الحد الجنوبي',
    southLimitLength: 'طول الحد الجنوبي',
    southLimitLengthChar: 'طول الحد الجنوبي نصاً',
    eastLimitName: 'الحد الشرقي',
    eastLimitDescription: 'وصف الحد الشرقي',
    eastLimitLength: 'طول الحد الشرقي',
    eastLimitLengthChar: 'طول الحد الشرقي نصاً',
    westLimitName: 'الحد الغربي',
    westLimitDescription: 'وصف الحد الغربي',
    westLimitLength: 'طول الحد الغربي',
    westLimitLengthChar: 'طول الحد الغربي نصاً',
    realEstateDetails: 'تفاصيل العقار',
    regionCode: 'رمز المنطقة',
    regionName: 'المنطقة',
    cityCode: 'رمز المدينة',
    cityName: 'المدينة',
    realEstateTypeName: 'نوع العقار',
    landNumber: 'رقم القطعة',
    planNumber: 'رقم المخطط',
    area: 'المساحة',
    areaText: 'المساحة نصاً',
    districtCode: 'رمز الحي',
    districtName: 'الحي',
    locationDescription: 'وصف الموقع',
    // العنوان الوطني
    title: 'الاسم',
    address: 'العنوان',
    address2: 'العنوان الإضافي',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
    buildingNumber: 'رقم المبنى',
    street: 'الشارع',
    district: 'الحي',
    districtId: 'رقم الحي',
    city: 'المدينة',
    cityId: 'رقم المدينة',
    postCode: 'الرمز البريدي',
    additionalNumber: 'الرقم الإضافي',
    regionId: 'رقم المنطقة',
    isPrimaryAddress: 'عنوان رئيسي',
    unitNumber: 'رقم الوحدة',
    restriction: 'القيود',
    pkAddressId: 'معرف العنوان',
    // بيانات الموظف
    workingMonths: 'أشهر العمل',
    employmentInfo: 'بيانات التوظيف',
    employer: 'جهة العمل',
    wage: 'الراتب',
    startDate: 'تاريخ البداية',
    gregorian: 'ميلادي',
    hijri: 'هجري',
    ar: 'عربي',
    en: 'إنجليزي',
};

// Fields to hide (internal IDs not useful for display)
// No fields hidden - show everything from the API response
export const HIDDEN_FIELDS = new Set<string>();

class WathqService {
    // السجل التجاري
    async commercialRegistration(crNumber: string, endpoint: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/commercial-registration/inquiry', {
            cr_number: crNumber,
            endpoint,
        });
    }

    // السجل التجاري - سجلات مرتبطة
    async commercialRegistrationRelated(id: string, idType: string, endpoint: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/commercial-registration/related', {
            id,
            id_type: idType,
            endpoint,
        });
    }

    // عقود الشركات
    async companyContract(crNationalNumber: string, endpoint: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/company-contract/inquiry', {
            cr_national_number: crNationalNumber,
            endpoint,
        });
    }

    // عقود الشركات - مدير محدد
    async companyContractManager(crNationalNumber: string, id: string, idType: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/company-contract/manager', {
            cr_national_number: crNationalNumber,
            id,
            id_type: idType,
        });
    }

    // الوكالات العدلية
    async attorney(code: string, principalId?: string, agentId?: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/attorney/inquiry', {
            code,
            principal_id: principalId || undefined,
            agent_id: agentId || undefined,
        });
    }

    // الصكوك العقارية
    async realEstate(deedNumber: string, idNumber: string, idType: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/real-estate/inquiry', {
            deed_number: deedNumber,
            id_number: idNumber,
            id_type: idType,
        });
    }

    // العنوان الوطني
    async nationalAddress(crNumber: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/national-address/inquiry', {
            cr_number: crNumber,
        });
    }

    // بيانات الموظف
    async employee(id: string): Promise<WathqInquiryResponse> {
        return apiClient.post('/wathq/employee/inquiry', { id });
    }

    // الاستعلامات السابقة
    async getInquiries(params: {
        service_type?: string;
        status?: string;
        search?: string;
        page?: number;
        per_page?: number;
    } = {}): Promise<WathqInquiriesListResponse> {
        const searchParams = new URLSearchParams();
        if (params.service_type) searchParams.set('service_type', params.service_type);
        if (params.status) searchParams.set('status', params.status);
        if (params.search) searchParams.set('search', params.search);
        if (params.page) searchParams.set('page', params.page.toString());
        if (params.per_page) searchParams.set('per_page', params.per_page.toString());

        const query = searchParams.toString();
        return apiClient.get(`/wathq/inquiries${query ? `?${query}` : ''}`);
    }

    // تفاصيل استعلام سابق
    async getInquiryDetails(id: number): Promise<{ success: boolean; data: WathqInquiry }> {
        return apiClient.get(`/wathq/inquiries/${id}`);
    }

    // حالة إعدادات واثق
    async getSettingsStatus(): Promise<{
        success: boolean;
        data: { has_credentials: boolean; is_tenant_key: boolean; api_key_masked: string };
    }> {
        return apiClient.get('/wathq/settings/status');
    }

    // حفظ إعدادات واثق
    async saveSettings(apiKey: string, apiSecret?: string): Promise<{ success: boolean; message: string }> {
        return apiClient.post('/wathq/settings', {
            api_key: apiKey,
            api_secret: apiSecret || undefined,
        });
    }
}

export const wathqService = new WathqService();
