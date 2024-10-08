import axios from 'axios';
import Fuse from 'fuse.js';

const LINKS ={
    MAIN: process.env.ONEC_APP_API_URL,
    USER: 'Catalog_Пользователи'
 }
const API_KEY = '0J/Rg9C30LjQvSDQnC7Qki46QmxvdW1pbmUhMQ=='
const THRESHOLD = 0.3 // Чем ниже, тем более строгий поиск


export const GetUser1C = async (first_name) => {
    try {
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
            // Здесь выполняется действие, если статус 200
            console.log("Запрос успешно выполнен", response.data.value);
            const fuse = new Fuse(response.data.value, {
                keys: ['Description'],
                includeScore: true,
                threshold: THRESHOLD,  
            });
            const result = fuse.search(first_name.toLowerCase());
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



export default GetUser1C;