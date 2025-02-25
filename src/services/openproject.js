import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 секунд
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const LINKS ={
    CARD: 'https://projectcard.asterit.ru/?id=',
    PROJECT: 'https://openproject.asterit.ru/api/v3/projects/'
 }
 const API_KEY = 'YXBpa2V5Ojk3ODVkODhlOWZlZDc2MzAyMmIyM2Y2MDJlMTE5Yzc4YWI5N2MxZDU3NmYxNzM0N2M2ZmFlMjRmYzZmYmZmMmY='
 
function generateTableOnTrip(data) {
    let tableMarkdown = `| Адрес проведения работ | Количество дней | Какие работы проводятся по указанным адресам |\n| --- | --- | --- |\n`;
    if (Array.isArray(data)) {
        data.forEach((item) => {
            tableMarkdown += `| ${item.Address.replace(/\n/g, ' ')} | ${item.DayOnTrip} | ${item.JobDecription.replace(/\n/g, ' ')} |\n`;
        });
    }

    return tableMarkdown;
}

function generateTableJob(data) {
    let tableMarkdown = '';
    if (Array.isArray(data)) {
        tableMarkdown += `| № | Наименование работ | Ресурсная | Рамочная |\n| --- | --- | --- | --- |\n`;
        data.forEach((item, index) => {
            let jobName = item.jobName.replace(/\n/g, '<br>');
            // Заменяем маркеры списка на HTML-эквиваленты
            jobName = jobName.replace(/^- /gm, '• ');
            jobName = jobName.replace(/^ {2}- /gm, '  ◦ ');
            jobName = jobName.replace(/^ {4}- /gm, '    ▪ ');
            tableMarkdown += `| ${index + 1} | ${jobName} | ${item.resourceDay} | ${item.frameDay} |\n`;
        });
    }

    return tableMarkdown;
}

export const CreateProject = async (formData) => {
    try {
        const data = {
            "name": formData.title,
            "description": {
                "raw": formData.Description
            },
            "public": false,
            "statusExplanation": {
              "format": "markdown",
              "raw": `[Ссылка на проект № карты ${formData.id}](${LINKS.CARD}${formData.id})`,
              "html": `[Ссылка на проект № карты ${formData.id}](${LINKS.CARD}${formData.id})`
            },
            //"customField32": "цель проекта",
            "customField20": formData.Customer,
            "customField23": formData.CustomerCRMID,
            "customField24": formData.CustomerContact,
            "customField25": {
                "raw": formData.CustomerContactJobTitle + ' '+ formData.CustomerContactEmail + ' ' + formData.CustomerContactTel
            },
            "customField28": {
                "format": "markdown",
                "raw": generateTableJob(formData.JobDescription),
                "html": generateTableJob(formData.JobDescription)
            },
            "customField38": formData.resourceSumm,
            "customField39": formData.frameSumm,
            "customField31": `${formData.id}`,
            "customField33": {
                "format": "markdown",
                "raw": generateTableOnTrip(formData.JobOnTripTable),
                "html": generateTableOnTrip(formData.JobOnTripTable)
            },
            "customField34": {
                "raw": formData.Limitations,
            },

            "_meta": {
                "copyMembers": true,
                "copyVersions": true,
                "copyCategories": true,
                "copyWorkPackages": true,
                "copyWorkPackageAttachments": true,
                "copyWiki": true,
                "copyWikiPageAttachments": true,
                "copyForums": true,
                "copyQueries": true,
                "copyBoards": true,
                "copyOverview": true,
                "copyStorages": true,
                "copyStorageProjectFolders": true,
                "copyFileLinks": true,
                "sendNotifications": true
            },
            "_links": {
                "status": {
                    "href": "/api/v3/project_statuses/not_started"
                },
                "parent": {
                    "href": null
                },
                //"customField1": {
                //    "href": "/api/v3/users/22"
                //},
                // "members": formData.projectMembers.map(userId => ({
                //     "href": `/api/v3/users/${userId}`
                // }))
            }
        };

        const config = {
            method: 'post',
            url: `${LINKS.PROJECT}${formData.OpenProject_Template_id}/copy`,
            maxRedirects: 0, 
            //validateStatus: function (status) {
            //    return status >= 200 && status < 303;
            //},
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + API_KEY
            },
            data: JSON.stringify(data)
        };

        const response = await axios.request(config)
        console.log(response);
        let location = response.headers?.location;
        console.log(location);
        if (!location) {
            location = response.request?.responseURL
            //throw new Error('Не удалось получить Location из ответа');
        }

        let retries = 0;
        while (retries < MAX_RETRIES) {
            console.log(retries);
            const jobStatusResponse = await axios.get(location, 
                {
                    headers: {
                        'Authorization': 'Basic ' + API_KEY
                    }
                }
            );
            console.log(jobStatusResponse);
            if (jobStatusResponse.data.status === 'success') {
                console.log(jobStatusResponse.data);
                const projectLink = jobStatusResponse.data?.payload?._links?.project?.href;
                const projectRedirect = jobStatusResponse.data?.payload?.redirect
                if (!projectLink) {
                    console.log('Не удалось получить ссылку на проект из ответа');
                    throw new Error('Не удалось получить ссылку на проект из ответа');
                }
                console.log('Ссылка на скопированный проект:', projectLink, projectRedirect);
                return {
                        projectLink: projectLink,
                        projectRedirect: projectRedirect
                    };
            } else if (jobStatusResponse.data.status === 'in_queue' || jobStatusResponse.data.status === 'in_process') {
                console.log(`Копирование проекта еще не завершено. Попытка ${retries + 1} из ${MAX_RETRIES}`);
                await sleep(RETRY_DELAY);
                retries++;
            } else {
                console.log(jobStatusResponse);
                throw new Error('Ошибка при копировании проекта: ' + jobStatusResponse.data.status);
            }
        }

        throw new Error(`Превышено максимальное количество попыток (${MAX_RETRIES}). Копирование проекта не завершено.`);
    } catch (error) {
        console.error('Ошибка при копировании проекта:', error);
        throw error;
    }
};

