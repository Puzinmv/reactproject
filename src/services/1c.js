import axios from 'axios';
import Fuse from 'fuse.js';

const LINKS ={
    MAIN: 'https://1c.asterit.ru/ut_11_5_asterit/odata/standard.odata/',
    USER: 'Catalog_Пользователи'
 }
const API_KEY = '0J7QsdC80LXQvTpuRTZ6YW1hcA=='
const THRESHOLD = 0.3 
const COUNTERPARTY_CATALOG = 'Catalog_\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u044b';
const PARTNER_KEY_FIELD = '\u041f\u0430\u0440\u0442\u043d\u0435\u0440_Key';
const INN_FIELD = '\u0418\u041d\u041d';
const normalizeSearchValue = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');


export const GetUser1C = async (fullNameQuery) => {
    try {
        const normalizedQuery = normalizeSearchValue(fullNameQuery);
        if (!normalizedQuery) {
            return null;
        }

        const config = {
            method: 'get',
            url: `${LINKS.MAIN}Catalog_Пользователи?$format=json&$select=Description,Ref_Key`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + API_KEY
            },
        };

        const response = await axios.request(config);

        if (response.status === 200) {
            // console.log("Запрос успешно выполнен", response.data.value);
            const fuse = new Fuse(response.data.value, {
                keys: ['Description'],
                includeScore: true,
                threshold: THRESHOLD,
            });
            const result = fuse.search(normalizedQuery);
            if (result.length > 0) {
                const bestMatch = result[0].item;
                console.log(`Найден пользователь: ${bestMatch.Description}`);
                return bestMatch.Ref_Key;
            } else {
                console.log('Пользователь не найден');
                return null;
            }
        } else {
            console.error('Непредвиденный статус ответа:', response.status);
        }

    } catch (error) {
        console.error('Ошибка загрузки из 1С:', error);
        return null;
        //throw error;
    }
};

export const fetchCustomer1C = async (RefKey_1C) => {
    try {
        const config = {
            method: 'get',
            url: `${LINKS.MAIN}Catalog_Партнеры?$format=json&$select=Description,Code,НаименованиеПолное,Ref_Key&$filter=ОсновнойМенеджер_Key%20eq%20guid%27${RefKey_1C}%27`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + API_KEY
            },
        };
        const response = await axios.request(config);
        if (response.status === 200) {
            //console.log("Запрос успешно выполнен", response.data.value);
            return response.data.value
        } else {
            console.error('Непредвиденный статус ответа:', response.status);
        }

    } catch (error) {
        console.error('Ошибка загрузки клиентов из 1С:', error);
        return null;
        //throw error;
    }
};
export const fetchCustomerContact1C = async (RefKey_1C) => {
    try {
        const config = {
            method: 'get',
            url: `${LINKS.MAIN}Catalog_КонтактныеЛицаПартнеров?$format=json&$filter=Owner_Key%20eq%20guid%27${RefKey_1C}%27&$select=Description,ДолжностьПоВизитке,КонтактнаяИнформация,Ref_Key`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + API_KEY
            },
        };
        const response = await axios.request(config);
        if (response.status === 200) {
            console.log("Запрос успешно выполнен", response.data.value);
            return response.data.value
        } else {
            console.error('Непредвиденный статус ответа:', response.status);
        }

    } catch (error) {
        console.error('Ошибка загрузки клиентов из 1С:', error);
        return null;
        //throw error;
    }
};

export const fetchCustomerInn1C = async (partnerRefKey) => {
    const normalizedPartnerRefKey = String(partnerRefKey || '').trim();
    if (!normalizedPartnerRefKey) {
        return '';
    }

    try {
        const filter = `${PARTNER_KEY_FIELD} eq guid'${normalizedPartnerRefKey}'`;
        const url = `${LINKS.MAIN}${COUNTERPARTY_CATALOG}?$format=json&$select=${encodeURIComponent(INN_FIELD)}&$filter=${encodeURIComponent(filter)}`;
        const config = {
            method: 'get',
            url,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + API_KEY
            },
        };

        const response = await axios.request(config);
        if (response.status === 200) {
            const innValue = response?.data?.value?.[0]?.[INN_FIELD];
            return String(innValue || '').trim();
        }

        console.error('Непредвиденный статус ответа:', response.status);
        return '';
    } catch (error) {
        console.error('Ошибка загрузки ИНН из 1С:', error);
        return '';
    }
};
export default GetUser1C;


