import axios from 'axios';


 const LINKS ={
    CARD: 'https://projectcard.asterit.ru/?id=',
    PROJECT: 'https://openproject.asterit.ru/api/v3/projects/'
 }
 const API_KEY = 'YXBpa2V5Ojk3ODVkODhlOWZlZDc2MzAyMmIyM2Y2MDJlMTE5Yzc4YWI5N2MxZDU3NmYxNzM0N2M2ZmFlMjRmYzZmYmZmMmY='
 
function generateTableOnTrip(data) {
    let tableMarkdown = `| Адрес проведения работ    | Количество дней | Какие работы проводятся по указанным адресам |
    | -------- | ------- | ------- |`;
    data.forEach((item, index) => {
        tableMarkdown += `|${item.Address}|${item.DayOnTrip}|${item.JobDecription}|`;
    });

    return tableMarkdown;
}
function generateTableJob(data) {
    let tableHtml = `|№|Наименование работ|Ресурсная|Рамочная|
        | ---- | -------- | ------- | ------- |`;

    data.forEach((item, index) => {
        tableHtml += `|${index}|${item.jobName}|${item.resourceDay}|${item.frameDay}|`;
    });

    return tableHtml;
}

export const CreateProject = (formData) => {
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
        "customField29": formData.resourceSumm,
        "customField30": formData.frameSumm,
        "customField31": `${LINKS.CARD}${formData.id}`,
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
            "customField1": {
                "href": "/api/v3/users/22"
            },
            // "members": formData.projectMembers.map(userId => ({
            //     "href": `/api/v3/users/${userId}`
            // }))
        }
    };

    const config = {
        method: 'post',
        url: `${LINKS.PROJECT}${formData.OpenProject_Template_id}/copy`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + API_KEY
        },
        data: JSON.stringify(data)
    };

    return axios.request(config)
        .then((response) => {
            return response.data
        })
        .catch((error) => {
            console.log(error);
            return null
        });

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


export default CreateProject;