export const GetProjectTemtplate = async () => {
    const config = {
        method: 'get',
        url: `${LINKS.PROJECT}?filters=[{"templated":{"operator":"=","values":["t"]}}]`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + API_KEY
        },
        data: JSON.stringify({})
    };
    
    const data = await axios.request(config)
        .then((response) => {
            let templateOption = []
            if (Array.isArray(response.data._embedded.elements)) {
                response.data._embedded.elements.map((item) => templateOption.push({ name: item.name, value: item.id }))
            }
            return templateOption
        })
        .catch((error) => {
            console.log(error);
            return []
        });
    
    return data
};

export const GetProjects = async () => {
    try {
        
        let allProjects = [];
        let offset = 1;
        const pageSize = 100;
        
        // Добавляем фильтр для исключения шаблонов
        const templatedFilter = encodeURIComponent('[{"templated":{"operator":"=","values":["f"]}}]');
        
        while (true) {
            const projectsConfig = {
                method: 'get',
                url: `${LINKS.PROJECT}?pageSize=${pageSize}&offset=${offset}&filters=${templatedFilter}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + API_KEY
                }
            };
            
            const projectsResponse = await axios.request(projectsConfig);
            const projects = projectsResponse.data._embedded.elements;
            allProjects = [...allProjects, ...projects];
            
            if (projects.length < pageSize) {
                break;
            }
            offset += pageSize;
        }

        // Получаем информацию о работах для каждого проекта
        const projectsWithWP = await Promise.all(allProjects.map(async (project) => {
            try {
                const wpConfig = {
                    method: 'get',
                    url: `${LINKS.PROJECT}${project.id}/work_packages?filters=[{"status_id":{"operator":"*"}}]&pageSize=1&sumElementsPerGroup=true`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + API_KEY
                    }
                };
                
                const wpResponse = await axios.request(wpConfig);
                const wpSummary = wpResponse.data._embedded.elements[0] || {};
                
                return {
                    ...project,
                    workPackages: {
                        startDate: wpSummary.startDate,
                        dueDate: wpSummary.dueDate,
                        duration: wpSummary.duration,
                        estimatedTime: wpSummary.estimatedTime,
                        spentTime: wpSummary.spentTime,
                        remainingTime: wpSummary.remainingTime,
                        percentageDone: wpSummary.percentageDone,
                        status: wpSummary._links?.status?.title
                    }
                };
            } catch (error) {
                console.error(`Ошибка при получении work packages для проекта ${project.id}:`, error);
                return project;
            }
        }));

        return projectsWithWP;
    } catch (error) {
        console.error('Ошибка при получении списка проектов:', error);
        throw error;
    }
};

export default CreateProject;