
// Константы для ролей
export const ROLES = {
    ADMIN: 'Admin',
    TECHNICAL: 'Technical',
    COMMERCIAL: 'Commercial'
  };
  
  // Константы для компаний
  export const COMPANIES = {
    ASTERIT: 'Астерит',
    PROFINTEG: 'Профинтег'
  };
  
  // Константы для email адресов
  export const EMAILS = {
    ADMIN: 'puzin.m.v@asterit.ru'
  };
  
  // Константы для предупреждений
  export const WARNING_MESSAGES = {
    ONLY_EXECUTORS: 'Измения может вносить только отдел исполнителей',
    START_PROJECT_SOON: 'На подготовку менее 14 дней. Согласуйте страт проекта с исполнителями'
  };
  
  // Константы для полей формы
  export const FORM_FIELDS = {
    COMMENT_JOB: 'CommentJob',
    HIRED_COST: 'HiredCost',
    HIRED: 'Hired',
    OPEN_PROJECT_TEMPLATE_ID: 'OpenProject_Template_id',
    LIMITATIONS: 'Limitations',
  
  };
  
// Статусы карточки 
export const STATUS = {
    NEW_CARD: 'Новая карта',
    LABOR_COSTS_ESTIMATED: 'Оценка трудозатрат проведена',
    ECONOMICS_AGREED: 'Экономика согласована',
    PROJECT_STARTED: 'Проект выполняется'
  };
export const STATUS_COLORS = {
    [STATUS.NEW_CARD]: 'primary.main',
    [STATUS.LABOR_COSTS_ESTIMATED]: 'warning.main',
    [STATUS.ECONOMICS_AGREED]: 'secondary.main',
    [STATUS.PROJECT_STARTED]: 'success.main',
};
  
export const getNewCardData = (CurrentUser) => {
    return {
        "status": "Новая карта",
        "title": "",
        "Description": "",
        "Customer": "",
        "CustomerCRMID": "",
        "CustomerContact": "",
        "CustomerContactCRMID": "",
        "CustomerContactTel": "",
        "CustomerContactEmail": "",
        "CustomerContactJobTitle": "",
        "ProjectScope": "",
        "JobDescription": [],
        "resourceSumm": 0,
        "frameSumm": 0,
        "Limitations": "",
        "Price": 0,
        "Cost": 0,
        "tiketsCost": 0,
        "tiketsCostDescription": "",
        "HotelCost": 0,
        "HotelCostDescription": "",
        "dailyCost": 0,
        "dailyCostDescription": "",
        "otherPayments": 0,
        "otherPaymentsDescription": "",
        "company": "",
        "contract": "",
        "Files": [],
        "priceAproved": false,
        "jobCalculated": false,
        "CommentJob": "",
        "initiator": {
            "id": CurrentUser.id,
            "first_name": CurrentUser.first_name || '',
            "last_name": CurrentUser.last_name || '',
        },
        "Department": { id: '', Department: '' }
    }
}

export const FIELD_NAMES = [
    { columnId: 'id', label: 'ID', visible: true },
    { columnId: 'initiator', label: 'Инициатор', visible: true },
    { columnId: 'title', label: 'Название', visible: true },
    { columnId: 'Customer', label: 'Заказчик', visible: true },
    { columnId: 'Department', label: 'Отдел', visible: true },
    { columnId: 'status', label: 'Статус', visible: true },
    { columnId: 'resourceSumm', label: 'Трудозатраты', visible: true },
    { columnId: 'frameSumm', label: 'Длительность', visible: true },
    { columnId: 'Price', label: 'Цена', visible: false },
    { columnId: 'Cost', label: 'Себестоимость', visible: false },
    { columnId: 'Description', label: 'Описание', visible: false },
    { columnId: 'CustomerCRMID', label: 'ID Заказчика CRM', visible: false },
    { columnId: 'CustomerContact', label: 'Контактное лицо', visible: false },
    { columnId: 'CustomerContactCRMID', label: 'ID Контактного лица CRM', visible: false },
    { columnId: 'CustomerContactTel', label: 'Телефон контактного лица', visible: false },
    { columnId: 'CustomerContactEmail', label: 'Email контактного лица', visible: false },
    { columnId: 'CustomerContactJobTitle', label: 'Должность контактного лица', visible: false },
    { columnId: 'ProjectScope', label: 'Ограничения от клиента', visible: false },
    { columnId: 'JobDescription', label: 'Описание работ', visible: false },
    { columnId: 'jobOnTrip', label: 'Работа на выезде', visible: false },
    { columnId: 'Limitations', label: 'Ограничения от исполнителей', visible: false },
    { columnId: 'tiketsCost', label: 'Стоимость билетов', visible: false },
    { columnId: 'tiketsCostDescription', label: 'Описание стоимости билетов', visible: false },
    { columnId: 'HotelCost', label: 'Стоимость проживания', visible: false },
    { columnId: 'HotelCostDescription', label: 'Описание стоимости проживания', visible: false },
    { columnId: 'dailyCost', label: 'Суточные расходы', visible: false },
    { columnId: 'dailyCostDescription', label: 'Описание суточных расходов', visible: false },
    { columnId: 'otherPayments', label: 'Другие платежи', visible: false },
    { columnId: 'otherPaymentsDescription', label: 'Описание других платежей', visible: false },
    { columnId: 'company', label: 'Компания', visible: false },
    { columnId: 'contract', label: 'Договор', visible: false },
    { columnId: 'dateStart', label: 'Дата начала', visible: false },
    { columnId: 'deadline', label: 'Срок сдачи', visible: false },
    { columnId: 'Files', label: 'Файлы', visible: false },
    { columnId: 'user_created', label: 'Создал', visible: false },
    { columnId: 'date_created', label: 'Дата создания', visible: false },
    { columnId: 'user_updated', label: 'Изменил', visible: false },
    { columnId: 'date_updated', label: 'Дата обновления', visible: false },
];

export default getNewCardData;