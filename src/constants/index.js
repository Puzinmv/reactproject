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
        "jobOnTrip": '<figure><table style="width: 606px;"><tbody><tr><td style="width: 19px; text-align: center;"><p>№</p></td><td style="width: 251px;"><p style="text-align: center;">Адрес(а)для проведения работ:</p></td><td style="width: 93px;"><p style="text-align: center;">Количество дней</p></td><td style="width: 209px;"><p style="text-align: center;">Какие работы проводятся по указанным адресам:</p></td></tr><tr><td style="width: 19px; text-align: center;"><p>1.</p></td><td style="width: 251px;">&nbsp;</td><td style="width: 93px;">&nbsp;</td><td style="width: 209px;">&nbsp;</td></tr><tr><td style="width: 19px; text-align: center;"><p>2.</p></td><td style="width: 251px;">&nbsp;</td><td style="width: 93px;">&nbsp;</td><td style="width: 209px;">&nbsp;</td></tr></tbody></table ></figure > ',
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
        "dateStart": "",
        "deadline": "",
        "Files": [],
        "priceAproved": false,
        "jobCalculated": false,
        "CommentJob": "",
        "initiator": {
            "id": CurrentUser.id,
            "first_name": CurrentUser.first_name,
            "last_name": CurrentUser.last_name,
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
    { columnId: 'resourceSumm', label: 'Длительность', visible: true },
    { columnId: 'frameSumm', label: 'Трудозатраты', visible: true },
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